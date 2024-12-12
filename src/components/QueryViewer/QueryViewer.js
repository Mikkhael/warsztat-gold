//@ts-check

import { computed, reactive, ref, watch } from "vue";
import { FormQuerySourceFull, Column } from "../Dataset";
import { escape_backtick_smart } from "../../utils";

/**
 * @typedef {import("../Dataset/Form").StandardFormValueRoutineParams & {
 *  display?: string,
 *  readonly?: boolean,
 *  as_enum?: boolean,
 *  input_props?: import('vue').MaybeRef<Object.<string, any>>
 * }} StandardFormValueRoutineParams_WithDisplay
 */

/**
 * @typedef {{
 *  name: string,
 *  readonly: boolean,
 *  as_enum: boolean,
 *  input_props: import('vue').MaybeRef<Object.<string, any>>
 * }} DisplayColProps
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

        const order_plugin_array  = computed(/**@returns {[string, boolean][]} */ () => Array.from(this.order_plugin).map(x => [escape_backtick_smart(x[0]), x[1] > 0]));
        const search_plugin_array = computed(/**@returns {[[string, 'b'], [string, 'l']][]} */ () => Array.from(this.search_plugin).map(x => [[x[0], 'b'], [x[1], 'l']]));

        this.query.add_order_plugin(order_plugin_array);
        this.query.add_where_plugin(search_plugin_array);
    }


    start_plugin_watcher() {
        return watch([this.order_plugin, this.search_plugin], () => {
            this.request_offset_goto(0, false);
            this.mark_for_update();
        });
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
     * @param {string | Column} column_name 
     * @param {string} display_name 
     * @param {boolean} readonly
     * @param {boolean} as_enum
     * @param {import('vue').MaybeRef<Object.<string, any>>} input_props
     */
    add_display_column(column_name, display_name, readonly = true, input_props = {}, as_enum = false) {
        const name = column_name instanceof Column ? column_name.get_full_sql() : column_name;
        this.display_columns.set(name, {
            name: display_name,
            readonly,
            as_enum,
            input_props
        });
    }

    /**
     * @param {string} name 
     * @param {StandardFormValueRoutineParams_WithDisplay} params
     */
    auto_add_column_impl(name, params = {}) {
        if(params.display){
            this.add_display_column(name, params.display, params.readonly ?? !params.sync, params.input_props, params.as_enum);
        }
        super.auto_add_column_impl(name, params);
    }
    
    /**
     * Automatically get column name and wheather it is primary
     * @param {Column} col 
     * @param {StandardFormValueRoutineParams_WithDisplay} params
     */
    auto_add_column(col, params = {}) {
        super.auto_add_column(col, params);
    }
    /**
     * Automatically get column name and wheather it is primary, and generate appropiate sync
     * @param {Column} col 
     * @param {StandardFormValueRoutineParams_WithDisplay} params
     */
    auto_add_column_synced(col, params = {}) {
        super.auto_add_column_synced(col, params);
    }
}












export {
    QueryViewerSource
}