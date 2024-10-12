

//@ts-check
import { computed, unref, ref, isRef, registerRuntimeCompiler } from "vue";
import { escape_backtick_smart, escape_sql_value, iterate_query_result_values, iterate_query_result_values_single_row } from "../../utils";
import { AdvDependableRef, DataGraphNodeBase, DataGraphNodeFromRef } from "./DataGraph";
import { configDir } from "@tauri-apps/api/path";
import ipc from "../../ipc";
import { TableNode } from "./Database";


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

class OffsetScrollerController {
    /**
     * @param {QuerySource} src 
     */
    constructor(src) {
        this.src = src;

        /**@type {[boolean, number]?} */
        this.request = null;
    }

    update_offset() {
        if(this.request === null) return;
        if(this.request[0]) {
            this.src.offset.value =  wrap(this.request[1], this.src.count.value);
        } else {
            this.src.offset.value = clump(this.request[1], this.src.count.value);
        }
        this.request = null;
    }

    goto(value, wrapping = false) {
        this.src?.expire(false);
        this.request = [wrapping, value];
    }
    goto_wrap(value) {
        this.src?.expire(false);
        this.request = [true, value];
    }
    goto_first() {
        this.src?.expire(false);
        this.request = [false, 0];
    }
    goto_last() {
        this.src?.expire(false);
        this.request = [true, -1];
    }
}

/**
 * @extends {AdvDependableRef<SQLValue>}
 */
class QuerySourceCachedValue extends AdvDependableRef {
    /**
     * @param {QuerySource} src 
     */
    constructor(src) {
        super(src);
        this.src = src;
    }
}

class QuerySource extends DataGraphNodeBase {
    constructor(auto_rowid_order = true) {
        super();
        /**@type {TableNode[]} */
        this.dependant_tables = [];
        this.query = new QueryBuilder(auto_rowid_order);

        this.offset = ref(0);
        this.offset_scroller = new OffsetScrollerController(this);

        this.count = ref(-1);
        this.count_expired = true;

        this.query.set_offset_ref(this.offset);

        /**@type {string[]} */
        this.result_names = [];
        /**@type {Object.<string, QuerySourceCachedValue>} */
        this.result = {};

        this.is_empty = computed(() => this.count.value <= 0);
    }

    expire(expire_count = true) {
        if(expire_count) this.count_expired = true;
        super.expire();
    }
    check_changed_impl() {return false;}
    check_expired_impl() {return false;}
    async update_impl(){
        if(this.count_expired) {
            await this.perform_count_query();
            this.count_expired = false;
        }
        this.offset_scroller.update_offset();
        await this.perform_offset_query();
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
            return;
        }
        const first_row = rows[0];
        for(let i in first_row) {
            this.result[this.result_names[i]].ref.value = first_row[i];
        }
    }

    /**
     * @param {number} value 
     * @param {boolean} wrapping 
     */
    async goto_and_update_unchanged(value, wrapping = false) {
        if(!await this.assure_unchanged_or_confirm()) return false;
        this.offset_scroller.goto(value, wrapping);
        await this.update_complete();
        return true;
    }

    /**
     * @param {TableNode} tableNode 
     */
    add_table_dep(tableNode) {
        this.dependant_tables.push(tableNode);
        this.add_dep(tableNode);
    }

    /**
     * @param {string } name 
     * @param {string?} sql_definition 
     */
    add_select(name, sql_definition = null) {
        this.expire();
        this.query.add_select(name, sql_definition);
        this.result_names.push(name);
        this.result[name] = new QuerySourceCachedValue(this);
    }

    /**
     * 
     * @param {string[][]} names 
     */
    add_select_auto(names) {
        for(const [name, sql_def] of names) {
            this.add_select(name, sql_def);
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
