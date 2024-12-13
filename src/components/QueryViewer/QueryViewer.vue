<script setup>
//@ts-check

import { reactive, computed, ref, watch, toRef, onMounted, onUnmounted, toRefs, nextTick } from "vue";
import ipc from "../../ipc";
import { escape_backtick, escape_backtick_smart, escape_like, escape_sql_value } from "../../utils";
import QueryOrderingBtn from "./QueryOrderingBtn.vue";

import useMainMsgManager from "../Msg/MsgManager";
import { QuerySource } from "../Dataset";
import QuerySourceOffsetScroller from "../Scroller/QuerySourceOffsetScroller.vue";
const msgManager = useMainMsgManager();
function handle_err(err){
	msgManager.postError(err);
}

/**
 * @typedef {import('../Dataset/QueryBuilder').QuerySelectField} QuerySelectField
 * @typedef {import('../Dataset/QueryBuilder').QueryParts} QueryParts
 * @typedef {import('../Dataset/QueryBuilder').QueryOrdering} QueryOrdering
 */

 /**
  * @typedef { [QuerySelectField] | [QuerySelectField, string] } QuerySelectFieldWithDisplay
  */

 /**
  * @typedef {{
  *     select:         QuerySelectFieldWithDisplay[],
  *     from:           string,
  *     where_conj:     QueryParts[],
  *     where_conj_opt: QueryParts[],
  * }} QueryViwerQueryParams
  */


const props = defineProps({
    query: {
        /**@type {import('vue').PropType<QueryViwerQueryParams>} */
        type: Object,
        required: true
    },
    selectable: {
        type: Boolean,
        default: false
    }
});

console.log("QUERY VIEWER", props);

const src = new QuerySource(false);

const row_ref        = /**@type {import('vue').Ref<HTMLElement>} */ (ref());
const container_ref  = /**@type {import('vue').Ref<HTMLElement>} */ (ref());
const scroller_limit = ref(0);
src.query.limit.reas(scroller_limit);

const emit = defineEmits(['select']);

/////////////////// AUTO REFRESHING ///////////////////////////////

let flagged_for_refresh = false;
/**@type {number?} */
let to_scroll_acc = null; 
let awaiting_refresh = false;
/**
 * @param {number?} to_scroll
 */
function flag_for_refresh(to_scroll = null) {
    // console.log('QVIEWER FLAG', to_scroll, to_scroll_acc);
    if(to_scroll === null) {
        to_scroll_acc = null;
    } else {
        to_scroll_acc = (to_scroll_acc ?? 0) + to_scroll;
    }
    if(flagged_for_refresh) return;
    flagged_for_refresh = true;
    if(awaiting_refresh) return;
    // console.log('QVIEWER INIT', to_scroll_acc);
    start_safe_update();
}
function start_safe_update() {
    flagged_for_refresh = false;
    awaiting_refresh = true;
    if(to_scroll_acc === null) {
        src.request_offset_goto(0, false);
        src.expire(true);
    } else {
        src.request_offset_scroll(to_scroll_acc);
    }
    to_scroll_acc = null;
    src.update_complete().then(() => {
        // console.log('QVIEWER END', temp_to_scroll_acc, new_offset);
        if(flagged_for_refresh) {
            start_safe_update();
        } else {
            // console.log("QVIEWER COMPLETED", temp_to_scroll_acc, new_offset);
            awaiting_refresh = false;
        }
    }).catch(handle_err);
    // }, 0);
}

const result_rows = computed(() => src.full_result.value?.[0] ?? []);
const unwatch_first_fetch = watch(result_rows, () => {
    console.log('QVIERWER FIRST FETCH');
    nextTick(() => {
        init_columns_sizes();
    })
    unwatch_first_fetch();
});

/////////////////// SELECT FIELDS ///////////////////////////////

const columns_display = props.query.select.map(x => x[1] ?? '');
const columns_names   = props.query.select.map(x => x[0][0]);
const columns_escaped = props.query.select.map(x => escape_backtick_smart(x[0][0]));
const columns_hide    = props.query.select.map(x => x.length === 1);
const custom_select   = props.query.select.map(x => x[0]);
src.query.select_fields.value  = custom_select;
src.query.from.value           = props.query.from;


/////////////////// ORDERING ///////////////////////////////

const orderings_btns = reactive(/**@type {number[]}*/ ({}));
const orderings_list = reactive( /**@type {Map<number, number>} */ (new Map()));
const custom_order   = computed( () => {
    return Array.from(orderings_list.entries())
        .map(/**@returns {QueryOrdering} */ ([col_i, value]) => [columns_names[col_i], value > 0]);
});
/**
 * @param {number} column_index 
 * @param {number} ordering_value 
 */
function set_orderings_list(column_index, ordering_value) {
    console.log('ORDER', column_index, ordering_value);
    if(orderings_list.has(column_index) || ordering_value === 0) {
        orderings_list.delete(column_index);
    }
    if(ordering_value !== 0) {
        orderings_list.set(column_index, ordering_value);
    }
    src.query.order.value = custom_order.value;
    flag_for_refresh();
}

/////////////////// WHERE ///////////////////////////////

const searches_inps = reactive(/**@type {string[]}*/ ({}));
const custom_where_conj = computed(/**@returns {QueryParts[]} */ () => {
    // console.log('SEARCH NEW VAL1', searches_inps);
    return Object.entries(searches_inps)
        .filter(([i, x]) => x !== undefined && x !== '')
        .map(([i, x]) => [columns_escaped[i], [x, 'l']]);
        // .map(([i, x]) => [`${columns_escaped[i]} LIKE "%${escape_like(x)}%" ESCAPE '\\'`]);
});
const where_conj_combined = computed(() => [...props.query.where_conj, ...custom_where_conj.value]);
src.query.where_conj.value     = where_conj_combined.value;
src.query.where_conj_opt.value = props.query.where_conj_opt;

watch(where_conj_combined, (new_value) => {
    // console.log('SEARCH NEW VAL', new_value);
    src.query.where_conj.value = new_value;
    flag_for_refresh();
});


/////////////////// RESIZING AND STYLING ///////////////////////////////

function recalculate_limit() {
    const container_height = container_ref.value?.clientHeight;
    const scroller_height  = row_ref      .value?.getBoundingClientRect().height;
    if(!container_height || !scroller_height) {
        if(scroller_limit.value !== 1) {
            scroller_limit.value = 1;
            flag_for_refresh(0);
        }
        return;
    }
    const rows_to_fit = Math.floor(container_height / scroller_height);
    const result = Math.max(rows_to_fit - 2, 1);
    console.log("RESIZE", result);
    if(scroller_limit.value !== result) {
        scroller_limit.value = result;
        flag_for_refresh(0);
    }
};

const resizeObserver = new ResizeObserver(recalculate_limit); 

let   current_resize_col_i = -1;
const col_refs     = ref(/**@type {HTMLElement[]} */ ([]));
const column_sizes = ref(/**@type {number[]} */ ([]));
const disable_table_search = ref(true);

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
function handle_mouse_down_on_resizer(/**@type {MouseEvent} */ event, /**@type {number} */ col_i){
    /**@type {HTMLElement} */
    //@ts-ignore
    const parent = event.target.parentNode;
    console.log('DOWN', col_i,  parent.getBoundingClientRect().width);
    column_sizes.value[col_i] = parent.getBoundingClientRect().width;
    current_resize_col_i = col_i;
}
function init_columns_sizes() {
    for(let col_i in col_refs.value) {
        column_sizes.value[col_i] = col_refs.value[col_i].getBoundingClientRect().width;
    }
    disable_table_search.value = false;
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
async function handle_select(row_i) {
    console.log("SELECTING...",  src.offset.value, row_i, props.selectable);
    if(!props.selectable) return;
    const cols = src.full_result.value?.[1] ?? [];
    const row  = result_rows.value[row_i];
    emit("select", cols, row, src.offset.value + row_i);
}

/**
 * @param {WheelEvent} event
 */
function handle_scroll(event) {
    if(event.shiftKey) return;
    event.preventDefault();
    event.stopPropagation();
    const scroll_dist = (event.deltaY / 100) * (event.ctrlKey ? scroller_limit.value : 1);
    flag_for_refresh(scroll_dist);
    // scroller_ref.value.scroll_by(scroll_dist);
}

onMounted(() => {
    resizeObserver.observe(container_ref.value);
    window.addEventListener('mouseup', handle_mouse_up);
    window.addEventListener('mousemove', handle_mouse_move);
    recalculate_limit();
});
onUnmounted(() => {
    resizeObserver.disconnect();
    window.removeEventListener('mouseup', handle_mouse_up);
    window.removeEventListener('mousemove', handle_mouse_move);
});

</script>

<template>

    <div class="form_container">
        <QuerySourceOffsetScroller simple
        :src="src"
        :step="scroller_limit"
        @error="handle_err"
        nosave/>

        <div class="form_content" ref="container_ref" @wheel.capture="handle_scroll">
            <div class="table_container" :class="{disable_table_search}">

                <div class="table_column iterators">
                    <div class="header" ref="row_ref"> </div>
                    <div class="header">#</div>
                    <div class="data" v-for="(row, row_i) in result_rows" @click="handle_select(row_i)"
                            :class="{hovered: current_hovered_row_i === row_i}">
                        {{ src.offset.value + row_i + 1 }}:
                    </div>
                </div>

                <div class="table_column results" v-for="(col_name, col_i) in columns_display" ref="col_refs"
                    :class="{
                        hidden: columns_hide[col_i],
                        type_number: typeof(result_rows[0]?.[col_i]) == 'number',
                        type_text:   typeof(result_rows[0]?.[col_i]) == 'string',
                    }"
                    :style="{width: column_sizes[col_i] === undefined ? undefined : column_sizes[col_i] + 'px' }"
                >
                    <div class="header col_search_cell">
                        <input type="text" class="col_search" v-model="searches_inps[col_i]" required>
                        <div class="resizer" @mousedown="e => handle_mouse_down_on_resizer(e, col_i)"></div>
                    </div>
                    <div class="header col_name_cell">
                        <QueryOrderingBtn class="ordering_btns" v-model:value="orderings_btns[col_i]" @update:value="event => set_orderings_list(col_i, event)"/>
                        <div class="col_name">{{ col_name }}</div>
                    </div>
                    <div class="data data_cell" v-for="(row, row_i) in result_rows" 
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
        width:  6px;
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