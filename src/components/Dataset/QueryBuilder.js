

//@ts-check
import { computed, unref, shallowRef, triggerRef, isRef, isReactive } from "vue";
import { escape_backtick_smart, escape_like_full, escape_sql_value, escape_ulower_like_full, is_sql_value, reasRef, reasShallowRef } from "../../utils";
import { Column, TableNode } from "./Database";

import "./types";
import { DataGraphDependable, DataGraphNodeBase } from "./DataGraph";


/////////////////////////////////////////////////////// QUERY PARTS //////////////////////////////////////////////////////////////////

class QP {

    // /**@enum {QP.Type[keyof QP.Type]} */
    static Type = Object.freeze({
        RawString: 0,
        Backtick: 1,
        SQLValue: 2,
        SQLNode: 3,
        Like: 4,
        LikeBuiltin: 5,
    });
    /**@typedef {QP.Type[keyof QP.Type]} QPType*/

    /**
     * @template {QPType} T
     * @typedef {T extends typeof QP.Type.RawString   ? MaybeRef<Stringable> : 
     *           T extends typeof QP.Type.Backtick    ? MaybeRef<Stringable> : 
     *           T extends typeof QP.Type.SQLValue    ? MaybeRef<SQLValue> : 
     *           T extends typeof QP.Type.SQLNode     ? MaybeRef<TableNode | Column> : 
     *           T extends typeof QP.Type.Like        ? [type: MaybeRef<number>, pattern: MaybeRef<Stringable>, str: QP] : 
     *           T extends typeof QP.Type.LikeBuiltin ? [type: MaybeRef<number>, pattern: MaybeRef<Stringable>, str: QP] : 
     *           any
     * } DataForQPType
     */
    /**
     * @template {QPType} T
     * @typedef {T extends typeof QP.Type.Like        ? Stringable: 
     *           T extends typeof QP.Type.LikeBuiltin ? Stringable: 
     *           import('vue').UnwrapRef<DataForQPType<T>>
     * } DataForQPTypeTraversed
     */

    /**
     * @param {QPType} type 
     * @param {any} data 
     */
    constructor(type, data) {
        this.type = type;
        this.data = data;
    }

    toString() { return QP.ToStringImpl(this.type, this.data); }
    traverse   (/**@type {(type: QPType, data: any) => any} */ callback) {return QP.TraverseImpl   (this.type, this.data, callback);}
    traverseAdv(/**@type {(type: QPType, data: any) => any} */ callback) {return QP.TraverseAdvImpl(this.type, this.data, callback);}

    /**@template {QPType} T */
    static FromType(/**@type {T} */ type, /**@type {DataForQPType<T>} */ data) {return new QP(type, data);}

    /**@returns {string} */
    static ToStringImpl(/**@type {QPType} */ type, _data) {
        switch(type) {
            case QP.Type.RawString:   {const data = unref(/**@type {DataForQPType<typeof type>} */(_data)); return data.toString();}
            case QP.Type.Backtick:    {const data = unref(/**@type {DataForQPType<typeof type>} */(_data)); return escape_backtick_smart(data.toString());}
            case QP.Type.SQLValue:    {const data = unref(/**@type {DataForQPType<typeof type>} */(_data)); return escape_sql_value(data);}
            case QP.Type.SQLNode:     {const data = unref(/**@type {DataForQPType<typeof type>} */(_data)); return data.get_full_sql();}
            case QP.Type.Like:        {const data = /**@type {DataForQPType<typeof type>} */(_data); return escape_ulower_like_full(unref(data[1]).toString(), data[2].toString(), unref(data[0]));}
            case QP.Type.LikeBuiltin: {const data = /**@type {DataForQPType<typeof type>} */(_data); return `${data[2].toString()} ${escape_like_full(unref(data[1]).toString()), unref(data[0])}`;}
        }
        console.error("UNRECOGNIZED QUERY PART TYPE: ", type);
        return '';
    }
    static TraverseAdvImpl(/**@type {QPType} */ type, _data, /**@type {(type: QPType, data: any) => any} */ callback) {
        
        switch(type) {
            case QP.Type.Like:        {const inner = /**@type {QP}*/(_data[2]); return callback(type, _data) || inner.traverseAdv(callback);}
            case QP.Type.LikeBuiltin: {const inner = /**@type {QP}*/(_data[2]); return callback(type, _data) || inner.traverseAdv(callback);}
            default: return callback(type, unref(_data));
        }
    }
    static TraverseImpl(/**@type {QPType} */ type, _data, /**@type {(type: QPType, data: any) => any} */ callback) {
        switch(type) {
            case QP.Type.Like:        { const inner = /**@type {QP}*/(_data[2]); return callback(type, unref(_data[1])) || inner.traverse(callback);}
            case QP.Type.LikeBuiltin: { const inner = /**@type {QP}*/(_data[2]); return callback(type, unref(_data[1])) || inner.traverse(callback);}
            default: return callback(type, unref(_data));
        }
    }

    static S(/**@type {MaybeRef<Stringable>} */ str)    { return QP.FromType(QP.Type.RawString, str); }
    static B(/**@type {MaybeRef<Stringable>} */ str)    { return QP.FromType(QP.Type.Backtick,  str); }
    static V(/**@type {MaybeRef<SQLValue>} */ sqlvalue) { return QP.FromType(QP.Type.SQLValue,  sqlvalue); }
    static T(/**@type {TableNode | Column} */ sqlnode)  { return QP.FromType(QP.Type.SQLNode,   sqlnode); }
    static Like       (/**@type {QP} */ str, /**@type {MaybeRef<Stringable>} */ pattern, /**@type {MaybeRef<number>} */ type = 0) {
        return QP.FromType(QP.Type.Like, [type, pattern, str]);
    }
    static LikeBuiltin(/**@type {QP} */ str, /**@type {MaybeRef<Stringable>} */ pattern, /**@type {MaybeRef<number>} */ type = 0) {
        return QP.FromType(QP.Type.Like, [type, pattern, str]);
    }

    static Def(/**@type {MaybeRef<TableNode | Column | SQLValue | Stringable>} */ value) {
        if(value instanceof TableNode || value instanceof Column) 
            return QP.T(value);
        const unrefed = unref(value);
        if(is_sql_value(unrefed))
            //@ts-ignore
            return QP.V(value);
        if(typeof (unrefed?.toString()) === 'string')
            //@ts-ignore
            return QP.B(value);
        console.error("INVALID QUERY PART VALUE FOR 'DEF': ", typeof value, value);
        return QP.S('');
    }
};

function QPTag(/**@type {TemplateStringsArray} */ strings, ...keys) {
    const parts_strings = strings.map(x => QP.S(x));
    const parts_keys    = keys.map(key => {
        if(key instanceof QP) return key;
        return QP.Def(key);
    });
    const zipped = parts_keys.map((_,i) => [parts_strings[i], parts_keys[i]]).flat();
    return [...zipped, parts_strings[parts_strings.length - 1]];
}

function QPString(/**@type {TemplateStringsArray} */ strings, ...keys) {
    return QPTag(strings, ...keys).toString();
}

class QPS {
    static S(/**@type {MaybeRef<Stringable>} */ str)    { return QP.ToStringImpl(QP.Type.RawString, str); }
    static B(/**@type {MaybeRef<Stringable>} */ str)    { return QP.ToStringImpl(QP.Type.Backtick,  str); }
    static V(/**@type {MaybeRef<SQLValue>} */ sqlvalue) { return QP.ToStringImpl(QP.Type.SQLValue,  sqlvalue); }
    static T(/**@type {TableNode | Column} */ sqlnode)  { return QP.ToStringImpl(QP.Type.SQLNode,   sqlnode); }
    static Like       (/**@type {QP} */ str, /**@type {MaybeRef<Stringable>} */ pattern, /**@type {MaybeRef<number>} */ type = 0) {
        return QP.ToStringImpl(QP.Type.Like, [type, pattern, str]);
    }
    static LikeBuiltin(/**@type {QP} */ str, /**@type {MaybeRef<Stringable>} */ pattern, /**@type {MaybeRef<number>} */ type = 0) {
        return QP.ToStringImpl(QP.Type.Like, [type, pattern, str]);
    }
};

class QueryParts {
    constructor(/**@type {MaybeRef<QP[]>}*/ parts) {
        this.parts = parts;
        this.computed = QueryParts.to_computed(...unref(this.parts));
    }
    get      () { return this.computed.value;}
    get_inner() { return `(${this.computed.value})`;}

    /**
     * Check each query part (including inners). If callback returns true-ish value, return said value. Otherwise undefined.
     * @template R
     * @returns {R | undefined}
     */
    traverse   (/**@type {(type: QPType, data: any) => R} */ callback) {return QueryParts.traverse   (callback, ...unref(this.parts));}

    /**
     * Like "traverse", but more advanced types (e.g. "Like") and Ref's aren't simplified to a single value.
     * @template R
     * @returns {R | undefined}
     */
    traverseAdv(/**@type {(type: QPType, data: any) => R} */ callback) {return QueryParts.traverseAdv(callback, ...unref(this.parts));}

    /**
     * @template R 
     * @returns {R | undefined}
     */
    static traverse    ( /**@type {(type: QPType, data: any) => R} */ callback, /**@type {QP[]}*/ ...parts) {
        for(const part of parts) {
            const res = part.traverse(callback);
            if(res) return res;
        }
        return undefined;
    }
    
    /**
     * @template R 
     * @returns {R | undefined}
     */
    static traverseAdv ( /**@type {(type: QPType, data: any) => R} */ callback, /**@type {QP[]}*/ ...parts) {
        for(const part of parts) {
            const res = part.traverseAdv(callback);
            if(res) return res;
        }
        return undefined;
    }

    static build      (/**@type {QP[]}*/ ...parts) { return parts.map(x => x.toString()).join(' '); }
    static build_inner(/**@type {QP[]}*/ ...parts) { return `(${this.build(...parts)})`; }
    
    static to_computed      (/**@type {QP[]}*/ ...parts) { return computed(() => this.build      (...parts));}
    static to_computed_inner(/**@type {QP[]}*/ ...parts) { return computed(() => this.build_inner(...parts));}
};

/**
 * @typedef {QP[]} QueryPartsSimple
 */

function qp_has_null(type, data) {return data === null;}

/////////////////////////////////////////////////////// QUERY BUILDER //////////////////////////////////////////////////////////////////


function query_ordering_to_sql(/**@type {QueryOrderingDefinition} */ ordering) {
    const label   = escape_backtick_smart(unref(ordering.label).toString());
    const collate = ordering.collate !== undefined ? ` COLLATE ${unref(ordering.collate.toString())}`    : '';
    const asc     = ordering.asc     !== undefined ? (unref(ordering.asc) ? ' ASC' : ' DESC') : '';
    return label + collate + asc;
}

function query_select_field_to_sql(/**@type {QuerySelectFieldDefinition} */ selectfield) {
    const before_as = selectfield.sql ? unref(selectfield.sql).toString() : escape_backtick_smart((unref(selectfield.name) ?? '').toString());
    const after_as  = selectfield.as  ? " AS " + escape_sql_value(unref(selectfield.as).toString()) : '';
    return before_as + after_as;
}
class QueryBuilder {
    constructor(implicit_order_roiwd = false) {

        this.select_fields = reasShallowRef(/**@type {QuerySelectFieldDefinition[]} */ ([]));
        this._sql_select_fields = computed(() => 
            this.select_fields.value
            .map(query_select_field_to_sql)
            .join(', ')
        );
        // Only those select fields, where sql is defined (to correctly capture in count(*) query)
        // TODO remove if unnessesary in count query
        this._sql_select_fields_part_custom_only_app = computed(() => 
            this.select_fields.value
            .filter(x => x.sql)
            .map(query_select_field_to_sql)
            .map(x => ', ' + x)
            .join('')
        );

        this.from = reasRef(/**@type {QueryPartsSimple} */ ([]));
        this._sql_from = computed(() => QueryParts.build(...this.from.value));

        this.plugin_where_conj = shallowRef(/**@type {MaybeRef<QueryPartsSimple[]>[]} */ ([]));
        this.where_conj     = reasShallowRef(/**@type {QueryPartsSimple[]} */ ([]));
        this.where_conj_opt = reasShallowRef(/**@type {QueryPartsSimple[]} */ ([]));
        this._sql_where = computed(() => {
            const all_parts = [
                ...this.where_conj.value,
                ...this.where_conj_opt.value.filter(x => !QueryParts.traverse(qp_has_null, ...x)),
                ...this.plugin_where_conj.value.map(unref).flat()
            ];
            return all_parts
                .map(x => QueryParts.build_inner(...x))
                .join(' AND ');
        });

        this.groupby = reasShallowRef(/**@type {QueryPartsSimple} */ ([]));
        this._sql_groupby = computed(() => {
            const all_parts = [
                ...this.groupby.value,
            ];
            return all_parts
                .map(x => QueryParts.build(x))
                .join(', ');
        });

        this.plugin_orders = shallowRef(/**@type {MaybeRef<QueryOrderingDefinition[]>[]} */ ([]));
        this.order = reasShallowRef(/**@type {QueryOrderingDefinition[]} */ ([]));
        this._sql_order  = computed(() => [
                ...this.order.value, 
                ...this.plugin_orders.value.map(unref).flat()
            ].map(query_ordering_to_sql).join(', '));

        this.limit = reasRef(1);
        this._sql_limit  = computed(() => this.limit.value < 0 ? '' : this.limit.value.toString());
        
        this.offset = reasRef(-1);
        this._sql_offset = computed(() => this.limit.value < 0 ? '' : this.offset.value.toString());

        if(implicit_order_roiwd) {
            this.order.value = [{label: 'rowid'}];
        }

        this._sections1 = computed(() => {
            return {
                select:  this._sql_select_fields.value, 
                from:    this._sql_from.value,
                where:   this._sql_where.value,
                groupby: this._sql_groupby.value,
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
            select:  "",
            from:    "",
            where:   "",
            groupby: "",
            order:   "",
            limit:   "",
            offset:  "",
        });

        this._expired_count = computed(() => {
            return this._last_sections.value.select  !== this._sections1.value.select  ||
                   this._last_sections.value.from    !== this._sections1.value.from    ||
                   this._last_sections.value.where   !== this._sections1.value.where   ||
                   this._last_sections.value.groupby !== this._sections1.value.groupby;
        });
        this._expired = computed(() => {
            return this._expired_count.value  ||
                   this._last_sections.value.order  !== this._sections2.value.order   ||
                   this._last_sections.value.limit  !== this._sections2.value.limit   ||
                   this._last_sections.value.offset !== this._sections2.value.offset;
        });

        this.full_sql_base = computed(() => concat_query({
            select:  this._sections1.value.select,
            from:    this._sections1.value.from,
            where:   this._sections1.value.where,
            groupby: this._sections1.value.groupby,
            order:   this._sections2.value.order,
            limit:   this._sections2.value.limit,
        }));

        this.full_sql_summary = computed(() => concat_query({
            select:  this._sections1.value.select,
            from:    this._sections1.value.from,
            where:   this._sections1.value.where,
            groupby: this._sections1.value.groupby,
        }));

        this.full_sql_for_rownumber_window = computed(() => concat_query({
            order:   this._sections2.value.order,
        }))
        this.full_sql_for_rownumber_main = computed(() => concat_query({
            from:    this._sections1.value.from, 
            where:   this._sections1.value.where,
            groupby: this._sections1.value.groupby,
        }));
                
        this.full_sql_count = computed(() => {
            const base_query = concat_query({
                select:  'count(*)' + this._sql_select_fields_part_custom_only_app.value,
                from:    this._sections1.value.from, 
                where:   this._sections1.value.where, 
                groupby: this._sections1.value.groupby,
            });
            if(this._sections1.value.groupby.length === 0) {
                return base_query;
            } else {
                return `SELECT count(*) FROM (${base_query})`;
            }
        });
        
        this.full_sql_offset = computed(() => concat_query({
            select:  this._sections1.value.select, 
            from:    this._sections1.value.from, 
            where:   this._sections1.value.where, 
            groupby: this._sections1.value.groupby,
            order:   this._sections2.value.order, 
            limit:   this._sections2.value.limit, 
            offset:  this._sections2.value.offset, 
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
     * @param {QuerySelectFieldDefinition} selectfield
     */
    add_select(selectfield) {
        this.select_fields.value.push(selectfield);
    }
    /**
     * @param {QP} name 
     * @param {QP} value
     */
    add_where_eq(name, value, optional = false) {
        // const parts = qparts([name,'b'],' IS ',[value]);
        // const parts = [name, QP.S('IS'), value];
        const parts = QPTag`${name} IS ${value}`;
        this.add_where(parts, optional);
    }
    
    /**
     * @param {QueryPartsSimple} parts
     */
    add_where(parts, optional = false) {
        if(optional) {
            this.where_conj_opt.value.push(parts);
        } else {
            this.where_conj.value.push(parts);
        }
    }
    /**
     * @param {Column | string} column
     */
    add_groupby_column(column) {
        this.groupby.value.push(QP.B(column));
    }

    add_order_plugin(/**@type {MaybeRef<QueryOrderingDefinition[]>} */ orders) {
        this.plugin_orders.value.push(orders);
        triggerRef(this.plugin_orders);
    }

    add_where_plugin(/**@type {MaybeRef<QueryPartsSimple[]>} */ parts) {
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
            concat_query_section('GROUP BY', sections.groupby) +
            concat_query_section('ORDER BY', sections.order) +
            concat_query_section('LIMIT',    sections.limit) +
            concat_query_section('OFFSET',   sections.offset);
}

export {
    QP,
    QPS,
    QueryParts,
    QueryBuilder,
    QPTag,
    QPString,
    concat_query,
    concat_query_section,
}