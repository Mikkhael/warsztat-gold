<script setup>
//@ts-check

import { ref, onMounted, onUnmounted, watch, nextTick, unref, compile, computed } from "vue";

import { CREATE_FORM_QUERY_SOURCE_IN_COMPONENT } from "../../Forms/FormCommon";
import { QueryViewerSource } from "./QueryViewer";
import { FormDataSetFull, FormDataSetFull_LocalRow } from "../Dataset";
import QueryOrderingBtn from "./QueryOrderingBtn.vue";
import QuerySourceOffsetScroller from "../Scroller/QuerySourceOffsetScroller.vue";
import FormInput from "../Controls/FormInput.vue";
import FormEnum from "../Controls/FormEnum.vue";



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

    inbeded: Boolean,
    parent_window: {
        /**@type {import('vue').PropType<import('../FloatingWindows/FWManager').FWWindow>} */
        type: Object,
        required: false
    },
});

// const emit = defineEmits(['select', 'error']);

const emit = defineEmits({
    /**
     * @param {string[]} columns 
     * @param {FormDataSetFull_LocalRow} row 
     * @param {number} offset
     */
    select: (columns, row, offset) => true,
    error:  (any) => true
});

function handle_err(err){
    emit('error', err);
}

const src = props.inbeded ? props.src : CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, {
    src: props.src, 
    no_update_on_mounted: true,
    // shrink_before_resize: true,
    on_error: handle_err
});

const row_ref        = /**@type {import('vue').Ref<HTMLElement>} */ (ref());
const container_ref  = /**@type {import('vue').Ref<HTMLElement>} */ (ref());
const scroller_limit = src.query.limit;
scroller_limit.value = 0;

const columns_names   = Array.from(src.display_columns.keys());
const columns_display_props = Array.from(src.display_columns.values());

const result_rows = /**@type {FormDataSetFull} */ (src.dataset).local_rows;

const unwatch_first_fetch = watch(result_rows, () => {
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
    const container_height = container_ref.value?.clientHeight;
    const scroller_height  = row_ref      .value?.getBoundingClientRect().height;
    if(!container_height || !scroller_height) {
        if(scroller_limit.value !== 1) {
            scroller_limit.value = 1;
            // src.request_refresh();
            src.mark_for_update();
            // flag_for_refresh(0);
        }
        return;
    }
    const rows_to_fit = Math.floor(container_height / scroller_height);
    const result = Math.max(rows_to_fit - 2, 1);
    // console.log("RESIZE", result);
    if(scroller_limit.value !== result) {
        scroller_limit.value = result;
        // src.request_refresh();
        src.mark_for_update();
        // flag_for_refresh(0);
    }
};

const resizeObserver = new ResizeObserver(recalculate_limit); 

let   current_resize_col_i = -1;
const col_refs     = ref(/**@type {HTMLElement[]} */ ([]));
const column_sizes = ref(/**@type {[value: number, as_px_not_ch: boolean][]} */ ([]));
const disable_table_search = ref(true);

const column_sizes_style = computed(() => column_sizes.value.map(([value, as_px_not_ch]) => {
    return value === undefined ? undefined : value + (as_px_not_ch ? 'px' : 'ch');
}));

function handle_mouse_move(/**@type {MouseEvent} */ event) {
    const delta = event.movementX;
    if(current_resize_col_i !== -1) {
        // console.log('MOVE', delta, column_sizes.value[current_resize_col_i]);
        window.getSelection()?.removeAllRanges();
        if(!column_sizes.value[current_resize_col_i]?.[1]) {
            return;
        }
        column_sizes.value[current_resize_col_i][0] += delta;
    }
}
function handle_mouse_up() {
    // console.log('UP');
    current_resize_col_i = -1;
}
function handle_mouse_down_on_resizer(/**@type {MouseEvent} */ event, /**@type {number} */ col_i){
    /**@type {HTMLElement} */
    //@ts-ignore
    const parent = event.target.parentNode;
    const width = parent.getBoundingClientRect().width;
    // console.log('DOWN', col_i, width);
    column_sizes.value[col_i] = [width, true];
    current_resize_col_i = col_i;
}
function minimize_columns_sizes() {
    for(let col_i in col_refs.value) {
        // console.log("STARTING TO MINIMIZE", col_i);
        const col = col_refs.value[col_i];
        const preset_len = columns_display_props[col_i].width;
        if(preset_len !== undefined) {
            column_sizes.value[col_i] = [preset_len, false];
            continue;
        }
        if(col.children.length < 3) continue;
        const first_row = col.children[2];
        if(first_row.tagName !== 'INPUT' || !(
            first_row.getAttribute('type') === 'text' ||
            first_row.getAttribute('type') === 'number' ||
            first_row.getAttribute('type') === '' )) {
                continue;
            }
        let max_length = first_row['value']?.toString().length || 0;
        // console.log(first_row['value'], first_row);
        for(let row_i = 3; row_i < col.children.length; row_i++) {
            const new_max = col.children[row_i]['value']?.toString().length || 0;
            if(new_max > max_length) max_length = new_max;
        }
        max_length += first_row.getAttribute('type') === 'number' ? 2 : 2;
        column_sizes.value[col_i] = [max_length, false];
        // console.log("MINIMIZING", col_i, "TO", max_length);
    }
}

function init_columns_sizes() {
    minimize_columns_sizes();
    nextTick(() => {
        for(let col_i in col_refs.value) {
            column_sizes.value[col_i] = [col_refs.value[col_i].getBoundingClientRect().width, true];
        }
        disable_table_search.value = false;
        src.set_columns_fixed();
    });
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


let last_down_row_i = -1;
async function handle_select_down(row_i, is_from_col_id = false, /**@type {PointerEvent} */ event) {
    if(event.button !== 0) return;
    last_down_row_i = row_i;
}

/**
 * @param {number} row_i
 */
async function handle_select_up(row_i, is_from_col_id = false, /**@type {PointerEvent} */ event) {
    if(event.button !== 0) return;
    if(row_i !== last_down_row_i){
        last_down_row_i = -1;
        return;
    }
    last_down_row_i = -1;
    if(!props.selectable) return;
    // console.log("SELECTING...",  is_from_col_id, src.offset.value, row_i, props.selectable);
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
    const scroll_dist = Math.round(event.deltaY / 100) * (event.ctrlKey ? scroller_limit.value : 1);
    src.request_offset_scroll(scroll_dist);
    src.mark_for_update();
    // flag_for_refresh(scroll_dist);
    // scroller_ref.value.scroll_by(scroll_dist);
}

/**
 * @param {Event} event 
 * @param {string} col_name 
 */
async function handle_search(event, col_name, is_delete = false) {
    if(src.changed.value) return;
    if(is_delete) {
        src.search_plugin.delete(col_name);
        return;
    }
    /**@type {string | null} */
    //@ts-ignore
    const value = event.target?.value;
    src.set_search(col_name, value);
}
/**
 * @param {number} new_order 
 * @param {string} col_name 
 */
async function handle_order(new_order, col_name) {
    if(src.changed.value) return;
    src.set_order(col_name, new_order);
}

QueryViewerSource.window_resize_on_columns_fixed([src], props.parent_window);
src.start_plugin_watcher();

onMounted(() => {
    if(!props.inbeded) {
        src.assoc_form(container_ref.value);
    }
    resizeObserver.observe(container_ref.value);
    window.addEventListener('pointerup', handle_mouse_up);
    window.addEventListener('pointermove', handle_mouse_move);
    recalculate_limit();
});
onUnmounted(() => {
    resizeObserver.disconnect();
    window.removeEventListener('pointerup', handle_mouse_up);
    window.removeEventListener('pointermove', handle_mouse_move);
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
        />

        <component :is="props.inbeded ? 'div' : 'form'" class="form_content" ref="container_ref" @wheel.capture="handle_scroll" :class="{enable_scroll: src.changed, selectable: props.selectable}">
            <div class="table_container" :class="{disable_table_search}">

                <div class="table_column iterators">
                    <div class="header" ref="row_ref"> </div>
                    <div class="header">#</div>
                    <div class="data" v-for="(row, row_i) in result_rows"
                            :class="{
                                hovered: current_hovered_row_i === row_i,
                                deleted:  row.deleted,
                                inserted: row.inserted,
                            }"
                            @pointerleave="handle_row_unhover(row_i)"
                            @pointerenter="handle_row_hover  (row_i)" 
                            @pointerdown="e => handle_select_down(row_i, true, e)"
                            @pointerup="e => handle_select_up(row_i, true, e)">
                        <img class="delete_button button" 
                            src="./../../assets/icons/trashx.svg" 
                            @click="src.dataset.flip_row_deleted(row_i)" 
                            v-if="props.deletable"
                        />
                        {{ src.offset.value + row_i + 1 }}:
                    </div>
                </div>

                <div class="table_column results" v-for="(col_name, col_i) in columns_names" ref="col_refs"
                    :class="{
                        type_number: typeof(result_rows[0]?.[col_i]) == 'number',
                        type_text:   typeof(result_rows[0]?.[col_i]) == 'string',
                    }"
                    :style="{width: column_sizes_style[col_i] }"
                >
                    <div class="header col_search_cell">
                        <input type="text" class="col_search"
                            :class="{changed: !!src.search_plugin.get(col_name)}" 
                            :value="src.search_plugin.get(col_name)" 
                                    @input="e => handle_search(e, col_name, false)"
                            @reset_changes="e => handle_search(e, col_name, true)">
                        <div class="resizer" @pointerdown="e => handle_mouse_down_on_resizer(e, col_i)"></div>
                    </div>
                    <div class="header col_name_cell">
                        <QueryOrderingBtn class="ordering_btns" :value="src.order_plugin.get(col_name)" @update:value="new_order => handle_order(new_order, col_name)"/>
                        <div class="col_name">{{ columns_display_props[col_i].name }}</div>
                    </div>
                    <component :is="columns_display_props[col_i].as_enum ? FormEnum : FormInput"
                            :key="src.dataset.get_unique_key(col_i) + '_' + row_i" 
                            class="data data_cell" v-for="(row, row_i) in result_rows"
                            :class="{
                                hovered: current_hovered_row_i === row_i,
                                deleted:  row.deleted,
                                inserted: row.inserted,
                            }"
                            @pointerleave="handle_row_unhover(row_i)"
                            @pointerenter="handle_row_hover  (row_i)" 
                            @pointerdown="e => handle_select_down(row_i, false, e)"
                            @pointerup="e => handle_select_up(row_i, false, e)"
                            :value="row.get(col_name)"
                            auto
                            nospin
                            v-bind="unref(columns_display_props[col_i].input_props)"
                            :readonly="!props.saveable || columns_display_props[col_i].readonly"
                        />
                </div>
            </div>
        </component>
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
    .form_content.selectable ::v-deep(.data){
        cursor: pointer;
    }

    .table_container {
        display: flex;
        flex-direction: row;
        align-items: stretch;
    }

    .table_column {
        /* width: 15ch; */
        min-width: 6ch;
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
    }
    .table_column > ::v-deep(.data_cell) {
        flex-grow: 1;
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
    .table_column ::v-deep(.data.hovered) {
        background-color: #d7fffc;
    }
    .table_column ::v-deep(.data.deleted) {
        background-color: #ffd7d7;
    }
    .table_column ::v-deep(.data.inserted:not(.changed)) {
        background-color: #dcffd7;
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