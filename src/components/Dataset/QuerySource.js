

//@ts-check
import { computed, unref, ref, isRef, registerRuntimeCompiler } from "vue";
import { escape_backtick_smart, escape_sql_value, iterate_query_result_values, iterate_query_result_values_single_row } from "../../utils";
import { AdvDependableRef, DataGraphNodeBase, DataGraphNodeFromRef } from "./DataGraph";
import { configDir } from "@tauri-apps/api/path";
import ipc from "../../ipc";
import { TableNode } from "./Database";
import { FormDataSet } from "./Form";


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
 * @typedef {import('./DataGraph').Dependable<T>} Dependable
 */


/*
//////////////////////
      HOW TO USE
//////////////////////


const src = new QuerySource();

src.add_select(...);
src.add_from(...);

// Automatic DataGraph dependencies
const r1 = ref(123);
const src2 = new QuerySource();
src.add_where_eq('field1', r1);
src.add_where_eq('field2', src2.cache.label2); // extends Dependable






onUnmounted(() => {
    src.disconnect();    
})

*/


class QueryBuilderSelectField {
    /**
     * @param {string } name 
     * @param {string?} sql_definition 
     */
    constructor(name, sql_definition = null) {
        this.name = name;
        this.sql_definition = sql_definition;
        
        this.sql = sql_definition ? (sql_definition + ' AS ' + escape_sql_value(name))
                                  : escape_backtick_smart(name);
    }
}
class QueryBuilderWhereEq {
    /**
     * @param {string}   name 
     * @param {MaybeRef<SQLValue>} value 
     */
    constructor(name, value, optional = true) {
        this.name     = name;
        this.value    = value;
        this.optional = optional;
        
        this.sql = computed(() => this.get_sql());
    }

    get_sql(){
        return escape_backtick_smart(this.name) + ' = ' + escape_sql_value(unref(this.value));
    }
}

class QueryBuilderOrder {
    /**
     * @param {string} name 
     */
    constructor(name, is_ascending = true) {
        this.name = name;
        this.is_ascending = is_ascending;

        this.sql = this.name + ' ' + (this.is_ascending ? 'ASC' : `DESC`);
    }
}

function concat_query_section(name, sql){
    return (sql && sql.length > 0) ? ' ' + name + ' ' + sql : "";
}
/**
 * @param {Object.<string, string>} sections 
 */
function concat_query(sections) {
    return  concat_query_section('SELECT',   sections.select) +
            concat_query_section('FROM',     sections.from) +
            concat_query_section('WHERE',    sections.where) +
            concat_query_section('ORDER BY', sections.order) +
            concat_query_section('LIMIT',    sections.limit) +
            concat_query_section('OFFSET',   sections.offset);
}

class QueryBuilder {
    constructor(auto_rowid_order = true) {
        /**@type {QueryBuilderSelectField[]} */
        this.select = [];
        this.from   = "";
        /**@type {QueryBuilderWhereEq[]} */
        this.where_eq = [];
        /**@type {QueryBuilderOrder[]} */
        this.order = [];
        if(auto_rowid_order){
            this.order.push(new QueryBuilderOrder('rowid'));
        }

        /**@type {MaybeRef<number>} */
        this.offset = -1;

        this.expired = ref(false);
        this.sql = computed(() => {this.expired.value = false; return this.build_sql()});
    }

    expire() {
        this.expired.value = true;
    }

    build_sql() {
        const res = {};
        /**@type {(...conditions: QueryBuilderWhereEq[]) => string} */
        const convert_where_eq_to_sql = (...conditions) => {
            return conditions.flat()
                    .filter(x => !x.optional || unref(x.value) !== null)
                    .map(x => '(' + unref(x.sql) + ')').join(' AND ');
        }
        
        const sql_select_base   = this.select.map(x => x.sql).join(', ');
        const sql_from  = this.from;
        const sql_where_base  = convert_where_eq_to_sql(...this.where_eq);
        const sql_order = this.order.map(x => x.sql).join(', ');

        const offset = unref(this.offset);
        const sql_offset = offset >= 0 ? offset.toString() : "";

        res.base = concat_query({
            select: sql_select_base, 
            from: sql_from,
            where: sql_where_base,
            order: sql_order});
        res.count = concat_query({
            select: `count(*)`, 
            from: sql_from, 
            where: sql_where_base});
        res.offset = concat_query({
            select: sql_select_base, 
            from: sql_from,
            where: sql_where_base,
            order: sql_order,
            limit: '1',
            offset: sql_offset});
        
        return res;
    }

    /**
     * @param {string } name 
     * @param {string?} sql_definition 
     */
    add_select(name, sql_definition = null) {
        this.select.push(new QueryBuilderSelectField(name, sql_definition));
        this.expire();
    }

    /**
     * @param {string} sql 
     */
    add_from(sql) {
        this.from += sql;
        this.expire();
    }

    /**
     * @param {string} field 
     * @param {MaybeRef<SQLValue>} value 
     */
    add_where_eq(field, value, optional = false) {
        this.where_eq.push(new QueryBuilderWhereEq(field, value, optional));
        this.expire();
    }

    /**
     * @param {MaybeRef<number>} ref 
     */
    set_offset_ref(ref) {
        this.offset = ref;
        this.expire();
    }
}

function clump(val, past_max) {
    if(val >= past_max) val = past_max - 1;
    if(val <  0)        val = 0;
    return val;
}
function wrap(val, past_max) {
    if(val < 0) val = past_max - val - 1;
    return clump(val, past_max); 
}

/**
 * @extends {AdvDependableRef<SQLValue>}
 */
class QuerySourceCachedValue extends AdvDependableRef {
    /**
     * @param {QuerySource} src 
     * @param {SQLValue}    default_value
     */
    constructor(src, default_value = null) {
        super(src, default_value);
        this.src = src;
        this.default_value = default_value;
    }

    reset() {
        this.ref.value = this.default_value;
    }
}

class QuerySourceRequest_Offset {
    constructor(value = 0, wrapping = false) {this.value = value, this.wrapping = wrapping};
}
class QuerySourceRequest_Insert {
    constructor(value = false) {this.value = value};
}

class QuerySource extends DataGraphNodeBase {
    constructor(auto_rowid_order = true, no_dataset = false, with_full_result = false) {
        super();
        /**@type {TableNode[]} */
        this.dependant_tables = [];
        this.query = new QueryBuilder(auto_rowid_order);

        /**@type {any} */
        this.request = null;
        this.insert_mode = ref(false);
        this.offset = ref(0);

        this.count = ref(0);
        this.count_expired = ref(true);


        this.query.set_offset_ref(this.offset);

        /**@type {string[]} */
        this.result_names = [];
        /**@type {Object.<string, QuerySourceCachedValue>} */
        this.result = {};

        if(!no_dataset) {
            this.dataset = new FormDataSet(this);
        }

        if(with_full_result) {
            /**@type {Ref<SQLValue[][]>} */
            this.full_result = ref([]); // TODO implement
        }

        this.is_empty = computed(() => this.count.value <= 0);
    }

    /// OVERWRITES //////////////////////
    expire(expire_count = true) {
        if(expire_count) this.count_expired.value = true;
        super.expire();
    }
    check_changed_impl() {
        return this.dataset?.changed.value || this.insert_mode.value;
    }
    check_should_disable_dists_impl() {
        return this.is_empty.value || this.insert_mode.value;
    }
    async update_impl(){
        if(this.count_expired.value) {
            await this.perform_count_query();
            this.count_expired.value = false;
        }
        if(this.request !== null) {
            if      (this.request instanceof QuerySourceRequest_Offset) {
                this.perform_offset_goto(this.request.value, this.request.wrapping);
                this.insert_mode.value = false;
            }else if(this.request instanceof QuerySourceRequest_Insert) {
                this.insert_mode.value = this.request.value;
            }
            this.request_clear();
        }
        if(this.insert_mode.value) {
            this.perform_reset();
            return;
        }
        await this.perform_offset_query();
    }
    async save_impl(force = false) {
        if(!this.dataset) return;
        const res = await this.dataset.perform_save_notransaction(undefined, force);
        if(res.insert) {
            this.request_offset_goto(-1, true);
        }
    }
    ///////////////////////////////////////

    perform_reset() {
        for(const key in this.result) {
            this.result[key].reset();
        }
        this.dataset?.refresh();
    }

    perform_offset_goto(value = 0, wrapping = false) {
        if(wrapping) this.offset.value = wrap (value, this.count.value);
        else         this.offset.value = clump(value, this.count.value);
    }

    async perform_count_query() {
        const [rows] = await ipc.db_query(this.query.sql.value.count);
        if(rows.length === 0) this.count.value = -1;
        else                  this.count.value = rows[0][0];
        this.offset.value = clump(this.offset.value, this.count.value);
    }

    async perform_offset_query() {
        const [rows] = await ipc.db_query(this.query.sql.value.offset);
        if(rows.length === 0) {
            this.count.value = 0;
            this.perform_reset();
            return;
        }
        const first_row = rows[0];
        for(let i in first_row) {
            this.result[this.result_names[i]].ref.value = first_row[i];
        }
        this.dataset?.refresh();
    }

    #add_update_request_impl(request, expire_count = true) {
        this.request = request;
        this.expire(expire_count);
    }
    /**
     * @param {number} value 
     * @param {boolean} wrapping 
     */
    request_offset_goto(value, wrapping) {
        this.#add_update_request_impl(new QuerySourceRequest_Offset(value, wrapping), false);
    }
    /**
     * @param {boolean} value 
     */
    request_insert_mode(value) {
        this.#add_update_request_impl(new QuerySourceRequest_Insert(value), false);
    }
    request_refresh() {
        this.#add_update_request_impl(new QuerySourceRequest_Insert(false), true);
    }
    request_insert_toggle() {
        this.#add_update_request_impl(new QuerySourceRequest_Insert(!this.insert_mode.value), false);
    }
    request_clear(){
        this.request = null;
    }

    /**
     * @param {TableNode} tableNode 
     */
    add_table_dep(tableNode) {
        this.dependant_tables.push(tableNode);
        this.add_dep(tableNode);
    }

    /**
     * @param {string}   name 
     * @param {SQLValue} default_value
     * @param {string?}  sql_definition 
     */
    add_select(name, default_value = null, sql_definition = null) {
        this.expire();
        this.query.add_select(name, sql_definition);
        this.result_names.push(name);
        const cached = new QuerySourceCachedValue(this, default_value);
        this.result[name] = cached;
        this.dataset?.add(name, cached);
    }

    /**
     * 
     * @param {[string, SQLValue | undefined, string | undefined][]} names 
     */
    add_select_auto(names) {
        for(const [name, default_value, sql_def] of names) {
            this.add_select(name, default_value, sql_def);
        }
    }

    /**
     * @param {string} sql 
     */
    add_from(sql) {
        this.expire();
        this.query.add_from(sql);
    }

    /**
     * @param {string} field 
     * @param {Dependable} value 
     */
    add_where_eq(field, value, optional = false) {
        this.expire();
        const ref = this.add_dependable_or_ref(value);
        this.query.add_where_eq(field, ref, optional);
    }
}


export {
    QuerySource,
    QueryBuilder,
    QuerySourceCachedValue
}
