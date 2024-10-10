<script setup>
//@ts-check

import { reactive, computed, ref, watch, toRef, onMounted, onUnmounted, toRefs, nextTick } from "vue";
import ipc from "../../ipc";
import { escape_backtick, escape_like, escape_sql_value } from "../../utils";
// import { invoke } from "@tauri-apps/api/tauri";
// import QueryFormScrollerSimple from "../QueryFormScrollerSimple.vue";
// import QueryFormScroller from "../QueryFormScroller.vue";
import QueryOrderingBtn from "./QueryOrderingBtn.vue";

import useMainMsgManager from "../Msg/MsgManager";
const msgManager = useMainMsgManager();
function handle_err(err){
	msgManager.postError(err);
}
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

const props_ref = toRefs(props);

const scroller_ref   = ref();
const row_ref        = /**@type {import('vue').Ref<HTMLElement>} */ (ref());
const container_ref  = /**@type {import('vue').Ref<HTMLElement>} */ (ref());
const scroller_limit = ref(1);


/////////////////// MAIN LOGIC ///////////////////////////////

const emit = defineEmits(['select']);

const offset         = ref(0);
const searches       = ref(/**@type {string[]}*/ ([]));
const orderings      = ref(/**@type {number[]}*/ ([]));
const orderings_list = reactive(new Map());
function set_orderings_list(column_index, ordering_value) {
    if(orderings_list.has(column_index) || ordering_value === 0) {
        orderings_list.delete(column_index);
    }
    if(ordering_value !== 0) {
        orderings_list.set(column_index, ordering_value);
    }
}


/////////////////// SQL ///////////////////////////////

const query_result   = ref( /**@type {import('../../ipc').IPCQueryResult?} */ (null));
const query_columns_display      = ref(/**@type {string[]} */ ([]));
const query_columns_true         = ref(/**@type {string[]} */ ([]));
const query_columns_true_escaped = ref(/**@type {string[]} */ ([]));
const query_columns_hide         = ref(/**@type {boolean[]} */ ([]));

const query_rows = computed(() => query_result.value === null ? [] : query_result.value[0]);

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

/////////////////// WHERE and ORDER ///////////////////////////////

const searches_sql = computed(() => {
    return searches.value
        .map   ( (x, i)  => [x,i])
        .filter(([x, i]) => x != "")
        .map   (([x, i]) => `(${ query_columns_true_escaped.value[i] } LIKE "%${escape_like(x)}%" ESCAPE '\\')`)
        .join  (' AND ');
});

const orderings_sql = computed(() => {
    return Array.from(orderings_list.entries())
        // .reverse()
        .map(([col_i, ordering]) => query_columns_true_escaped.value[col_i] + (ordering > 0 ? " ASC" : " DESC"))
        .join(', ');
});

const where_sql_true = computed(() => {
    return [props.query_where, searches_sql.value].filter(x => x != "").map(x => `(${x})`).join(' AND ');
})

/////////////////// SELECT ///////////////////////////////

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

/////////////////// FULL SQL ///////////////////////////////

const query_sql_full = computed(() => {
    const apply_if_defined = (prefix, value) => value == "" ? "" : `${prefix} ${value}`;
    const result = [
        apply_if_defined('SELECT',   query_sql_select.value),
        apply_if_defined('FROM',     props.query_from),
        apply_if_defined('WHERE',    where_sql_true.value),
        apply_if_defined('ORDER BY', orderings_sql.value),
        apply_if_defined('LIMIT',    scroller_limit.value),
        apply_if_defined('OFFSET',   offset.value - 1),
    ].join(' ');
    // console.log('RESULT', result);
    return result;
});

/////////////////// REFRESHING ///////////////////////////////

let was_init_columns_sizes = false;
let disable_table_search = ref(true);
async function refresh() {
    const result = await ipc.db_query(query_sql_full.value);
    query_result.value = result;
    if(!was_init_columns_sizes) {
        was_init_columns_sizes = true;
        nextTick().then(() => {
            disable_table_search.value = false;
            init_columns_sizes();
        });
    }
    return result;
}
async function reset() {
    searches.value  = [];
    orderings.value = [];
    orderings_list.clear();
}

watch(query_sql_full, () => { refresh().catch(handle_err); });
watch(orderings_sql,  () => { scroller_ref.value.goto(0, true, true); });
watch( [
    props_ref.query_select_fields,
    props_ref.query_from,
    props_ref.query_where,
], reset);


/////////////////// RESIZING AND STYLING ///////////////////////////////

function recalculate_limit() {
    const container_height = container_ref.value?.clientHeight;
    const scroller_height  = row_ref      .value?.getBoundingClientRect().height;
    if(!container_height || !scroller_height) {
        scroller_limit.value = 1;
        return;
    }
    const rows_to_fit = Math.floor(container_height / scroller_height);
    const result = Math.max(rows_to_fit - 2, 1);
    console.log("RESIZE", result);
    scroller_limit.value = result;
};

const resizeObserver = new ResizeObserver(recalculate_limit); 

let   current_resize_col_i = -1;
const col_refs     = ref(/**@type {HTMLElement[]} */ ([]));
const column_sizes = ref(/**@type {number[]} */ ([]));

function handle_mouse_move(/**@type {MouseEvent} */ event) {
    const delta = event.movementX;
    if(current_resize_col_i !== -1) {
        console.log('MOVE', delta, column_sizes.value[current_resize_col_i]);
        window.getSelection()?.removeAllRanges();
        column_sizes.value[current_resize_col_i] += delta;
    }
}
function handle_mouse_up() {
    console.log('UP');
    current_resize_col_i = -1;
}
function handle_mouse_down_on_resizer(/**@type {MouseEvent} */ event, col_i){
    console.log('DOWN', col_i, event.target.parentNode.getBoundingClientRect().width);
    column_sizes.value[col_i] = event.target.parentNode.getBoundingClientRect().width;
    current_resize_col_i = col_i;
}
function init_columns_sizes() {
    for(let col_i in col_refs.value) {
        column_sizes.value[col_i] = col_refs.value[col_i].getBoundingClientRect().width;
    }
}

const current_hovered_row_i = ref(-1);
function handle_row_hover(row_i) {
    current_hovered_row_i.value = row_i;
}
function handle_row_unhover(row_i) {
    if(current_hovered_row_i.value === row_i){
        current_hovered_row_i.value = -1;
    }
}

/////////////////// EVENT HANDLERS ///////////////////////////////

/**
 * @param {number} row_i
 */
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

onMounted(() => {
    resizeObserver.observe(container_ref.value);
    window.addEventListener('mouseup', handle_mouse_up);
    window.addEventListener('mousemove', handle_mouse_move);
});
onUnmounted(() => {
    resizeObserver.disconnect();
    window.removeEventListener('mouseup', handle_mouse_up);
    window.removeEventListener('mousemove', handle_mouse_move);
});

</script>

<template>

    <div class="form_container">
        <QueryFormScroller simple
        ref="scroller_ref"
        @error="handle_err"
        :limit="scroller_limit"
        :query_from="props.query_from" 
        :query_where="where_sql_true" 
        reset_on_query_change
        nosave 
        norefresh
        @changed_index="x => offset = x"/>

        <div class="form_content" ref="container_ref" @wheel.passive="handle_scroll">
            <div class="table_container" :class="{disable_table_search}">

                <div class="table_column iterators">
                    <div class="header" ref="row_ref"> </div>
                    <div class="header">#</div>
                    <div class="data" v-for="(row, row_i) in query_rows" @click="handle_select(row_i)"
                            :class="{hovered: current_hovered_row_i === row_i}">
                        {{ offset + row_i }}:
                    </div>
                </div>

                <div class="table_column results" v-for="(col_name, col_i) in query_columns_display" ref="col_refs"
                    :class="{
                        hidden: query_columns_hide[col_i],
                        type_number: typeof(query_rows[0]?.[col_i]) == 'number',
                        type_text:   typeof(query_rows[0]?.[col_i]) == 'string',
                    }"
                    :style="{width: column_sizes[col_i] === undefined ? undefined : column_sizes[col_i] + 'px' }"
                >
                    <div class="header col_search_cell">
                        <input type="text" class="col_search" v-model="searches[col_i]" required>
                        <div class="resizer" @mousedown="e => handle_mouse_down_on_resizer(e, col_i)"></div>
                    </div>
                    <div class="header col_name_cell">
                        <QueryOrderingBtn class="ordering_btns" v-model:value="orderings[col_i]" @update:value="event => set_orderings_list(col_i, event)"/>
                        <div class="col_name">{{ col_name }}</div>
                    </div>
                    <div class="data data_cell" v-for="(row, row_i) in query_rows" 
                            :class="{hovered: current_hovered_row_i === row_i}"
                            @click="handle_select(row_i)"
                            @mouseenter="handle_row_hover  (row_i)"
                            @mouseleave="handle_row_unhover(row_i)">
                        {{row[col_i] ?? '~'}}
                    </div>
                </div>
            </div>
        </div>
    </div>

</template>

<style scoped>

    .form_container {
        justify-content: start;
        align-items: stretch;
    }
    .form_content {
        overflow-y: hidden;
    }

    .table_container {
        display: flex;
        flex-direction: row;
    }

    .table_column {
        /* width: 15ch; */
        min-width: 6ch;
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
    }
    .table_column.iterators {
        width: unset;
    }

    .header,
    .data {
        /* box-sizing: border-box; */
        /* width:  100%; */
        height: 2.5ch;
        padding: 2px 5px;
        text-wrap: nowrap;
        border: 1px solid black;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .header {
        font-weight: bold;
    }
    .data {
        cursor: pointer;
    }
    .data.hovered {
        background-color: #d7fffc;
    }

    .col_search_cell{
        position: relative;
    }
    .col_search_cell .col_search {
        width: calc(100% - 10px);
    }
    .disable_table_search .col_search {
        display: none;
    }
    .col_search_cell .col_search:valid {
        background-color: #fffaaa;
    }
    .col_search_cell .resizer{
        position: absolute;
        top:    0px;
        bottom: 0px;
        right:  0px;
        width:  4px;
        cursor: col-resize;
        background-color: black;
    }

    .col_name_cell {
        display: flex;
        flex-direction: row;
        justify-content: start;
    }
    .col_name_cell :deep(.ordering_btns) {
        flex-shrink: 0;
    }

    .hidden {
        display: none;
    }

    /* .selectable .data_tr {
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
    } */

</style>