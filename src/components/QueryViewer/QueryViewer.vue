<script setup>
//@ts-check

import { reactive, computed, ref, watch, toRef } from "vue";
import ipc from "../../ipc";
import { escape_backtick, escape_like, escape_sql_value } from "../../utils";
// import { invoke } from "@tauri-apps/api/tauri";
import QueryFormScrollerSimple from "../QueryFormScrollerSimple.vue";
import QueryOrderingBtn from "./QueryOrderingBtn.vue";

import useMainMsgManager from "../Msg/MsgManager";
const msgManager = useMainMsgManager();
function handle_err(err){
	console.error(err);
	msgManager.postError(err);
}

const query_props_names = [
    "query_select_fields",
    "query_from",
    "query_where",
];
const props = defineProps({
    query_select_fields: {
        /**@type {import('vue').PropType<string | [string, string | undefined][]>} */
        type: Array,
        required: true
    },
    query_from: {
        type: String,
        required: true
    },
    query_where: {
        type: String,
        default: ""
    },
    limit: {
        type: Number,
        default: 20
    },
    step:  {
        type: Number,
        default: 20
    },
    selectable: {
        type: Boolean,
        default: false
    },
});

console.log("QUERY VIEWER", props);

const emit = defineEmits(['select']);


const offset = ref(0n);
const orderings = reactive(/**@type {number[]}*/ ([]));
const searches  = reactive(/**@type {string[]}*/ ([]));

const orderings_list = reactive(new Map());
function set_orderings_list(column_index, ordering_value) {
    // console.log('set', arguments);
    if(ordering_value === undefined) {
        orderings_list.delete(column_index);
        return;
    }
    if(orderings_list.has(column_index)) {
        orderings_list.delete(column_index);
    }
    if(ordering_value != 0){
        orderings_list.set(column_index, ordering_value);
    }
}

const query_result   = ref( /**@type {import('../../ipc').IPCQueryResult?} */ (null));
const query_columns_display      = ref(/**@type {string[]} */ ([]));
const query_columns_true         = ref(/**@type {string[]} */ ([]));
const query_columns_true_escaped = ref(/**@type {string[]} */ ([]));
const query_columns_hide         = ref(/**@type {boolean[]} */ ([]));

watch([query_result, toRef(props, "query_select_fields")], ([new_result, new_fileds]) => {
    if(typeof new_fileds === "string") {
        if(new_result === null) {
            query_columns_display.value      = [];
            query_columns_true.value         = [];
            query_columns_true_escaped.value = [];
            query_columns_hide.value         = [];
        } else {
            console.log("new_result", new_result);
            query_columns_display.value      = new_result[1];
            query_columns_true.value         = new_result[1];
            query_columns_true_escaped.value = new_result[1].map(escape_backtick);
            query_columns_hide.value         = [];
        }
    } else {
        query_columns_display.value      = new_fileds.map( x => x[1] ?? '' );
        query_columns_true.value         = new_fileds.map( x => x[0] );
        query_columns_true_escaped.value = new_fileds.map( x => x[0] );
        query_columns_hide.value         = new_fileds.map( x => x[1] === undefined );
    }
});

//@ts-ignore
watch( query_props_names.map(x => toRef(props, x)), () => {
    orderings_list.clear();
    orderings.splice(0, orderings.length);
    searches.splice(0, searches.length);
});
const query_rows = computed(() => {
    if(query_result.value === null) {
        return [];
    }
    return query_result.value[0];
});

const searches_sql = ref('');
watch( [searches, query_columns_true_escaped], ([new_searches, new_query_columns_true]) => {
    let res = [];
    console.log('new_searches', new_searches);
    for(let index in new_searches) {
        console.log('index', index);
        const value = new_searches[index];
        console.log('value', value);
        if(value == "") continue;
        res.push(`${ new_query_columns_true[index] } LIKE "%${escape_like(value)}%" ESCAPE '\\'`);
    }
    searches_sql.value = res.join(' AND ');
});

const orderings_sql = ref('');
watch( [orderings_list, query_columns_true_escaped], ([new_orderings_list, new_query_columns_true]) => {
    const res = Array.from(new_orderings_list.entries())
                // .reverse()
                .map(([col_i, ordering]) => 
                    new_query_columns_true[col_i] +
                    (ordering > 0 ? " ASC" : " DESC"))
                .join(', ');
    // console.log('debug_list', res);
    orderings_sql.value = res;
});

const where_sql_true = computed(() => {
    return [props.query_where, searches_sql.value].filter(x => x != "").map(x => `(${x})`).join(' AND ');
})

const query_sql_for_scroller = computed(() => {
    const apply_if_defined = (prefix, value) => value == "" ? "" : `${prefix} ${value}`;
    const where_sql   = apply_if_defined(' WHERE',    where_sql_true.value);
    return props.query_from + where_sql;
});
const query_sql_select = computed(() => {
    const fields = props.query_select_fields;
    if(typeof fields === "string") {
        return fields;
    }
    const res = fields.map( ([true_name, display_name]) => 
        display_name !== undefined ?  
            true_name + ' as ' + escape_sql_value(display_name) :
            true_name
    );
    return res.join(', ');
});
const query_sql_full = computed(() => {
    const apply_if_defined = (prefix, value) => value == "" ? "" : `${prefix} ${value}`;

    const select_sql  = apply_if_defined('SELECT',    query_sql_select.value);
    const from_sql    = apply_if_defined(' FROM',     props.query_from);
    const where_sql   = apply_if_defined(' WHERE',    where_sql_true.value);
    const orderby_sql = apply_if_defined(' ORDER BY', orderings_sql.value);
    const limit_sql   = apply_if_defined(' LIMIT',    props.limit);
    const offset_sql  = apply_if_defined(' OFFSET',   offset.value - 1n);
    // console.log('orderby', orderby_sql, orderings_sql.value);
    return select_sql + from_sql + where_sql + orderby_sql + limit_sql + offset_sql;
});
async function refresh() {
    const result = await ipc.db_query(query_sql_full.value);
    query_result.value = result;
    return result;
}

function handle_select(row_i) {
    console.log("SELECTING...", row_i, props.selectable);
    if(!props.selectable) return;
    const cols = query_columns_true.value;
    const row  = query_rows.value[row_i];
    emit("select", cols, row);
}

async function refresh_routine() {return refresh().catch(handle_err);}

watch(query_sql_full, refresh_routine);

</script>

<template>

    <QueryFormScrollerSimple v-model:index="offset" :query="query_sql_for_scroller" :step="props.step" :limit="props.limit"/>
    <div class="container">
        <table class="result" :class="{selectable: props.selectable}">
            <tr>
                <th></th>
                <th v-for="(col_name, col_i) in query_columns_display" class="search_input_cell" :class="{hidden: query_columns_hide[col_i]}">
                    <input type="text" class="search_input" v-model="searches[col_i]" required>
                </th>
            </tr>
            <tr>
                <th>#</th>
                <th v-for="(col_name, col_i) in query_columns_display" :class="{hidden: query_columns_hide[col_i]}">
                    <span class="col_name">
                        {{ col_name }}
                    </span>
                    <QueryOrderingBtn class="ordering_btns" v-model:value="orderings[col_i]" @update:value="event => set_orderings_list(col_i, event)"/>
                </th>
            </tr>
            <tr v-for="(row, row_i) in query_rows" class="data_tr" @click="handle_select(row_i)">
                <td class="cell_index" >{{ offset + BigInt(row_i) }}:</td>
                <td v-for="(cell, cell_i) in row" :class="{
                        cell_number: typeof(cell) == 'number',
                        cell_text: typeof(cell) == 'string',
                        hidden: query_columns_hide[cell_i]
                }">
                    {{cell === null ? '~' : cell}}
                </td>
            </tr>
        </table>
    </div>

</template>

<style scoped>

    .container {
        /* width: 100%; */
        overflow-x: scroll;
    }
    .ordering_btns {
        margin-left: 1ch;
    }
    .search_input {
        width: calc(100% - 10px);
    }
    .search_input:valid {
        background-color: #fffaaa;
    }

    td, th{
        /* padding: 2px 5px; */
        padding: 2px 5px;
        text-wrap: nowrap;
        border: 1px solid black;
    }

    td.hidden, th.hidden {
        display: none;
    }

    .selectable .data_tr {
        cursor: pointer;
    }

    .data_tr:hover {
        background-color: #d7fffc;
    }

    .cell_index {
        color: green;
    }
    .cell_number {
        color: darkblue;
    }
    .cell_text {
        font-style: italic;
    }

</style>