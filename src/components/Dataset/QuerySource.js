

//@ts-check
import { computed, ref, shallowRef } from "vue";
import { DataGraphDependable, DataGraphNodeBase } from "./DataGraph";
import ipc from "../../ipc";
import { Column, TableNode } from "./Database";
import { map_query_parts_params, QueryBuilder } from "./QueryBuilder";
import { escape_backtick_smart } from "../../utils";


/**
 * @template T
 * @typedef {import('vue').Ref<T>} Ref
 */
/**
 * @template T
 * @typedef {import('vue').ComputedRef<T>} ComputedRef
 */
/**
 * @template T
 * @typedef {T | Ref<T>} MaybeRef
 */

/**
 * @typedef {number | string | null} SQLValue 
 */
/**
 * @template [T=SQLValue]
 * @typedef {import('./DataGraph').MaybeDependable<T>} MaybeDependable
 */



function clump(val, past_max) {
    if(val >= past_max) val = past_max - 1;
    if(val <  0)        val = 0;
    return val;
}
function wrap(val, past_max) {
    if(val < 0) val = past_max - val - 1;
    return clump(val, past_max); 
}

class QuerySourceRequest_Offset_Goto {
    constructor(value = 0, wrapping = false) {this.value = value, this.wrapping = wrapping};
}
class QuerySourceRequest_Offset_Rownum {
    constructor(value = 0, colname = 'rowid') {this.value = value, this.colname = colname};
}
class QuerySourceRequest_Refresh {
    constructor() {};
}

class QuerySource extends DataGraphNodeBase {
    constructor(implicit_order_rowid = true) {
        super();
        /**@type {TableNode[]} */
        this.dependant_tables = [];
        this.query = new QueryBuilder(implicit_order_rowid);

        /**@type {any} */
        this.request = null;
        this.offset = this.query.offset;
        this.offset_disabled = false;

        this.count = ref(0);
        this.count_expired = ref(true);


        /**@type {import("vue").ShallowRef<import("../../ipc").IPCQueryResult?>} */
        this.full_result = shallowRef(null);

        this.is_empty = computed(() => this.count.value <= 0);
    }

    /// OVERWRITES //////////////////////
    expire(expire_count = true) {
        if(expire_count) this.count_expired.value = true;
        super.expire();
    }
    check_expired_impl() {
        return this.query.is_expired();
    }
    check_should_disable_dists_impl() {
        return this.is_empty.value;
    }

    async update__count_impl() {
        if(this.count_expired.value || this.query._expired_count.value) {
            await this.perform_count_query();
            this.count_expired.value = false;
        }
    }
    async update__request_impl() {
        if(this.request instanceof QuerySourceRequest_Offset_Goto) {
            this.perform_offset_goto(this.request.value, this.request.wrapping);
        }
        if(this.request instanceof QuerySourceRequest_Offset_Rownum) {
            await this.perform_offset_rownum(this.request.value, this.request.colname);
        }
        // QuerySourceRequest_Refresh is NOOP
        this.request_clear();
    }
    async update__main_impl() {
        await this.perform_offset_query();
    }
    async update_impl(){
        await this.update__count_impl();
        await this.update__request_impl();
        await this.update__main_impl();
        this.query.acknowledge_expried();
    }
    ///////////////////////////////////////

    disable_offset() {
        this.offset.value = 0;
        this.offset_disabled = true;
    }

    perform_offset_goto(value = 0, wrapping = false) {
        if(wrapping) this.offset.value = wrap (value, this.count.value);
        else         this.offset.value = clump(value, this.count.value);
    }

    async perform_offset_rownum(/**@type {number}*/ value, colname = 'rowid') {
        const [rows] = await ipc.db_query(this.query.get_rownumber_select_sql(value, colname));
        const rownum = rows[0]?.[0];
        console.log('ROWNUM', rownum, rows, value, colname);
        if(typeof rownum === 'number' && rownum > 0 ) {
            this.perform_offset_goto(rownum - 1, false);
        } else {
            throw new Error("Nie znaleziono wiersza odpowiadającemu indeksowi: " + value);
        }
    }

    async perform_count_query() {
        if(this.offset_disabled) return;
        const [rows] = await ipc.db_query(this.query.full_sql_count.value);
        if(rows.length === 0) this.count.value = -1;
        else                  this.count.value = rows[0][0];
        this.offset.value = clump(this.offset.value, this.count.value);
    }

    async perform_offset_query() {
        const result = await ipc.db_query(
            this.offset_disabled ?
                this.query.full_sql_base.value :
                this.query.full_sql_offset.value
        );
        if(result[0].length === 0) {
            this.count.value = 0;
            this.full_result.value = null;
            return null;
        }
        this.full_result.value = result;
        return result;
    }

    _add_update_request_impl(request, expire_count = true) {
        if(this.disabled.value) {
            return;
        }
        this.request = request;
        this.expire(expire_count);
    }
    /**
     * @param {number} value 
     * @param {boolean} wrapping 
     */
    request_offset_goto(value, wrapping) {
        this._add_update_request_impl(new QuerySourceRequest_Offset_Goto(value, wrapping), false);
    }
    /**
     * @param {number} value  
     */
    request_offset_rownum(value, colname = 'rowid') {
        this._add_update_request_impl(new QuerySourceRequest_Offset_Rownum(value, colname), false);
    }
    request_refresh() {
        this._add_update_request_impl(new QuerySourceRequest_Refresh(), true);
    }
    request_clear(){
        this.request = null;
    }

    /**
     * @param {TableNode} tableNode 
     */
    add_table_dep(tableNode) {
        if(this.dependant_tables.indexOf(tableNode) !== -1) return;
        this.dependant_tables.push(tableNode);
        this.add_dep(tableNode);
    }

    /**
     * @param {string}   name 
     * @param {string=}  sql_definition 
     */
    add_select(name, sql_definition = undefined) {
        this.query.add_select(name, sql_definition);
    }

    /**
     * @param {(string | TableNode | Column )[]} parts
     */
    set_from_with_deps(...parts) {
        const string_parts = parts.map(part => {
            if(part instanceof TableNode) {
                this.add_table_dep(part);
                return part.get_full_sql();
            } else if(part instanceof Column) {
                this.add_table_dep(part.tab);
                return part.get_full_sql();
            }
            return part;
        });
        const from = string_parts.join('');
        this.query.from.value = from;
    }

    /**
     * @param {Column} col_main 
     * @param {Column} col_joined 
     */
    add_join(col_main, col_joined) {
        this.add_table_dep(col_main.tab);
        this.add_table_dep(col_joined.tab);
        const sql = ` JOIN ${col_joined.tab.get_full_sql()} ON ${col_joined.get_full_sql()}=${col_main.get_full_sql()}`;
        this.query.from.value += sql;
    }

    /**
     * @param {string} field 
     * @param {MaybeDependable} value 
     */
    add_where_eq(field, value, optional = false) {
        this.expire();
        const ref = this.add_dependable(value);
        this.query.add_where_eq(field, ref, optional);
    }

    /**@typedef {import("./QueryBuilder").QueryParts<DataGraphDependable<SQLValue>>} QueryPartsDependable */

    /**
     * @param {boolean} optional
     * @param {QueryPartsDependable} parts 
     */
    #add_where_impl(optional, ...parts){
        this.expire();
        const _parts = map_query_parts_params(parts, (param => this.add_dependable(param)));
        this.query.add_where(_parts, optional);
    }
    
    /**
     * @param  {QueryPartsDependable} parts 
     */
    add_where(...parts) {
        this.#add_where_impl(false, ...parts);
    }
    /**
     * @param  {QueryPartsDependable} parts 
     */
    add_where_opt(...parts) {
        this.#add_where_impl(true, ...parts);
    }
}


export {
    QuerySource,
    QueryBuilder,
}
