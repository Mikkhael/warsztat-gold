<script setup>
//@ts-check

import { reactive, computed, ref, watch, toRef, onMounted, onUnmounted } from "vue";
import ipc from "../../ipc";
import { escape_backtick, escape_like, escape_sql_value } from "../../utils";
// import { invoke } from "@tauri-apps/api/tauri";
// import QueryFormScrollerSimple from "../QueryFormScrollerSimple.vue";
import QueryFormScroller from "../QueryFormScroller.vue";
import QueryOrderingBtn from "./QueryOrderingBtn.vue";

import useMainMsgManager from "../Msg/MsgManager";
const msgManager = useMainMsgManager();
function handle_err(err){
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
    selectable: {
        type: Boolean,
        default: false
    },
});

console.log("QUERY VIEWER", props);

const scroller_ref   = ref();
const row_ref        = /**@type {import('vue').Ref<HTMLElement>} */ (ref());
const container_ref  = /**@type {import('vue').Ref<HTMLElement>} */ (ref());
const scroller_limit = ref(1);

function recalculate_limit() {
    const container_height = container_ref.value?.clientHeight;
    const scroller_height  = row_ref      .value?.clientHeight;
    console.log('ROWS HEIGHT', container_height, scroller_height);
    if(!container_height || !scroller_height) {
        scroller_limit.value = 1;
        return;
    }
    const rows_to_fit = Math.floor(container_height / scroller_height);
    scroller_limit.value = Math.max(rows_to_fit - 3, 1);
};

const resizeObserver = new ResizeObserver(() => {
    recalculate_limit();
}); 
onMounted(() => {
    console.log('CONTAINER REF', container_ref.value);
    resizeObserver.observe(container_ref.value);
});
onUnmounted(() => {
    resizeObserver.disconnect();
});


const emit = defineEmits(['select']);


const offset = ref(0);
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

if(typeof props.query_select_fields === 'string') {
    watch(query_result, (new_result) => {
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
    });
} else {
    watch(toRef(props, "query_select_fields"), (new_fileds) => {
        query_columns_display.value      = new_fileds.map( x => x[1] ?? '' );
        query_columns_true.value         = new_fileds.map( x => x[0] );
        query_columns_true_escaped.value = new_fileds.map( x => x[0] );
        query_columns_hide.value         = new_fileds.map( x => x[1] === undefined );
    }, {immediate: true});
}

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
watch( [searches, query_columns_true_escaped], ([new_searches, new_query_columns_true_escaped]) => {
    let res = [];
    // console.log('new_searches', new_searches);

    for(let index in new_searches) {
        // console.log('index', index);
        const value = new_searches[index];
        // console.log('value', value);
        if(value == "") continue;
        res.push(`${ new_query_columns_true_escaped[index] } LIKE "%${escape_like(value)}%" ESCAPE '\\'`);
    }
    searches_sql.value = res.join(' AND ');
});

const orderings_sql = ref('');
watch( [orderings_list, query_columns_true_escaped], ([new_orderings_list, new_query_columns_true_escaped]) => {
    const res = Array.from(new_orderings_list.entries())
                // .reverse()
                .map(([col_i, ordering]) => 
                    new_query_columns_true_escaped[col_i] +
                    (ordering > 0 ? " ASC" : " DESC"))
                .join(', ');
    // console.log('debug_list', res);
    orderings_sql.value = res;
    scroller_ref.value.goto(0, true, true);
    // console.log(new_orderings_list, new_query_columns_true_escaped);
});

// TODO reset offset?
// watch( [searches, orderings_list], ([searches1, orderings_list1]) => {
//     console.log('aha', searches1, orderings_list1)
//     scroller_ref.value.goto(1);
// });

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
    const limit_sql   = apply_if_defined(' LIMIT',    scroller_limit.value);
    const offset_sql  = apply_if_defined(' OFFSET',   offset.value - 1);
    // console.log('orderby', orderby_sql, orderings_sql.value);
    return select_sql + from_sql + where_sql + orderby_sql + limit_sql + offset_sql;
});
async function refresh() {
    const result = await ipc.db_query(query_sql_full.value);
    query_result.value = result;
    return result;
}

function handle_select(row_i) {
    console.log("SELECTING...",  offset.value, row_i, props.selectable);
    if(!props.selectable) return;
    const cols = query_columns_true.value;
    const row  = query_rows.value[row_i];
    emit("select", cols, row, offset.value + row_i);
}

/**
 * @param {WheelEvent} event
 */
function handle_scroll(event) {
    if(event.shiftKey) return;
    const scroll_dist = (event.deltaY / 100) * (event.ctrlKey ? scroller_limit.value : 1);
    scroller_ref.value.scroll_by(scroll_dist);

}

async function refresh_routine() {return refresh().catch(handle_err);}

watch(query_sql_full, refresh_routine);

</script>

<template>

    <div class="form_container" ref="container_ref">
        <QueryFormScroller simple
        ref="scroller_ref"
        :limit="scroller_limit"
        :query_from="query_sql_for_scroller" 
        reset_on_query_change
        nosave 
        norefresh
        @changed_index="x => offset = x"/>

        <div class="form_content">

            <table class="result" :class="{selectable: props.selectable}" @wheel.passive="handle_scroll">
                <tr ref="row_ref">
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
                    <td class="cell_index" >{{ offset + row_i }}:</td>
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
    </div>

</template>

<style scoped>

    .form_container {
        justify-content: start;
    }
    .form_content {
        overflow-y: hidden;
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
        height: 2.5ch;
        text-wrap: nowrap;
        border: 1px solid black;
    }
    table{
        border-collapse: collapse;
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