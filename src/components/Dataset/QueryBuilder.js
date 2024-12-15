

//@ts-check
import { computed, unref, shallowRef, triggerRef } from "vue";
import { escape_backtick_smart, escape_like_full, escape_sql_value, reasRef } from "../../utils";
import { Column } from "./Database";


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

/**@typedef {[string] | [string, string]} QuerySelectField */
/**@param {QuerySelectField} select_field */
function select_field_definition_to_sql(select_field) {
    if(select_field.length === 1) {
        return escape_backtick_smart(select_field[0]);
    } else if (select_field[0] === '') {
        return select_field[1];
    } else {
        return select_field[1] + ' AS ' + escape_sql_value(select_field[0]);
    }
}

/**
 * @template [T=never]
 * @typedef {(string | [MaybeRef<SQLValue> | T] | [string, 'l'] | [string, 'b'])[]} QueryParts 
 * */

/**
 * @template [T=SQLValue]
 * @param {QueryParts<T>} parts 
 * @returns {QueryParts<T>}
 * */
function qparts(...parts) {
    return parts;
}
/**
 * @template T
 * @param {QueryParts<T>} parts 
 * @param {(param: MaybeRef<SQLValue> | T) => MaybeRef<SQLValue>} callback 
 * @returns {QueryParts}
 */
function map_query_parts_params(parts, callback) {
    return parts.map(part => {
        if(!(part instanceof Array)) return part;
        if(part.length === 1) {
            return [callback(part[0])];
        }
        return part;
    });
}
/**@param {QueryParts} parts  */
function query_parts_to_string(parts) {
    return parts.map(part => {
        if(typeof part === 'string') return part;
        if(part instanceof Array) {
            if(part.length === 1) return escape_sql_value(unref(part[0]));
            if(part[1] === 'l')   return escape_like_full(part[0]);
            if(part[1] === 'b')   return escape_backtick_smart(part[0]);
        }
        throw new Error('INVALID QUERY PART');
    }).join(' ');
}
/**@param {QueryParts} parts */
function query_parts_is_not_null(parts) {
    return !parts.some(part => part instanceof Array && unref(part[0]) === null);
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

        this.select_fields = reasRef(/**@type {QuerySelectField[]} */ ([]));
        this._sql_select_fields = computed(() => 
            this.select_fields.value
            .map(select_field_definition_to_sql)
            .join(', ')
        );
        this._sql_select_fields_part_custom_only = computed(() => 
            this.select_fields.value
            .filter(x => x.length === 2)
            .map(select_field_definition_to_sql)
            .join(', ')
        );
        this._sql_select_fields_part_custom_only_app = computed(() => 
            this._sql_select_fields_part_custom_only.value ?
            ', ' + this._sql_select_fields_part_custom_only.value :
            ''
        );

        this.from = reasRef("");
        this._sql_from = this.from;

        this.plugin_where_conj = shallowRef(/**@type {MaybeRef<QueryParts[]>[]} */ ([]));
        this.where_conj     = reasRef(/**@type {QueryParts[]} */ ([]));
        this.where_conj_opt = reasRef(/**@type {QueryParts[]} */ ([]));
        this._sql_where = computed(() => {
            const all_parts = [
                ...this.where_conj.value,
                ...this.where_conj_opt.value.filter(query_parts_is_not_null),
                ...this.plugin_where_conj.value.map(unref).flat()
            ];
            return all_parts
                .map(query_parts_to_string)
                .map(x => '(' + x + ')')
                .join(' AND ');
        });

        this.plugin_orders = shallowRef(/**@type {MaybeRef<QueryOrdering[]>[]} */ ([]));
        this.order = reasRef(/**@type {QueryOrdering[]} */ ([]));
        this._sql_order  = computed(() => [
                ...this.order.value, 
                ...this.plugin_orders.value.map(unref).flat()
            ].map(query_ordering_to_string).join(','));

        this.limit = reasRef(1);
        this._sql_limit  = computed(() => this.limit.value < 0 ? '' : this.limit.value.toString());
        
        this.offset = reasRef(-1);
        this._sql_offset = computed(() => this.limit.value < 0 ? '' : this.offset.value.toString());

        if(implicit_order_roiwd) {
            this.order.value = [['rowid']];
        }

        this._sections1 = computed(() => {
            return {
                select: this._sql_select_fields.value, 
                from:   this._sql_from.value,
                where:  this._sql_where.value,
            };
        });
        this._sections2 = computed(() => {
            return {
                order:  this._sql_order.value,
                limit:  this._sql_limit.value,
                offset: this._sql_offset.value,
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

        this._expired_count = computed(() => {
            return this._last_sections.value.select !== this._sections1.value.select  ||
                   this._last_sections.value.from   !== this._sections1.value.from    ||
                   this._last_sections.value.where  !== this._sections1.value.where;
        });
        this._expired = computed(() => {
            return this._expired_count.value  ||
                   this._last_sections.value.order  !== this._sections2.value.order   ||
                   this._last_sections.value.limit  !== this._sections2.value.limit   ||
                   this._last_sections.value.offset !== this._sections2.value.offset;
        });

        this.full_sql_base = computed(() => concat_query({
            select: this._sections1.value.select, 
            from:   this._sections1.value.from, 
            where:  this._sections1.value.where, 
            order:  this._sections2.value.order, 
            limit:  this._sections2.value.limit, 
        }));

        this.full_sql_for_rownumber_window = computed(() => concat_query({
            order:  this._sections2.value.order,
        }))
        this.full_sql_for_rownumber_main = computed(() => concat_query({
            from:   this._sections1.value.from, 
            where:  this._sections1.value.where,
        }));
                
        this.full_sql_count = computed(() => concat_query({
            select: 'count(*)' + this._sql_select_fields_part_custom_only_app.value,
            from:   this._sections1.value.from, 
            where:  this._sections1.value.where, 
        }));
        
        this.full_sql_offset = computed(() => concat_query({
            select: this._sections1.value.select, 
            from:   this._sections1.value.from, 
            where:  this._sections1.value.where, 
            order:  this._sections2.value.order, 
            limit:  this._sections2.value.limit, 
            offset: this._sections2.value.offset, 
        }));
    }

    /**
     * @param {SQLValue} value 
     */
    get_rownumber_select_sql(value, colname = 'rowid') {
        const _name    = escape_backtick_smart(colname);
        const _value   = escape_sql_value(value);
        const sql_window = this.full_sql_for_rownumber_window.value;
        const sql_main   = this.full_sql_for_rownumber_main.value;
        const sql_res = `SELECT n FROM (SELECT row_number() OVER (${sql_window}) AS n, ${_name} AS i ${sql_main}) WHERE i=${_value} LIMIT 1`;
        return sql_res;
    }

    /**
     * @param {Column | string} column 
     * @param {string=} sql_definition 
     */
    add_select(column, sql_definition) {
        const name = column instanceof Column ? column.get_full_sql() : column;
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
        const parts = qparts([name,'b'],'=',[value]);
        this.add_where(parts, optional);
    }
    
    /**
     * @param {QueryParts} parts
     */
    add_where(parts, optional = false) {
        if(optional) {
            this.where_conj_opt.value.push(parts);
        } else {
            this.where_conj.value.push(parts);
        }
    }

    add_order_plugin(/**@type {MaybeRef<QueryOrdering[]>} */ orders) {
        this.plugin_orders.value.push(orders);
        triggerRef(this.plugin_orders);
    }

    add_where_plugin(/**@type {MaybeRef<QueryParts[]>} */ parts) {
        this.plugin_where_conj.value.push(parts);
        triggerRef(this.plugin_where_conj);
    }


    is_expired() {
        return this._expired.value;
    }
    is_expired_count() {
        return this._expired_count.value;
    }

    acknowledge_expried() {
        // console.log('ACK', this.is_expired(), this._sections.value, this._last_sections.value);
        this._last_sections.value = {...this._sections1.value, ...this._sections2.value};
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
    map_query_parts_params,
    qparts,
    query_ordering_to_string,
    query_parts_is_not_null,
    query_parts_to_string,
    concat_query,
    concat_query_section,
}