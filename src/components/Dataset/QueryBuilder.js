

//@ts-check
import { computed, unref, ref, isRef, registerRuntimeCompiler, shallowRef, triggerRef } from "vue";
import { escape_backtick_smart, escape_sql_value, iterate_query_result_values, iterate_query_result_values_single_row, reasRef } from "../../utils";
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


/**@typedef {[string] | [string, string]} QueryBuilderSelectField */
/**@param {QueryBuilderSelectField} select_field */
function select_field_definition_to_sql(select_field) {
    if(select_field.length === 1) {
        return escape_backtick_smart(select_field[0]);
    } else {
        return select_field[1] + ' AS ' + escape_sql_value(select_field[0]);
    }
}

/**@typedef {MaybeRef<SQLValue>[]} QueryParts */
/**@param {QueryParts} parts  */
function query_parts_to_string(parts) {
    return parts.map(part => 
        typeof part === 'string' ? part : escape_sql_value(unref(part))
    ).join(' ');
}
/**@param {QueryParts} parts */
function query_parts_is_not_null(parts) {
    return !parts.some(part => unref(part) === null);
}


/**@typedef {[string] | [string, boolean]} QueryOrdering */
/**@param {QueryOrdering} ordering */
function query_ordering_to_string(ordering) {
    if(ordering.length === 1) {
        return escape_backtick_smart(ordering[0]);
    } else {
        return escape_backtick_smart(ordering[0]) + (ordering[1] ? ' ASC' : ' DESC');
    }
}


class QueryBuilder {
    constructor(implicit_order_roiwd = false) {

        this.select_fields = reasRef(/**@type {QueryBuilderSelectField[]} */ ([]));
        this.select_fields_sql = computed(() => 
            this.select_fields.value
            .map(select_field_definition_to_sql)
            .join(', ')
        );

        this.from = reasRef("");
        this.from_sql = this.from;

        this.where_conj     = reasRef(/**@type {QueryParts[]} */ ([]));
        this.where_conj_opt = reasRef(/**@type {QueryParts[]} */ ([]));
        this.where_sql = computed(() => {
            const all_parts = [
                ...this.where_conj.value,
                ...this.where_conj_opt.value.filter(query_parts_is_not_null)
            ];
            return all_parts
                .map(query_parts_to_string)
                .map(x => '(' + x + ')')
                .join(' AND ');
        });

        this.order = reasRef(/**@type {QueryOrdering[]} */ ([]));
        this.order_sql  = computed(() => this.order.value.map(query_ordering_to_string).join(','));

        this.limit = reasRef(1);
        this.offset_sql = computed(() => this.offset.value.toString());

        this.offset = reasRef(-1);
        this.limit_sql  = computed(() => this.limit.value.toString());

        if(implicit_order_roiwd) {
            this.order.value = [['rowid']];
        }

        this._sections = computed(() => {
            // debugger;
            return {
                select: this.select_fields_sql.value, 
                from:   this.from_sql.value,
                where:  this.where_sql.value,
                order:  this.order_sql.value,
                limit:  this.limit_sql.value,
                offset: this.offset_sql.value,
            };
        });

        this._last_sections = shallowRef({
            select: "",
            from:   "",
            where:  "",
            order:  "",
            limit:  "",
            offset: "",
        });

        this._expired = computed(() => {
            return this._last_sections.value.select !== this._sections.value.select  ||
                   this._last_sections.value.from   !== this._sections.value.from    ||
                   this._last_sections.value.where  !== this._sections.value.where   ||
                   this._last_sections.value.order  !== this._sections.value.order   ||
                   this._last_sections.value.limit  !== this._sections.value.limit   ||
                   this._last_sections.value.offset !== this._sections.value.offset;
        });

        this.full_sql_base = computed(() => concat_query({
            select: this._sections.value.select, 
            from:   this._sections.value.from, 
            where:  this._sections.value.where, 
            order:  this._sections.value.order, 
            limit:  this._sections.value.limit, 
        }));
                
        this.full_sql_count = computed(() => concat_query({
            select: 'count(*)',
            from:   this._sections.value.from, 
            where:  this._sections.value.where, 
        }));
        
        this.full_sql_offset = computed(() => concat_query({
            select: this._sections.value.select, 
            from:   this._sections.value.from, 
            where:  this._sections.value.where, 
            order:  this._sections.value.order, 
            limit:  this._sections.value.limit, 
            offset: this._sections.value.offset, 
        }));
    }

    /**
     * @param {string } name 
     * @param {string=} sql_definition 
     */
    add_select(name, sql_definition) {
        if(sql_definition === undefined) {
            this.select_fields.value.push([name]);
        } else {
            this.select_fields.value.push([name, sql_definition]);
        }
    }
    /**
     * @param {string} name 
     * @param {MaybeRef<SQLValue>} value
     */
    add_where_eq(name, value, optional = false) {
        const parts = [escape_backtick_smart(name) + '=', value];
        this.add_where(parts, optional);
    }
    
    /**
     * @param {MaybeRef<SQLValue>[]} parts
     */
    add_where(parts, optional = false) {
        if(optional) {
            this.where_conj_opt.value.push(parts);
        } else {
            this.where_conj.value.push(parts);
        }
    }

    is_expired() {
        return this._expired.value;
    }

    acknowledge_expried() {
        console.log('ACK', this.is_expired(), this._sections.value, this._last_sections.value);
        this._last_sections.value = this._sections.value;
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

export {
    QueryBuilder,
    query_ordering_to_string,
    query_parts_is_not_null,
    query_parts_to_string,
    concat_query,
    concat_query_section
}