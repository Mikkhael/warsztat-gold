<script setup>
//@ts-check

import { ref, onMounted, onUnmounted, watch, nextTick, toRef } from "vue";


import { QueryViewerSource } from "./QueryViewer";
import QueryOrderingBtn from "./QueryOrderingBtn.vue";
import QuerySourceOffsetScroller from "../Scroller/QuerySourceOffsetScroller.vue";
import FormInput from "../Controls/FormInput.vue";


const props = defineProps({
    src: {
        /**@type {import('vue').PropType<QueryViewerSource>} */
        type: Object,
        required: true
    },
    selectable: Boolean,
    insertable: Boolean,
    saveable:   Boolean,
    deletable:  Boolean,
});
const src = props.src;

console.log("QUERY VIEWER ADV", props);

const row_ref        = /**@type {import('vue').Ref<HTMLElement>} */ (ref());
const container_ref  = /**@type {import('vue').Ref<HTMLElement>} */ (ref());
const scroller_limit = src.query.limit;
scroller_limit.value = 0;

const emit = defineEmits(['select', 'error']);

// const msgManager = useMainMsgManager();
function handle_err(err){
	// msgManager.postError(err);
    emit('error', err);
}

const columns_names   = Array.from(src.display_columns.keys());
const columns_display = Array.from(src.display_columns.values());

const result_rows = src.dataset.local_rows;

const unwatch_first_fetch = watch(result_rows, () => {
    console.log('QVIERWER FIRST FETCH');
    nextTick(() => {
        init_columns_sizes();
    })
    unwatch_first_fetch();
});

// Fix limit when size was changed while the form was changed
watch(props.src.changed, (new_changed) => {
    if(!new_changed) {
        recalculate_limit();
    }
});

/////////////////// RESIZING AND STYLING ///////////////////////////////

function recalculate_limit() {
    if(src.changed.value) return;
    const container_height = container_ref.value?.getBoundingClientRect().height;
    const scroller_height  = row_ref      .value?.getBoundingClientRect().height;
    if(!container_height || !scroller_height) {
        if(scroller_limit.value !== 1) {
            scroller_limit.value = 1;
            src.request_refresh();
            src.mark_for_update();
            // flag_for_refresh(0);
        }
        return;
    }
    const rows_to_fit = Math.floor(container_height / scroller_height);
    const result = Math.max(rows_to_fit - 2, 1);
    console.log("RESIZE", result);
    if(scroller_limit.value !== result) {
        scroller_limit.value = result;
        src.request_refresh();
        src.mark_for_update();
        // flag_for_refresh(0);
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
async function handle_select(row_i, is_from_col_id = false) {
    console.log("SELECTING...",  is_from_col_id, src.offset.value, row_i, props.selectable);
    if(!props.selectable) return;
    const cols = src.full_result.value?.[1] ?? [];
    const row  = result_rows.value[row_i];
    emit("select", cols, row, src.offset.value + row_i);
}

/**
 * @param {WheelEvent} event
 */
async function handle_scroll(event) {
    if(src.changed.value) return;
    if(event.shiftKey) return;
    event.preventDefault();
    event.stopPropagation();
    const scroll_dist = (event.deltaY / 100) * (event.ctrlKey ? scroller_limit.value : 1);
    src.request_offset_scroll(scroll_dist);
    src.mark_for_update();
    // flag_for_refresh(scroll_dist);
    // scroller_ref.value.scroll_by(scroll_dist);
}

src.start_plugin_watcher();

onMounted(() => {
    src.assoc_form(container_ref.value);
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

// {{row.get_local(col_name) ?? '~'}}

</script>

<template>

    <div class="form_container">
        <QuerySourceOffsetScroller simple
        :src="src"
        :step="scroller_limit"
        @error="handle_err"
        :saveable="props.saveable"
        :insertable="props.insertable"
        :full_limit="scroller_limit"
        nosave/>

        <form class="form_content" ref="container_ref" @wheel.capture="handle_scroll" :class="{enable_scroll: src.changed, selectable: props.selectable}">
            <div class="table_container" :class="{disable_table_search}">

                <div class="table_column iterators">
                    <div class="header" ref="row_ref"> </div>
                    <div class="header">#</div>
                    <div class="data" v-for="(row, row_i) in result_rows" @click="handle_select(row_i, true)"
                            :class="{hovered: current_hovered_row_i === row_i}">
                        <img class="delete_button button" 
                        src="./../../assets/icons/trashx.svg" 
                        @click="src.dataset.flip_row_deleted(row_i)" 
                        v-if="props.deletable"/>
                        {{ src.offset.value + row_i + 1 }}:
                    </div>
                </div>

                <div class="table_column results" v-for="(col_name, col_i) in columns_names" ref="col_refs"
                    :class="{
                        type_number: typeof(result_rows[0]?.[col_i]) == 'number',
                        type_text:   typeof(result_rows[0]?.[col_i]) == 'string',
                    }"
                    :style="{width: column_sizes[col_i] === undefined ? undefined : column_sizes[col_i] + 'px' }"
                >
                    <div class="header col_search_cell">
                        <input type="text" class="col_search" :class="{changed: !!src.search_plugin.get(col_name)}" :value="src.search_plugin.get(col_name)" @input="e => src.set_search(col_name, e.target?.['value'])">
                        <div class="resizer" @mousedown="e => handle_mouse_down_on_resizer(e, col_i)"></div>
                    </div>
                    <div class="header col_name_cell">
                        <QueryOrderingBtn class="ordering_btns" :value="src.order_plugin.get(col_name)" @update:value="e => src.set_order(col_name, e)"/>
                        <div class="col_name">{{ columns_display[col_i] }}</div>
                    </div>
                    <component :is="props.selectable ? 'div' : FormInput" class="data data_cell" v-for="(row, row_i) in result_rows"
                            :key="src.dataset.get_unique_key(col_i) + '_' + row_i" 
                            :class="{
                                hovered: current_hovered_row_i === row_i,
                                deleted:  row.deleted,
                                inserted: row.inserted,
                            }"
                            @click="handle_select(row_i, false)"
                            @mouseleave="handle_row_unhover(row_i)"
                            @mouseenter="handle_row_hover  (row_i)" 
                            :value="row.get(col_name)"
                            auto
                            v-text="row.get_cached(col_name)"/>
                </div>
            </div>
        </form>
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
    .form_content.enable_scroll {
        overflow-y: auto;
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
    .data,
    .results ::v-deep(.data_cell) {
        /* box-sizing: border-box; */
        /* width:  100%; */
        height: 2.5ch;
        padding: 2px 5px;
        font-family: monospace;
        text-wrap: nowrap;
        border: 1px solid black;
        overflow: hidden;
        text-overflow: ellipsis;
        margin: 0px;
    }
    .header {
        font-weight: bold;
    }
    .delete_button {
        height: 2ch;
    }
    .results ::v-deep(.data_cell.hovered) {
        background-color: #d7fffc;
    }   
    .results ::v-deep(.data_cell.deleted) {
        background-color: #ffd7d7;
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
    .col_search_cell .col_search.changed {
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