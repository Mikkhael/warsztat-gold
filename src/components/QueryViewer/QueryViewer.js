//@ts-check

import { computed, nextTick, reactive, ref, unref, watch } from "vue";
import { FormQuerySourceFull, Column, QuerySource, FormDataSetFull_LocalRow, FormDataSetFull } from "../Dataset";
import { deffered_promise, escape_backtick_smart } from "../../utils";
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


class QueryViewerSource extends FormQuerySourceFull {
    /**
     * @param {boolean} implicit_order_rowid 
     */
    constructor(implicit_order_rowid = false) {
        super(implicit_order_rowid, 0);
        this.display_columns = reactive(/**@type {Map<string, DisplayColProps>} */ (new Map()));

        this.order_plugin  = reactive(/**@type {Map<string, number>} */ (new Map()));
        this.search_plugin = reactive(/**@type {Map<string, string>}  */ (new Map()));

        const order_plugin_array  = computed(/**@returns {[string, boolean, string][]} */ () => Array.from(this.order_plugin).map(x => [
            escape_backtick_smart(x[0]), 
            x[1] > 0, 
            this.display_columns.get(x[0])?.format === 'decimal' ? 'decimal' : ''
        ]));
        const search_plugin_array = computed(/**@returns {[string, [string, 'l']][]} */ () => Array.from(this.search_plugin).map(x => {
            const format = this.display_columns.get(x[0])?.format;
            const replace_comma = format === 'date' || format === 'datetime';
            const escaped = escape_backtick_smart(x[0]);
            /**@type {[string, [string, 'l']]} */
            const res = [
                format === 'date'     ? `strftime('%d.%m.%Y',${   escaped})` :
                format === 'datetime' ? `strftime('%d.%m.%Y %T',${escaped})` : escaped,
                [replace_comma ? x[1].replaceAll(',','.') : x[1], 'l']
            ];
            return res;
        }));

        this.query.add_order_plugin(order_plugin_array);
        this.query.add_where_plugin(search_plugin_array);

        this.columns_fixed = ref(false);
        this.columns_fixed_promise = deffered_promise();
    }

    start_plugin_watcher() {
        return watch([this.order_plugin, this.search_plugin], () => {
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
    static async window_resize_on_columns_fixed(srcs, window) {
        if(!window) return;
        await Promise.all(srcs.map(x => x.get_columns_fixed_promise()));
        window.box.resize_to_content().recenter();
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
     */
    set_search(column, value) {
        const name = column instanceof Column ? column.get_full_sql() : column;
        if(value === null || value === '') {
            this.search_plugin.delete(name);
        } else {
            this.search_plugin.set(name, value);
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
     */
    static create_default_select_handler(steps, handle_error, no_close = false) {
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
                if(succ && !no_close) close();
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









export {
    QueryViewerSource
}