<script setup>
//@ts-check

import { ref, onMounted, onUnmounted, watch, nextTick, unref, compile, computed, reactive } from "vue";

import { CREATE_FORM_QUERY_SOURCE_IN_COMPONENT } from "../../Forms/FormCommon";
import { QueryViewerSource, QueryViewerCache } from "./QueryViewer";
import { FormDataSetFull, FormDataSetFull_LocalRow } from "../Dataset";
import QueryOrderingBtn from "./QueryOrderingBtn.vue";
import QuerySourceOffsetScroller from "../Scroller/QuerySourceOffsetScroller.vue";
import FormInput from "../Controls/FormInput.vue";
import FormEnum from "../Controls/FormEnum.vue";
import { smart_focus_next } from "../Controls";



const props = defineProps({
    src: {
        /**@type {import('vue').PropType<QueryViewerSource>} */
        type: Object,
        required: true
    },
    name: {
        type: String,
        required: false
    },

    selectable: Boolean,
    editable:   Boolean,
    insertable: Boolean,
    saveable:   Boolean,
    deletable:  Boolean,

    inbeded: Boolean,
    parent_window: {
        /**@type {import('vue').PropType<import('../FloatingWindows/FWManager').FWWindow>} */
        type: Object,
        required: false
    },

    streach: Boolean,
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


const editable_state = ref(false);
const editable_custom_btn_def = reactive({
    name: 'qv_edit',
    icon: 'edit',
    class: {
        indicate: editable_state
    }
});

async function handle_scroller_custom_button(name) {
    console.log("CUSTOM ", name);
    if(name !== 'qv_edit') return;
    if(editable_state.value) { // TURN OFF
        const confirmed = await src.try_perform_and_update_confirmed(() => src.request_refresh());
        if(confirmed) {
            editable_state.value = false;
            src.dataset.poke();
        }
    } else { // TURN ON
        editable_state.value = true;
        src.dataset.poke();
    }
}

const true_selectable = computed(() => props.selectable && !editable_state.value);
const true_insertable = computed(() => !true_selectable.value && props.insertable);

const first_row_ref  = /**@type {import('vue').Ref<HTMLElement>} */ (ref());
const common_row_ref = /**@type {import('vue').Ref<HTMLElement>} */ (ref());
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
    const container_height  = container_ref. value?.clientHeight;
    const first_row_height  = first_row_ref. value?.getBoundingClientRect().height;
    const common_row_height = common_row_ref.value?.getBoundingClientRect().height;
    if(!container_height || !first_row_height || !common_row_height) {
        if(scroller_limit.value !== 1) {
            scroller_limit.value = 1;
            // src.request_refresh();
            src.mark_for_update();
            // flag_for_refresh(0);
        }
        return;
    }
    const rows_to_fit = Math.floor((container_height - first_row_height) / common_row_height);
    const result = Math.max(rows_to_fit - 1, 1);
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
const disable_table_search  = ref(true);
const advanced_table_search = ref(false);
const is_limit_cropped = computed(() => result_rows.value.length >= scroller_limit.value);

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
        const new_size = (column_sizes.value[current_resize_col_i][0] += delta);
        const new_size_clumped = Math.max(new_size, 0);
        const col_name = columns_names[current_resize_col_i];
        QueryViewerCache.update_and_save_column_size(props.name, col_name, new_size_clumped);
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
        QueryViewerCache.load_and_apply_column_size(props.name, column_sizes, columns_names);
        disable_table_search.value = false;
        src.set_columns_fixed();
    });
}

/////////////////// EVENT HANDLERS (indicator) ///////////////////////////////

/**@type {import('vue').Ref<HTMLElement | undefined>} */
const indicator_ref = ref();

/**
 * @param {any} element 
 */
function move_indicator(element) {
    const indicator_elem = indicator_ref.value;
    if(!indicator_elem) return;
    if(!element) {
        indicator_elem.style.top = '';
        indicator_elem.style.height = '0px';
        return;
    }
    const top    = element.offsetTop;
    const height = element.clientHeight;
    // const scrollLeft = container_ref.value?.scrollLeft;
    // console.log(scrollLeft);
    indicator_elem.style.top    = top+'px';
    indicator_elem.style.height = height+'px';
    // indicator_elem.style.left   = scrollLeft + 'px';
}

let current_hovered_row_i = -1;
/**
 * @param {Event} event 
 * @param {number} row_i 
 */
function handle_row_hover(event, row_i) {
    current_hovered_row_i = row_i;
    move_indicator(event.target);
}
/**
 * @param {Event} event 
 * @param {number} row_i 
 */
function handle_row_unhover(event, row_i) {
    if(current_hovered_row_i === row_i){
        current_hovered_row_i = -1;
        move_indicator(null);
    }
}

/////////////////// FOCUS ///////////////////////////////

function get_elements_from_row(/**@type {number} */ row) {
    return col_refs.value.map(x => x.children[2 + (row % (x.children.length - 2))]);
}

/**
 * @param {number} row_index
 */
function focus_on_row(row_index) {
    const row = get_elements_from_row(row_index);
    smart_focus_next(row);
}

/**
 * @param {number} row 
 */
function get_preffered_focus_list(row) {
    const curr_row = get_elements_from_row(row);
    const next_row = get_elements_from_row(row + 1);
    const res = [...curr_row, ...next_row];
    return res;
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
    if(!true_selectable.value) return;
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
 * 
 * @param {Event} event 
 * @param {string} col_name 
 * @param {0 | 1} which_value 
 * @param {boolean} is_delete 
 */
function handle_interval(event, col_name, which_value, is_delete = false) {
    if(src.changed.value) return;
    /**@type {string | null} */
    //@ts-ignore
    const value = is_delete ? null : (event.target?.value ?? null);
    const new_from = which_value === 0 ? value : undefined;
    const new_to   = which_value === 1 ? value : undefined;
    src.set_interval(col_name, new_from, new_to);
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
 * @param {Event} event 
 * @param {string} col_name 
 */
async function handle_search_type(event, col_name) {
    if(src.changed.value) return;
    src.set_search_type_cycle(col_name);
}

function get_context_menu_custom_data(col_name) {
    const search_type = src.search_type_plugin.get(col_name) ?? 0;
    const search_val  = src.search_plugin.get(col_name);
    const is_only_empty     = search_val === '~';
    const is_only_non_empty = search_val === '!~';
    /**@type {import('../../contextmenu').ContextMenuCustomData} */
    const custom_data = [
        {label: "Szukaj pustych",     checked: is_only_empty,     payload: {type: 'set_search', val: is_only_empty     ? null : '~' }},
        {label: "Szukaj nie-pustych", checked: is_only_non_empty, payload: {type: 'set_search', val: is_only_non_empty ? null : '!~'}},
        {label: ''},
        {label: "Pozycja: dowolnie", checked: search_type === 0, payload: {type: 'set_type', val: 0}},
        {label: "Pozycja: początek", checked: search_type === 1, payload: {type: 'set_type', val: search_type === 1 ? 0 : 1}},
        {label: "Pozycja: koniec",   checked: search_type === 2, payload: {type: 'set_type', val: search_type === 2 ? 0 : 2}},
        {label: "Pozycja: pełny",    checked: search_type === 3, payload: {type: 'set_type', val: search_type === 3 ? 0 : 3}},
        {label: ''},
        {label: "Filtrowanie zaawansowane", checked: advanced_table_search.value, payload: {type: 'toggle_adv'}},
    ];
    return JSON.stringify(custom_data);
}

/**
 * @param {import('../../contextmenu').ContextMenuCustomEvent} event
 * @param {string} col_name
 * */
function handle_context_menu_custom_event(event, col_name){
    const payload = event.payload;
    const target  = event.target;
    switch(payload?.type) {
        case 'set_search': {
            src.set_search(col_name, payload?.val ?? null);
            break;
        }
        case 'set_type': {
            src.set_search_type(col_name, payload?.val ?? 0);
            break;
        }
        case 'toggle_adv': {
            advanced_table_search.value = !advanced_table_search.value;
            break;
        }
    }
}

/**
 * @param {number} new_order 
 * @param {string} col_name 
 */
async function handle_order(new_order, col_name) {
    if(src.changed.value) return;
    src.set_order(col_name, new_order);
}

function get_input_type_for_col(col_name) {
    return src.display_columns.get(col_name)?.format === 'date'     ? 'date' :
           src.display_columns.get(col_name)?.format === 'datetime' ? 'datetime-local' :
           'text';
}

QueryViewerSource.window_resize_on_columns_fixed([src], props.parent_window, props.streach);
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

defineExpose({
    focus_on_row
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
        :insertable="true_insertable"
        :full_limit="scroller_limit"
        :custom_buttons="props.editable ? [editable_custom_btn_def] : undefined"
        @custom="handle_scroller_custom_button"
        />

        <component onsubmit="return false" :is="props.inbeded ? 'div' : 'form'" class="form_content" ref="container_ref" @wheel.capture="handle_scroll" :class="{enable_scroll: src.changed, selectable: true_selectable}">
            <div class="table_container" :class="{disable_table_search, advanced_table_search}">
                <div class="table_column iterators">
                    <div class="header" ref="first_row_ref"></div>
                    <div class="header" ref="common_row_ref">#</div>
                    <div class="data" v-for="(row, row_i) in result_rows"
                            :class="{
                                deleted:  row.deleted,
                                inserted: row.inserted,
                                last_faded: row_i === result_rows.length-1 && is_limit_cropped
                            }"
                            @pointerleave="e => handle_row_unhover(e, row_i)"
                            @pointerenter="e => handle_row_hover  (e, row_i)" 
                            @pointerdown="e => handle_select_down(row_i, true, e)"
                            @pointerup="e => handle_select_up(row_i, true, e)">
                        <img class="delete_button button" 
                            src="/assets/icons/trashx.svg" 
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
                    <div class="header col_search_cell"
                        :search_type="src.search_type_plugin.get(col_name)??0"
                    >
                        <!-- <div class="col_search_type"
                             @click="e => handle_search_type(e, col_name)"
                            :class="{changed: (src.search_type_plugin.get(col_name)??0) !== 0}" 
                        >
                            {{ ['...', '|..', '..|', '|.|'][src.search_type_plugin.get(col_name) ?? 0] }}
                        </div> -->

                        <div class="col_search_adv">
                            <span>Od:</span>
                            <span>Do:</span>
                            <input 
                                :type="get_input_type_for_col(col_name)"
                                :class="{changed: !!src.interval_plugin.get(col_name)?.[0]}" 
                                :value="src.interval_plugin.get(col_name)?.[0] ?? ''" 
                                        @input="e => handle_interval(e, col_name, 0, false)"
                                @reset_changes="e => handle_interval(e, col_name, 0, true)">
                            <input 
                                :type="get_input_type_for_col(col_name)"
                                :class="{changed: !!src.interval_plugin.get(col_name)?.[1]}" 
                                :value="src.interval_plugin.get(col_name)?.[1] ?? ''" 
                                        @input="e => handle_interval(e, col_name, 1, false)"
                                @reset_changes="e => handle_interval(e, col_name, 1, true)">
                        </div>

                        <input type="text" class="col_search"
                            :context_menu_custom_data="get_context_menu_custom_data(col_name)"
                            @contextmenucustom="e => handle_context_menu_custom_event(e, col_name)"
                            :class="{changed: !!src.search_plugin.get(col_name)}" 
                            :value="src.search_plugin.get(col_name) ?? ''" 
                                    @input="e => handle_search(e, col_name, false)"
                            @reset_changes="e => handle_search(e, col_name, true)">
                        <div class="resizer" @pointerdown="e => handle_mouse_down_on_resizer(e, col_i)"></div>
                    </div>
                    <div class="header col_name_cell" :class="{indicate_sorting: src.order_plugin.get(col_name) !== undefined}">
                        <QueryOrderingBtn class="ordering_btns" :value="src.order_plugin.get(col_name)" @update:value="new_order => handle_order(new_order, col_name)"/>
                        <div class="col_name">{{ columns_display_props[col_i].name }}</div>
                    </div>
                    <component :is="columns_display_props[col_i].as_enum ? FormEnum : FormInput"
                        :key="src.dataset.get_unique_key(col_i) + '_' + row_i" 
                        class="data data_cell" v-for="(row, row_i) in result_rows"
                        :class="{
                            deleted:  row.deleted,
                            inserted: row.inserted,
                            last_faded: row_i === result_rows.length-1 && is_limit_cropped
                        }"
                        @pointerleave="e => handle_row_unhover(e, row_i)"
                        @pointerenter="e => handle_row_hover  (e, row_i)" 
                        @pointerdown="e => handle_select_down(row_i, false, e)"
                        @pointerup="e => handle_select_up(row_i, false, e)"
                        :preffered_focus="() => get_preffered_focus_list(row_i)"
                        :value="row.get(col_name)"
                        auto
                        nospin
                        v-bind="unref(columns_display_props[col_i].input_props)"
                        :readonly="!props.saveable || true_selectable || columns_display_props[col_i].readonly"
                    />
                </div>
                <div class="indicator" ref="indicator_ref"></div>
            </div>
        </component>
    </div>

</template>

<style scoped>

    .form_container {
        justify-content: start;
        align-items: stretch;
        position: relative;
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
    .indicator {
        user-select: none;
        pointer-events: none;
        position: absolute;
        left: 0px;
        width: 100%;
        height: 0ch;
        background-color: #00fff2;
        opacity: 10%;
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
        display: grid;
        /* grid-template-columns: auto 1fr auto; */
        grid-template: auto / 1fr;
        align-items: center;
        justify-content: left;
        padding-left: 2px;
    }
    .col_search_cell .col_search_type {
        font-family: monospace;
        font-size: 0.9em;
        cursor: pointer;
        user-select: none;
        font-weight: bolder;
    }
    .col_search_cell .col_search {
        width: calc(100% - 4px);
        box-sizing: border-box;
    }
    .col_search_cell[search_type="1"] .col_search,
    .col_search_cell[search_type="3"] .col_search {
        border-left-width: 5px;
    }
    .col_search_cell[search_type="2"] .col_search,
    .col_search_cell[search_type="3"] .col_search {
        border-right-width: 5px;
    }

    .col_search_cell .col_search_adv {
        display: none;
        grid-template: auto auto / auto 1fr;
        grid-auto-flow: column;
    }
    .col_search_cell .col_search_adv > * {
        min-width: 0.5ch;
    }
    .advanced_table_search .col_search_cell .col_search_adv {
        display: grid;
    }
    .advanced_table_search .table_column > *:first-child {
        height: 8.5ch;
    }

    .disable_table_search .col_search {
        display: none;
    }
    .col_search_cell .col_search_type.changed {
        background-color: #fff67d;
    }
    .col_search_cell .changed {
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

    .col_name {
        white-space: nowrap;
    }
    .col_name_cell {
        display: flex;
        flex-direction: row;
        justify-content: start;
    }
    .col_name_cell :deep(.ordering_btns) {
        flex-shrink: 0;
    }

    .table_column ::v-deep(.last_faded) {
        border-bottom: none;
    }

    .hidden {
        display: none;
    }

    .indicate_sorting {
        background-color: #dfeaff;
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