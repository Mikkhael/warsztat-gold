//@ts-check

import { computed, nextTick, reactive, ref, unref, watch } from "vue";
import { FormQuerySourceFull, Column, QuerySource, FormDataSetFull_LocalRow, FormDataSetFull } from "../Dataset";
import { deffered_promise, escape_backtick_smart, escape_sql_value, get_date_format_with_dot } from "../../utils";
import { FWWindow } from "../FloatingWindows/FWManager";

/**
 * @typedef {'decimal' | 'date' | 'datetime' | ''} DisplayFormat
 */

/**
 * @typedef {import("../Dataset/Form").StandardFormValueRoutineParams & {
 *  display?:  string,
 *  readonly?: boolean,
 *  as_enum?:  boolean,
 *  width?:    number,
 *  format?:   DisplayFormat,
 *  input_props?: import('vue').MaybeRef<Object.<string, any>>
 * }} StandardFormValueRoutineParams_WithDisplay
 */

/**
 * @typedef {{
 *  name:     string,
 *  readonly: boolean,
 *  as_enum:  boolean,
 *  width:    number | undefined,
 *  format:   DisplayFormat | undefined
 *  input_props: import('vue').MaybeRef<Object.<string, any>>
 * }} DisplayColProps
 */

/**
 * @typedef {(
 *  columns: string[],
 *  row:     FormDataSetFull_LocalRow,
 *  offset?: number,
 *  close?:  () => void
 * ) => void} QueryViewerSelectHandler
 */

/**
 * 
 * @param {string} col_search 
 * @param {string} col_name 
 * @param {DisplayFormat} format 
 */
function apply_format(col_search, col_name, format) {
    const replace_comma = format === 'date' || format === 'datetime';
    const escaped = escape_backtick_smart(col_name);
    const true_search = replace_comma ? col_search.replaceAll(',','.') : col_search;
    const with_dot = true_search.indexOf(".") >= 0;

    const true_name = 
        "ifnull(" + (
        (format === 'date'     && with_dot) ? `strftime('%d.%m.%Y',${   escaped})` :
        (format === 'datetime' && with_dot) ? `strftime('%d.%m.%Y %T',${escaped})` : 
                                                escaped) + ",'')";

    return [
        true_name,
        true_search
    ]
}

class QueryViewerSource extends FormQuerySourceFull {
    /**
     * @param {boolean} implicit_order_rowid 
     */
    constructor(implicit_order_rowid = false) {
        super(implicit_order_rowid, 0);
        this.display_columns = reactive(/**@type {Map<string, DisplayColProps>} */ (new Map()));

        this.order_plugin       = reactive(/**@type {Map<string, number>} */ (new Map()));
        this.search_plugin      = reactive(/**@type {Map<string, string>} */ (new Map()));
        this.search_type_plugin = reactive(/**@type {Map<string, number>} */ (new Map())); // STOPS:  0 - none, 1 - left, 2 - right, 3 - both
        this.interval_plugin    = reactive(/**@type {Map<string, [string|null, string|null]>} */ (new Map()));

        const order_plugin_array  = computed(/**@returns {[string, boolean, string][]} */ () => Array.from(this.order_plugin).map(x => [
            escape_backtick_smart(x[0]), 
            x[1] > 0, 
            this.display_columns.get(x[0])?.format === 'decimal' ? 'decimal' : ''
        ]));
        const search_plugin_array = computed(/**@returns {[string, string | [string, 'l', number]][]} */ () => Array.from(this.search_plugin).map(x => {
            const col_name   = x[0];
            const col_search = x[1];
            const col_type   = this.search_type_plugin.get(col_name) ?? 0;
            const format = this.display_columns.get(col_name)?.format ?? '';
            const [true_name, true_search] = apply_format(col_search, col_name, format);
            /**@type {string | [string, 'l', number]} */
            const compared_expresion = true_search === "~"  ? "IS ''" :
                                       true_search === "!~" ? "IS NOT ''" :
                                       [true_search, 'l', col_type];
            // console.log("WITH DOT: ", with_dot, escaped);
            /**@type {[string, string | [string, 'l', number]]} */
            const res = [
                true_name,
                compared_expresion
            ];
            return res;
        }));
        const interval_plugin_array = computed(() => Array.from(this.interval_plugin).map(/**@returns {[string] | null} */ x => {
            const col_name  = x[0];
            const col_from  = x[1][0] ?? null;
            const col_to    = x[1][1] ?? null;
            const format  = this.display_columns.get(col_name)?.format ?? '';
            const collate = format === 'decimal' ? ' COLLATE decimal' : '';
            const [true_name1, true_val1] = col_from === null ? [] : apply_format(col_from, col_name, format);
            const [true_name2, true_val2] = col_to   === null ? [] : apply_format(col_to,   col_name, format);
            const extended2 = format === 'date' ? true_val2 + 'Z' : true_val2;
            const escaped1 = escape_sql_value(true_val1 ?? null);
            const escaped2 = escape_sql_value(extended2 ?? null);
            if( true_val1 &&  true_val2) {
                return [`${true_name1} BETWEEN ${escaped1}${collate} AND ${escaped2}${collate}`];
            }
            if( true_val1 && !true_val2) {
                return [`${true_name1} >= ${escaped1}${collate}`];
            }
            if(!true_val1 &&  true_val2) {
                return [`${true_name2} <= ${escaped2}${collate}`];
            }
            return null;
        }).filter(x => x !== null));

        this.query.add_order_plugin(order_plugin_array);
        this.query.add_where_plugin(search_plugin_array);
        this.query.add_where_plugin(interval_plugin_array);

        this.columns_fixed = ref(false);
        this.columns_fixed_promise = deffered_promise();
    }

    start_plugin_watcher() {
        return watch([this.order_plugin, this.search_plugin, this.search_type_plugin, this.interval_plugin], () => {
            this.request_offset_goto(0, false);
            this.mark_for_update();
        });
    }

    get_limit() {
        const limit = this.query.limit.value;
        return limit < 0 ? 0 : (limit ?? 0);
    }
    set_columns_fixed(value = true) {
        this.columns_fixed.value = value;
        this.columns_fixed_promise.resolve(value);
    }
    get_columns_fixed_promise() {
        return this.columns_fixed_promise.promise;
    }
    /**
     * @param {QueryViewerSource[]} srcs 
     * @param {FWWindow | undefined} window
     */
    static async window_resize_on_columns_fixed(srcs, window, with_streach = false) {
        if(!window) return;
        await Promise.all(srcs.map(x => x.get_columns_fixed_promise()));
        window.box.resize_to_content().recenter(); // TODO fix to big resize
        if(with_streach) {
            window.box.streach_vertical().recenter();
        }
    }

    /////// Ordering //////////////////////

    /**
     * @param {Column | string} column 
     * @param {number} value 
     */
    set_order(column, value) {
        const name = column instanceof Column ? column.get_full_sql() : column;
        if(this.order_plugin.has(name)) {
            this.order_plugin.delete(name);
        }
        if(value !== 0) {
            this.order_plugin.set(name, value);
        }
    }
    

    /////// Search //////////////////////

    /**
     * @param {Column | string} column 
     * @param {string?} value 
     * @param {number} [type]
     */
    set_search(column, value, type) {
        const name = column instanceof Column ? column.get_full_sql() : column;
        if(value === null || value === '') {
            this.search_plugin.delete(name);
        } else {
            this.search_plugin.set(name, value);
            if(type !== undefined) {
                this.search_type_plugin.set(name, type);
            }
        }
    }
    /**
     * @param {Column | string} column 
     * @param {number} type
     */
    set_search_type(column, type) {
        const name = column instanceof Column ? column.get_full_sql() : column;
        this.search_type_plugin.set(name, type % 4);
    }
    /**
     * @param {Column | string} column 
     */
    set_search_type_cycle(column) {
        const name = column instanceof Column ? column.get_full_sql() : column;
        const old_type = this.search_type_plugin.get(name) ?? 0;
        return this.set_search_type(name, old_type + 1);
    }

    /////// Intervals //////////////////////

    /**
     * @param {Column | string} column 
     * @param {string?} [from]
     * @param {string?} [to]
     */
    set_interval(column, from, to) {
        const name = column instanceof Column ? column.get_full_sql() : column;
        const interval = this.interval_plugin.get(name) ?? [null, null];
        if(from !== undefined) interval[0] = from;
        if(to   !== undefined) interval[1] = to;
        if(interval[0] === null && interval[1] === null) {
            this.interval_plugin.delete(name);
        } else {
            this.interval_plugin.set(name, interval);
        }
    }


    //////// Display Columns /////////////

    /**
     * 
     * @param {string | Column} [column] 
     * @param {import('vue').MaybeRef<Object.<string, any>>} [input_props] 
     * @param {DisplayFormat} [format] 
     * @returns {DisplayFormat}
     */
    static get_display_format(column, input_props, format) {
        if(format) return format;
        if(input_props) {
            const props = unref(input_props);
            if(props.type === 'decimal')  return 'decimal';
            if(props.type === 'date')     return 'date';
            if(props.type === 'datetime') return 'datetime';
        }
        if(column instanceof Column) {
            if(column.type === 'DECIMAL')   return 'decimal';
            if(column.type === 'DATETIME')  return 'date';
            if(column.type === 'TIMESTAMP') return 'date';
        }
        return '';
    }

    /**
     * @param {string | Column} column_name 
     * @param {string} display_name 
     * @param {{
     *  readonly?:    boolean,
     *  as_enum?:     boolean,
     *  width?:       number | undefined,
     *  format?:      'decimal' | 'date' | 'datetime' | ''
     *  input_props?: import('vue').MaybeRef<Object.<string, any>>
     * }} props
     */
    add_display_column(column_name, display_name, props) {
        const name = column_name instanceof Column ? column_name.get_full_sql() : column_name;
        if(this.display_columns.has(name)) {
            throw new Error("Display column already exists: " + name);
        }
        this.display_columns.set(name, {
            name: display_name,
            readonly: props.readonly ?? false,
            as_enum:  props.as_enum ?? false,
            width:    props.width,
            format:   QueryViewerSource.get_display_format(column_name, props.input_props, props.format),
            input_props: props.input_props ?? {},
        });
    }

    /**
     * @param {string} name 
     * @param {StandardFormValueRoutineParams_WithDisplay} params
     */
    auto_add_column_impl(name, params = {}) {
        if(params.display){
            this.add_display_column(name, params.display, {
                readonly: params.readonly ?? !params.sync,
                as_enum: params.as_enum,
                input_props: params.input_props,
                width: params.width,
                format: QueryViewerSource.get_display_format(name, params.input_props, params.format),
            });
        }
        super.auto_add_column_impl(name, params);
    }
    /**
     * @param {Column | string} col 
     * @param {StandardFormValueRoutineParams_WithDisplay & {computed: Parameters<FormDataSetFull['add_column_local']>[1]}} params
     */
    auto_add_column_local(col, params) {
        if(params.display){
            this.add_display_column(col, params.display, {
                readonly: params.readonly ?? !params.computed.setter,
                as_enum: params.as_enum,
                input_props: params.input_props,
                width: params.width,
                format: QueryViewerSource.get_display_format(col, params.input_props, params.format),
            });
        }
        this.dataset.add_column_local(col, params.computed, params.assoc_col);
    }
    
    /**
     * Automatically get column name and wheather it is primary
     * @param {Column | string} col 
     * @param {StandardFormValueRoutineParams_WithDisplay} params
     */
    auto_add_column(col, params = {}) {
        const better_params = Object.assign({}, params, {format: QueryViewerSource.get_display_format(col, params.input_props, params.format)});
        super.auto_add_column(col, better_params);
    }
    /**
     * Automatically get column name and wheather it is primary, and generate appropiate sync
     * @param {Column | string} col 
     * @param {StandardFormValueRoutineParams_WithDisplay} params
     */
    auto_add_column_synced(col, params = {}) {
        const better_params = Object.assign({}, params, {format: QueryViewerSource.get_display_format(col, params.input_props, params.format)});
        super.auto_add_column_synced(col, better_params);
    }

    //////////////////////////////// utils ////////////////

    /** 
     * 
     * @param {QueryViewerSelectHandlerStanderdStep[]} steps 
     * @param {(err: any) => void} handle_error
     * @param {{
     *  close?: boolean,
     *  focus_window?: FWWindow,
     * }} [options]
     */
    static create_default_select_handler(steps, handle_error, options) {
        const first_src = steps[0][0];
    
        /**
         * @param {string[]} cols 
         * @param {FormDataSetFull_LocalRow} row 
         * @param {number} offset
         * @param {() => void} close 
         */
        const res_handler = (cols, row, offset, close) => {
            console.log("SELECTING ", row);
            return first_src.try_perform_and_update_confirmed(() => {
                for(const [src, idx, colname] of steps) {
                    src.request_offset_rownum(row.get_cached(idx) ?? null, colname);
                }
            }).then(succ => {
                if(succ && options?.close) close();
                if(succ && options?.focus_window) {
                    options.focus_window.box.focus();
                }
                return succ;
            }).catch(err => {
                handle_error(err);
                return false;
            });
        };
        return res_handler;
    }
}

/**
 * @typedef {[src: QuerySource, index_column: Column | string | number] | [src: QuerySource, index_column: Column | string | number, index_column_name: string]} QueryViewerSelectHandlerStanderdStep
 * 
 */

/**
 * @typedef {Object.<string, {
 *  col_sizes: Object.<string, number>,
 * }>} LocalStoreage_QueryViewerCaches
 */

const QueryViewerCache_LocalStorageName = 'query_viewer_cache';

class QueryViewerCache {
    static fetch() {
        const cache_string = localStorage.getItem(QueryViewerCache_LocalStorageName);
        if(!cache_string) {
            return null
        }
        try{
            /**@type {LocalStoreage_QueryViewerCaches} */
            const cache_json = JSON.parse(cache_string);
            console.log("FETCHED CACHE", cache_json);
            return cache_json;
        }catch(err) {
            console.error("Invalid JSON", cache_string, err);
            return null;
        }
    }
    static fetch_name(/**@type {string|undefined} */ cache_name) {
        if(!cache_name) return null;
        const cache = this.fetch()?.[cache_name] ?? null;
        return cache;
    }
    /**
     * @param {LocalStoreage_QueryViewerCaches} cache 
     */
    static save(cache) {
        try{
            const cache_json = JSON.stringify(cache);
            localStorage.setItem(QueryViewerCache_LocalStorageName, cache_json);
            // console.log("SAVED CACHE", cache);
        }catch(err) {
            console.error("Failed stringify on Query Viewer cache", cache, err);
        }
    }

    /**
     * @param {string|undefined} cache_name
     * @param {import('vue').Ref<[value: number, as_px_not_ch: boolean][]>} column_sizes_ref 
     * @param {string[]} column_names 
     */
    static load_and_apply_column_size(cache_name, column_sizes_ref, column_names) {
        const cache = this.fetch_name(cache_name);
        if(!cache) return;
        for(const [col_name, col_size] of Object.entries(cache.col_sizes)) {
            const col_index = column_names.indexOf(col_name);
            if(col_index < 0) continue;
            column_sizes_ref.value[col_index] = [col_size, true];
        }
    }

    /**
     * @param {string|undefined} cache_name 
     * @param {string}  column_name 
     * @param {number}  column_size 
     */
    static update_and_save_column_size(cache_name, column_name, column_size) {
        if(!cache_name) return;
        const cache = this.fetch() ?? {};
        if(!cache[cache_name]) {cache[cache_name] = {col_sizes: {}};}
        cache[cache_name].col_sizes[column_name] = column_size;
        this.save(cache);
    }


}





export {
    QueryViewerSource,
    QueryViewerCache
}