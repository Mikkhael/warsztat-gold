//@ts-check

import ipc from '../../ipc';
import { deep_compare, deep_copy } from '../../utils';
import { Column, TableNode } from './Database';
import { QuerySource, QuerySourceResultValue } from './QuerySource';
import { TableSyncRuleReactive } from './Sync';
import { computed, reactive, ref, shallowRef, unref } from 'vue';


/**
 * @typedef {string | number | null} SQLValue
 */

/**
 * @typedef {"text" | "number" | "integer" | "date" | "datetime"} FormDataValueType
 */


/**
 * @template [T=SQLValue]
 * @typedef {T | import('vue').Ref<T>} MaybeRef
 */

/**
 * @template [T=SQLValue]
 * @typedef {import('./DataGraph').MaybeDependable<T>} MaybeDependable
 */


/**
 * @typedef {{
 * allow_param_null?: boolean,
*  param?:    MaybeDependable,
*  default?:  MaybeDependable,
*  primary?:  boolean,
*  sql?:      string,
*  sync?:     FormDataSetTableSync
*  sync_col?: string 
* }} StandardFormValueRoutineParams
* */

/////////////// FORM QUERY SOURCES ////////////////////////////////////////

class FormQuerySourceBase extends QuerySource {
    /**
     * 
     * @param {boolean} implicit_order_rowid 
     */
    constructor(implicit_order_rowid) {
        super(implicit_order_rowid);
        this.associated_form_element = ref(/**@type {HTMLFormElement?} */ (null));
        
        /**@type {FormDataSetBase} */
        //@ts-ignore
        this.dataset = null;
        /**@type {MaybeRef<{empty: boolean, disabled: boolean}>} */
        this.form_style = computed(() => { return {
            empty:    this.is_empty.value || this.disabled.value,
            disabled: this.disabled.value
        }});
    }

    /// HTML FORM //////////////////////

    assoc_form(elem) {
        this.associated_form_element.value = elem;
    }

    report_validity_deep() {
        return !this.for_each_dist_deep(node => {
            if(node instanceof FormQuerySourceBase && !node.report_validity_self()) {
                return true;
            }
        }, true);
    }
    report_validity_self(){
        if(this.associated_form_element.value === null) return true;
        const res = this.associated_form_element.value.reportValidity();
        return res;
    }

    /// OVERWRITES DataGraph //////////////////////
    check_changed_impl() {
        return this.dataset?.changed.value || false;
    }

    async save_impl(force = false) {
        const res = await this.dataset.perform_save_notransaction(force);
        return res;
    }


    /// OVERWRITES QuerySource //////////////////////

    async perform_offset_query() {
        const full_result = await super.perform_offset_query();
        this.dataset.refresh();
        return full_result;
    }
    
    /**
     * @param {string}   name 
     * @param {string=}  sql_definition 
     */
    add_select(name, sql_definition = undefined) {
        this.add_select_with_default(name, null, sql_definition);
    }


    /// Extensions for QuerySource //////////////////////

    /**
     * Set all dataset values to full_result (or defaults if unable to)
     */
    perform_reset() {
        this.dataset.refresh();
    }

    /**
     * @param {string}   name 
     * @param {MaybeDependable} default_value
     * @param {string=}  sql_definition 
     */
    add_select_with_default(name, default_value = null, sql_definition = undefined) {
        this.query.add_select(name, sql_definition);
        const default_value_ref = this.add_dependable(default_value);
        this.dataset.add_column(name, default_value_ref);
    }
    
    /**
     * @param {string} name 
     * @param {StandardFormValueRoutineParams} params
     */
    auto_add_column_impl(name, params = {}) {
        this.add_select_with_default(name, params.default ?? params.param ?? null, params.sql);
        if(params.param !== undefined) {
            this.add_where_eq(name, params.param, !params.allow_param_null);
        }
        if(params.sync) {
            params.sync.add_column(params.sync_col ?? name, params.primary, name);
            // params.sync.assoc_value(params.sync_col ?? name, value, params.primary)
        }
        // const value = this.dataset.get(name);
        // return value;
    }
    
    /**
     * Automatically get column name and wheather it is primary
     * @param {Column} col 
     * @param {StandardFormValueRoutineParams} params
     */
    auto_add_column(col, params = {}) {
        /**@type {StandardFormValueRoutineParams} */
        const auto_params = {primary: col.is_primary()};
        Object.assign(auto_params, params);
        this.auto_add_column_impl(col.get_full_sql(), auto_params);
        // value.assoc_col(col);
        // return value;
    }
    /**
     * Automatically get column name and wheather it is primary, and generate appropiate sync
     * @param {Column} col 
     * @param {StandardFormValueRoutineParams} params
     */
    auto_add_column_synced(col, params = {}) {
        const sync = this.dataset.get_or_create_sync(col.tab);
        /**@type {StandardFormValueRoutineParams} */
        const auto_params = Object.assign({}, {sync, sync_col: col.name}, params);
        this.auto_add_column(col, auto_params);
    }


}

class QuerySourceRequest_Insert {
    constructor(value = false) {this.value = value};
}
class FormQuerySourceBaseInsertable extends FormQuerySourceBase{
    /**
     * 
     * @param {boolean} implicit_order_rowid 
     */
    constructor(implicit_order_rowid) {
        super(implicit_order_rowid);
        this.insert_mode = ref(false);
        
        this.form_style = computed(() => { return {
            empty:    (this.is_empty.value && !this.insert_mode.value) || this.disabled.value,
            disabled: this.disabled.value
        }});
    }
    
    /// OVERWRITES DataGraph //////////////////////

    check_changed_impl() {
        return this.insert_mode.value || super.check_changed_impl();
    }
    check_should_disable_dists_impl() {
        return this.insert_mode.value || super.check_should_disable_dists_impl();
    }
    
    async save_impl(force = false) {
        const res = await super.save_impl(force);
        if(this.insert_mode.value) {
            this.request_offset_goto(-1, true);
        }
        return res;
    }
    
    /// OVERWRITES QuerySource //////////////////////

    async update__request_impl() {
        this.insert_mode.value = false;
        if(this.request instanceof QuerySourceRequest_Insert) {
            this.insert_mode.value = this.request.value;
            if(this.insert_mode.value) {
                this.for_each_dist_deep(node => {node instanceof FormQuerySourceBaseInsertable && 
                                                (node.insert_mode.value = false)});
            }
            this.request_clear();
        }
        await super.update__request_impl();
    }
    async update__main_impl() {
        if(this.insert_mode.value) {
            this.perform_reset();
            return;
        }
        await super.update__main_impl();
    }

    /// Extensions to QuerySource //////////////////////

    request_insert_mode(/**@type {boolean} */ value) {
        this._add_update_request_impl(new QuerySourceRequest_Insert(value), false);
    }
    request_insert_toggle() {
        this._add_update_request_impl(new QuerySourceRequest_Insert(!this.insert_mode.value), false);
    }
}


class FormQuerySourceFull extends FormQuerySourceBase {
    constructor(implicit_order_rowid = false) {
        super(implicit_order_rowid);
        this.dataset = new FormDataSetFull(this);
    }
}
class FormQuerySourceSingle extends FormQuerySourceBaseInsertable {
    constructor(implicit_order_rowid = false) {
        super(implicit_order_rowid);
        this.dataset = new FormDataSetSingle(this);
    }

    /**
     * @param {Parameters<FormQuerySourceBase['auto_add_column_impl']>} args 
     */
    auto_add_value_impl(...args) {
        this.auto_add_column_impl(...args);
        return this.dataset.get(args[0]);
    }
    
    /**
     * Automatically get column name and wheather it is primary
     * @param {Parameters<FormQuerySourceBase['auto_add_column_impl']>} args 
     */
    auto_add_value(...args) {
        this.auto_add_value(...args);
        return this.dataset.get(args[0]);
    }
    /**
     * Automatically get column name and wheather it is primary, and generate appropiate sync
     * @param {Parameters<FormQuerySourceBase['auto_add_column_impl']>} args 
     */
    auto_add_value_synced(...args) {
        this.auto_add_value_synced(...args);
        return this.dataset.get(args[0]);
    }
}


/////////////// CHANGABLE VALUES ////////////////////////////////

/**
 * @template {Object.<string, any>} T
 * @typedef {T extends Array ? string : Extract<keyof T, string>} Keysof
 */

/**
 * @template T
 */
class ChangableValueLike {
    constructor() {
        this.changed = computed(() => this.is_changed());
    }

    /**@returns {T | undefined} */
    get_cached()    {return undefined;}
    /**@returns {import('vue').Ref<T>} */
    get_local_ref() {throw new Error('not implemented');}

    /**@param {T} v */
    set_local(v) {return this.get_local_ref().value = v;}
    get_local()  {return unref(this.get_local_ref()); }
    is_changed() {return !deep_compare(this.get_local(), this.get_cached());}
    refresh() { 
        const cached = this.get_cached();
        if(cached === undefined) return;
        //@ts-ignore
        this.set_local(NaN);
        this.set_local(deep_copy(cached));
    }
}
/**
 * @template T
 * @extends ChangableValueLike<T>
 */
class OwningChangableValue extends ChangableValueLike{
    /**
     * @param {MaybeRef<T>} initial_value
     * @param {MaybeRef<T | undefined>}  cached
     * */
    constructor(initial_value, cached = undefined) {
        super();
        /**@type {import('vue').Ref<T>} */
        //@ts-ignore
        this.local  = ref(initial_value);
        this.cached = cached;
    }
    get_local_ref() {return this.local;}
    get_cached() { return unref(this.cached); }
}
/**
 * @template T
 * @extends {OwningChangableValue<T>}
 */
class DefaultableSimpleOwningChangableValue extends OwningChangableValue{
    /**
     * @param {MaybeRef<T>} default_value
     * @param {MaybeRef<T>} initial_value
     * @param {MaybeRef<T | undefined>}  cached
     * */
    constructor(default_value, initial_value, cached = undefined) {
        super(initial_value, cached);
        this.default_value = default_value;
    }
    reset() {
        this.local.value = unref(this.default_value);
    }

    refresh() { 
        const cached = unref(this.cached);
        if(cached === undefined) {
            this.local.value = unref(this.default_value);
        } else {
            this.local.value = cached;
        }
    }
    is_changed() { return this.get_cached() !== this.get_local();}
}

/**
 * @extends {DefaultableSimpleOwningChangableValue<SQLValue>}
 */
class FormChangebleValue extends DefaultableSimpleOwningChangableValue{
    /**
     * @param {FormDataSetBase} dataset
     * @param {MaybeRef<SQLValue | undefined>} cached
     * @param {MaybeRef<SQLValue>} default_value
     */
    constructor(dataset, cached, default_value = null) {
        const initial_value = unref(cached);
        super(default_value, initial_value === undefined ? default_value : initial_value, cached);
        this.dataset        = dataset;
        this.associated_col = /**@type {Column?} */ (null);
    }
    assoc_col(/**@type {Column} */ col) { this.associated_col = col; }
}

///////////////// DATASET SYNC //////////////////////////////////////////////

class FormDataSetTableSync extends TableSyncRuleReactive {
    /**
     * @param {FormDataSetBase} dataset 
     * @param {TableNode} table 
     */
    constructor(dataset, table) {
        const data = computed(() => {
            return {
                cols: this.cols,
                rows: this.generate_data_rows_computed(this.cols.map(x => x.dataset_name ?? x.name))
            };
        });
        super(table, data);
        this.cols = reactive(/**@type {{primary?: boolean, name: string, dataset_name?: string}[]} */ ([]));
        this.dataset = dataset;
    }

    /**
     * @param {Column | string} column
     * @param {boolean} [primary]
     * @param {string} [dataset_name]
     * */
    add_column(column, primary, dataset_name) {
        if(column instanceof Column) {
            primary = primary ?? column.is_primary(); 
            this.cols.push({primary, dataset_name, name: column.name});
            return;
        }
        this.cols.push({primary, dataset_name, name: column});
    }

    /**
     * @param {string[]} col_names 
     */
    generate_data_rows_computed(col_names) {
        return this.dataset.generate_data_rows_computed(col_names);
    }
}


/////////////// FORM DATASETS ////////////////////////////////////////

class FormDataSetBase {

    constructor() {
        /**@type {FormQuerySourceBase?} */
        this.query_src = null;
        this.changed = computed(() => this.check_changed());
        /**@type {string[]} */
        this._column_names = [];
        /**@type {Object.<string, number>} */
        this._col_index_lookup = {};
        /**@type {MaybeRef<SQLValue>[]} */
        this._col_default_lookup = [];

        /**@type {Object.<string, FormDataSetTableSync>} */
        this.syncs = {};
    }

    /**
     * @param {string | number} name 
     */
    lookup_col_index(name) {
        if(typeof name === 'number') return name;
        return this._col_index_lookup[name] ??
               this.query_src?.lookup_col_index(name) ??
               -1;
    }

    /**
     * @param {string | number} col_index_or_name 
     */
    get_default_value_for_column(col_index_or_name) {
        return this._col_default_lookup[this.lookup_col_index(col_index_or_name)] ?? null;
    }

    // TODO Disassosiate dataset value name from query source column name (can be same by default, but should not have to be)
    // TODO get_or_add_column (add_column_if_dosen't exist)
    /**
     * @param {string} name 
     * @param {MaybeRef<SQLValue>} default_value 
     * @param {number} [index] 
     */
    add_column(name, default_value = null, index) {
        index = index ?? this._column_names.length;
        this._column_names[index] = name;
        this._col_default_lookup[index] = default_value;
        this._col_index_lookup[name] = index;
    }

    // TODO allow to get sync by string, not TableNode
    /**@param {TableNode} table */
    get_or_create_sync(table) {
        const table_name = table.name;
        const sync = this.syncs[table_name];
        if(sync) return sync;

        const new_sync = new FormDataSetTableSync(this, table);
        this.syncs[table_name] = new_sync;
        return new_sync;
    }

    /// TO OVERRIDE ///
    /**@returns {boolean} */
    check_changed() { throw new Error('not implemented'); }
    refresh()       { throw new Error('not implemented'); }
    /**@returns {Promise<number>} */
    async perform_save_notransaction(all = false) {
        throw new Error('not implemented');
    }
    /**@returns {import('./Sync.js').TableSyncReactiveRow[]}*/
    generate_data_rows_computed(/**@type {string[]} */ col_names) {
        throw new Error('not implemented');
    }
    //////////////////

    async perform_save_transaction(all = false) {
        return ipc.db_as_transaction(() => this.perform_save_notransaction(all));
    }
}

class FormDataSetFull extends FormDataSetBase {
    
    /**
     * @typedef {{deleted: import('vue').Ref<boolean>, values: FormChangebleValue[]}} LocalRow
     */

    /**
     * @param {FormQuerySourceBase?} query_src 
     */
    constructor(query_src) {
        super();
        this.query_src = query_src;
        this.local_rows = shallowRef(/**@type {LocalRow[]} */ ([]));
    }
    
    /**
     * @param {import('../../ipc').IPCQueryResult} full_result 
     * @param {FormDataSetFull} dataset 
     * @returns {LocalRow[]}
     * */
    static _rebuild_from_query_full_result(full_result, dataset) {
        const [rows, cols] = full_result;
        if(rows.length === 0 || rows[0].length === 0) return [];
        const mapped = rows.map((row, row_index) => {
            return {
                deleted: ref(false),
                values: row.map((cell, col_index) => {
                    const cached        = dataset.query_src?.get_result_computed(col_index, row_index, undefined);
                    const default_value = dataset.get_default_value_for_column(col_index);
                    return new FormChangebleValue(dataset, cached, default_value);
                })
            }
        });
        return mapped;
    }


    //// OVERRIDE /////
    check_changed() { return this.local_rows.value.some(x => x.deleted || x.values.some(xx => xx.changed.value)); }
    refresh() {
        const new_local_rows = FormDataSetFull._rebuild_from_query_full_result(this.query_src?.full_result.value ?? [[],[]], this);
        this.local_rows.value = new_local_rows;        
    }
    async perform_save_notransaction(all = false, no_delete = false) {
        const syncs = Object.values(this.syncs);
        const results = await Promise.all(syncs.map(async sync => {
            let affected_rows = 0;
            if(!no_delete) {
                affected_rows += await sync.perform_sync_notransaction('delete', all);
            }
            affected_rows += await sync.perform_sync_notransaction('replace', all);
            return affected_rows;
        }));
        return results.reduce((acc, v) => acc + v, 0);
    }
    /**@returns {import('./Sync.js').TableSyncReactiveRow[]}*/
    generate_data_rows_computed(/**@type {string[]} */ col_names) {
        const col_indexes = col_names.map(name => this.lookup_col_index(name));
        const result = this.local_rows.value.map(row => {
            const values = col_indexes.map(index => row.values[index]);
            return {
                deleted: row.deleted.value,
                changed: values.some(x => x.changed.value),
                values:  values.map (x => x.get_local()),
            }
        })
        return result;
    }
    //////////////////
}

class FormDataSetSingle extends FormDataSetBase {
    
    /**
     * @param {FormQuerySourceBaseInsertable?} query_src 
     */
    constructor(query_src) {
        super();
        this.query_src = query_src;
        // TODO
    }

    /**@type {Column | string} */
    get(column) {
        // TODO
    }
    


    //// OVERRIDE /////
    check_changed() { 
        throw new Error('not implemented');
    }
    refresh() {
        throw new Error('not implemented');
    }
    async perform_save_notransaction(all = false) {
        throw new Error('not implemented');
    }
    /**@returns {import('./Sync.js').TableSyncReactiveRow[]}*/
    generate_data_rows_computed(/**@type {string[]} */ col_names) {
        throw new Error('not implemented');
    }
    //////////////////
}







// src  expired -> dane w DB są prawdopodobnie inne niż w cache'u
// src  changed -> wywołanie update'u teraz, spowoduje nadpisanie nie-zcommitowanych zmian
// data epxired -> dane w DB są prawdopodobnie inne niż w cache'u
// data changed -> dane wpisane są inne niż w cache'u

export {
    // Form Query Sources
    QuerySourceRequest_Insert,
    FormQuerySourceBase,
    FormQuerySourceBaseInsertable,
    FormQuerySourceFull,
    FormQuerySourceSingle,

    // Values
    ChangableValueLike,
    OwningChangableValue,
    FormChangebleValue,
    
    // Datasets and Sync
    FormDataSetBase,
    FormDataSetFull,
    FormDataSetSingle,
    FormDataSetTableSync,
    

}