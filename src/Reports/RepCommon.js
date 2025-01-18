//@ts-check

import { computed, unref } from "vue";
import { Column, DataGraphDependable, QuerySource } from "../components/Dataset";

/**
 * @typedef {import("../components/Dataset").StandardFormValueRoutineParams} StandardFormValueRoutineParams
 * @typedef {import("../components/Dataset").SQLValue} SQLValue
*/
/**
 * @template T
 * @typedef {import("../components/Dataset").MaybeRef<T>} MaybeRef<T>
 */

/**
 * @typedef {{
 *      allow_param_null?: boolean;
 *      param?:   import("../components/Dataset").MaybeDependable<SQLValue>;
 *      default?: import("../components/Dataset").MaybeDependable<SQLValue>;
 *      sql?: string;
 *      row_index?: number;
 *  }} RepValueRoutineParams
 */

class RepQuerySourceSingle extends QuerySource{
    constructor() {
        super(false);
        this.disable_deps();
        this.disable_offset();
        this.rep_columns_length = 0;
    }

    /**
     * @param {string} name 
     * @param {RepValueRoutineParams} params
     */
    auto_rep_value_impl(name, params = {}) {
        const ref_default = params.default instanceof DataGraphDependable ? params.default.get_ref() : params.default;
        const ref_param   = params.param   instanceof DataGraphDependable ? params.param.get_ref()   : params.param;
        const default_value = ref_default ?? ref_param ?? null;
        this.add_select(name, params.sql);
        if(params.param !== undefined) {
            this.add_where_eq(name, params.param, !params.allow_param_null);
        }
        const value = this.get_result_computed(this.rep_columns_length, params.row_index ?? 0, default_value);
        this.rep_columns_length += 1;
        return value;
    }

    /**
     * @param {Column | string} col 
     * @param {RepValueRoutineParams} params
     */
    auto_rep_value(col, params = {}) {
        const name = col instanceof Column ? col.get_full_sql() : col;
        return this.auto_rep_value_impl(name, params);
    }
}


class RepQuerySourceFull_LocalRow {

    /**
     * @param {RepQuerySourceFull} src 
     * @param {number} row_index
     */
    constructor(src, row_index) {
        this.src = src;
        this.row_index = row_index;
    }

    /**
     * @param {Column | string | number} column 
     */
    get(column) {
        const col_index = this.src.rep_lookup_col_index(column);
        const res = this.src.get_result_raw(col_index, this.row_index);
        if(res === undefined) {
            return unref(this.src.default_values[col_index]) ?? null;
        }
        return res;
    }
}
class RepQuerySourceFull extends QuerySource{
    constructor() {
        super(false);
        this.disable_deps();
        this.disable_offset();
        this.set_no_limit();
        this.rep_columns_length = 0;
        /**@type {MaybeRef<SQLValue>[]} */
        this.default_values = [];
        /**@type {Object.<string, number>} */
        this._rep_col_index_lookup = {};

        this.local_rows = computed(() => {
            const rows = this.full_result.value?.[0];
            if(!rows) return [];
            return rows.map((row, row_index) => new RepQuerySourceFull_LocalRow(this, row_index));
        });
    }

    
    /**
     * @param {Column | string | number} column 
     */
    rep_lookup_col_index(column) {
        if(typeof column === 'number' ) return column;
        const name = column instanceof Column ? column.get_full_sql() : column;
        const col_index = this._rep_col_index_lookup[name] ?? -1;
        return col_index;
    }

    /**
     * @param {Column | string | number} column 
     * @param {number} row_index 
     * @returns {import('vue').ComputedRef<SQLValue>}
     */
    get_rep(column, row_index) {
        const col_index = this.rep_lookup_col_index(column);
        const default_value = this.default_values[col_index] ?? null;
        const res = this.get_result_computed(col_index, row_index, default_value);
        return res;
    }

    /**
     * @param {string} name 
     * @param {RepValueRoutineParams} params
     */
    auto_rep_column_impl(name, params = {}) {
        const ref_default = params.default instanceof DataGraphDependable ? params.default.get_ref() : params.default;
        const ref_param   = params.param   instanceof DataGraphDependable ? params.param.get_ref()   : params.param;
        const default_value = ref_default ?? ref_param ?? null;
        this.add_select(name, params.sql);
        if(params.param !== undefined) {
            this.add_where_eq(name, params.param, !params.allow_param_null);
        }

        const col_index = this.rep_columns_length;
        this.rep_columns_length += 1;
        this._rep_col_index_lookup[name] = col_index
        this.default_values[col_index]   = default_value;
    }

    /**
     * @param {Column | string} col 
     * @param {RepValueRoutineParams} params
     */
    auto_rep_column(col, params = {}) {
        const name = col instanceof Column ? col.get_full_sql() : col;
        return this.auto_rep_column_impl(name, params);
    }
}



function strip_quotes(str, relaxed = false) {
    const res1 = str.replaceAll('"','');
    if(relaxed) return res1;
    return res1.replaceAll("'",'\'');
}

/**
 * @typedef {{
*      name:  string,
*      val:   string,
*      type?: "text" | "class_set" | "class_remove" | "battr_set" | "battr_unset",
*      dynamic?: boolean
*  }} PrintParamAction
*/

/**
 * @param {PrintParamAction} action 
 */
function get_action_handler(action) {
    const name = strip_quotes(action.name);
    const val = action.dynamic ? action.val : `'${strip_quotes(action.val)}'`;
    switch(action.type ?? 'text') {
        case "text":            return `set_text_by_name('${name}', ${val})`;
        case "class_set":       return `set_class_by_name('${name}', ${val}, 'set')`;
        case "class_remove":    return `set_class_by_name('${name}', ${val}, 'remove')`;
        case "battr_set":       return `set_battr_by_name('${name}', ${val}, 'set')`;
        case "battr_unset":     return `set_battr_by_name('${name}', ${val}, 'remove')`;
    }
    return '';
}

/**
 * @typedef {{
 *  name: string, 
 *  attrbs?: string,
 *  values?: ([display: string, val: string] | string)[],
 * }} PrintParamControlOptions
 */

/**
 * @param {string} label 
 * @param {PrintParamControlOptions} options 
 */
function create_print_param_input(label, options) {
    const attrbs = options.attrbs ?? '';

    const action = get_action_handler({name: options.name, val: 'this.value', dynamic: true});
    const html = `<div> ${label}: <input ${attrbs} oninput="${action}"/></div>`;
    return html;
}
/**
 * @param {string} label 
 * @param {PrintParamControlOptions} options 
 */
function create_print_param_select(label = '', options) {
    const attrbs = options.attrbs ?? '';
    const values = options.values?.map(x => Array.isArray(x) ?
        [x[0],                  strip_quotes(x[1], true)] :
        [strip_quotes(x, true), strip_quotes(x,    true)] ) ?? [];

    const values_str = values.map( x => `<option value="${x[1]}">${x[0]}</option>`).join('');
    const action = get_action_handler({name: options.name, val: 'this.value', dynamic: true});
    const html = `<div> ${label}: <select ${attrbs} onchange="${action}">${values_str}</select></div>`;
    return html;
}

/**
 * @typedef {{
 *  attrbs?: string,
 *  actions: PrintParamAction[],
* }} PrintParamButtonOptions
*/

/**
 * @param {string} label 
 * @param {PrintParamButtonOptions} options 
 */
function create_print_param_button(label, options) {
    const attrbs = options.attrbs ?? '';
    const actions = options.actions.map(get_action_handler).join(';');

    const html = `<input type="button" value="${strip_quotes(label,true)}" ${attrbs} onclick="${actions}"/>`;
    return html;
}

export {
    RepQuerySourceSingle,
    RepQuerySourceFull,
    create_print_param_input,
    create_print_param_select,
    create_print_param_button,
}