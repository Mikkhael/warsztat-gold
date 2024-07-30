<script setup>
//@ts-check

import { reactive, computed, ref, watch, toRef } from "vue";
import ipc from "../../ipc";
import { escape_backtick, escape_like } from "../../utils";
// import { invoke } from "@tauri-apps/api/tauri";
import QueryFormScrollerSimple from "../QueryFormScrollerSimple.vue";
import QueryOrderingBtn from "./QueryOrderingBtn.vue";


const query_props_names = [
    "query_select",
    "query_from",
    "query_where",
];
const props = defineProps({
    query_select: {
        type: String,
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
        required: true
    },
    step:  {
        type: Number,
        default: 1
    }
});



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
const query_columns = computed(() => {
    if(query_result.value === null) {
        return [];
    }
    return query_result.value[1];
});
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
watch( [searches, query_columns], ([new_searches, new_query_columns]) => {
    let res = [];
    console.log('new_searches', new_searches);
    for(let index in new_searches) {
        console.log('index', index);
        const value = new_searches[index];
        console.log('value', value);
        if(value == "") continue;
        res.push(`${ escape_backtick(new_query_columns[index]) } LIKE "%${escape_like(value)}%" ESCAPE '\\'`);
    }
    searches_sql.value = res.join(' AND ');
});

const orderings_sql = ref('');
watch( [orderings_list, query_columns], ([new_orderings_list, new_query_columns]) => {
    const res = Array.from(new_orderings_list.entries())
                // .reverse()
                .map(([col_i, ordering]) => 
                    escape_backtick(new_query_columns[col_i]) +
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
const query_sql_full = computed(() => {
    const apply_if_defined = (prefix, value) => value == "" ? "" : `${prefix} ${value}`;

    const select_sql  = apply_if_defined('SELECT',    props.query_select);
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

function handle_err(err){
    console.error(err);
}

async function refresh_routine() {return refresh().catch(handle_err);}

watch(query_sql_full, refresh_routine);

</script>

<template>

    <QueryFormScrollerSimple v-model:index="offset" :query="query_sql_for_scroller" :step="props.step" :limit="props.limit"/>
    <div class="container">
        <table class="result">
            <tr>
                <th></th>
                <th v-for="(col_name, col_i) in query_columns" class="search_input_cell">
                    <input type="text" class="search_input" v-model="searches[col_i]" required>
                </th>
            </tr>
            <tr>
                <th>#</th>
                <th v-for="(col_name, col_i) in query_columns">
                    <span class="col_name">
                        {{ col_name }}
                    </span>
                    <QueryOrderingBtn class="ordering_btns" v-model:value="orderings[col_i]" @update:value="event => set_orderings_list(col_i, event)"/>
                </th>
            </tr>
            <tr v-for="(row, row_i) in query_rows">
                <td class="cell_index" >{{ offset + BigInt(row_i) }}:</td>
                <td v-for="cell in row" :class="{cell_number: typeof(cell) == 'number', cell_text: typeof(cell) == 'string'}">
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