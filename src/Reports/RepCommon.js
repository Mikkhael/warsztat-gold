//@ts-check

import { unref } from "vue";
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


export {
    RepQuerySourceSingle
}