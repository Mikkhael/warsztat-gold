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


export {
    RepQuerySourceSingle,
    RepQuerySourceFull
}