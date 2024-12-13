//@ts-check

import ipc from '../../ipc';
import { deep_compare, deep_copy } from '../../utils';
import { Column, TableNode } from './Database';
import { QuerySource, QuerySourceResultValue } from './QuerySource';
import { TableSyncRuleReactive } from './Sync';
import { computed, isRef, markRaw, reactive, ref, unref } from 'vue';


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
*  param?:     MaybeDependable,
*  default?:   MaybeDependable,
*  primary?:   boolean,
*  sql?:       string,
*  sync?:      FormDataSetTableSync
*  sync_col?:  string 
*  assoc_col?: Column
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
        
        /**@type {MaybeRef<{empty: boolean, disabled: boolean}>} */
        this.form_style = computed(() => { return {
            empty:    this.is_empty.value || this.disabled.value,
            disabled: this.disabled.value
        }});
    }

    /**@returns {FormDataSetBase} */ get_dataset(){ throw new Error("not implemented"); }

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
        return !this.is_empty.value && this.get_dataset()?.changed.value;
    }

    async save_impl(force = false) {
        const res = await this.get_dataset().perform_save_notransaction(force);
        return res;
    }


    /// OVERWRITES QuerySource //////////////////////

    async perform_offset_query() {
        const full_result = await super.perform_offset_query();
        this.get_dataset().refresh();
        return full_result;
    }
    
    /**
     * @param {Column | string} column 
     * @param {string=}  sql_definition 
     */
    add_select(column, sql_definition = undefined) {
        this.add_select_with_default(column, null, sql_definition);
    }


    /// Extensions for QuerySource //////////////////////

    /**
     * Set all dataset values to defaults
     */
    perform_reset() {
        this.get_dataset().reset();
    }

    /**
     * @param {Column | string} column 
     * @param {MaybeDependable} default_value
     * @param {string=}  sql_definition 
     */
    add_select_with_default(column, default_value = null, sql_definition = undefined) {
        this.query.add_select(column, sql_definition);
        const default_value_ref = this.add_dependable(default_value);
        this.get_dataset().add_column(column, default_value_ref);
    }
    
    /**
     * @param {string} name 
     * @param {StandardFormValueRoutineParams} params
     */
    auto_add_column_impl(name, params = {}) {
        this.add_select_with_default(params.assoc_col ?? name, params.default ?? params.param ?? null, params.sql);
        if(params.param !== undefined) {
            this.add_where_eq(name, params.param, !params.allow_param_null);
        }
        if(params.sync) {
            params.sync.add_column(params.sync_col ?? name, params.primary, name);
        }
    }
    
    /**
     * Automatically get column name and wheather it is primary
     * @param {Column | string} col 
     * @param {StandardFormValueRoutineParams} params
     */
    auto_add_column(col, params = {}) {
        if(typeof col === 'string') return this.auto_add_column_impl(col, params);
        /**@type {StandardFormValueRoutineParams} */
        const auto_params = {primary: col.is_primary(), assoc_col: col};
        Object.assign(auto_params, params);
        this.auto_add_column_impl(col.get_full_sql(), auto_params);
    }
    /**
     * Automatically get column name and wheather it is primary, and generate appropiate sync
     * @param {Column | string} col 
     * @param {StandardFormValueRoutineParams} params
     */
    auto_add_column_synced(col, params = {}) {
        if(typeof col === 'string') return this.auto_add_column_impl(col, params);
        const sync = this.get_dataset().get_or_create_sync(col.tab);
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
    /**
     * @param {boolean} implicit_order_rowid 
     * @param {MaybeRef<number>} limit 
     */
    constructor(implicit_order_rowid = false, limit = -1) {
        super(implicit_order_rowid);
        this.query.limit.reas_or_unref(limit);
        this.dataset = new FormDataSetFull(this);
    }
    get_dataset() {return this.dataset;}
}


class FormQuerySourceSingle extends FormQuerySourceBaseInsertable {
    /**
     * @param {boolean} implicit_order_rowid 
     */
    constructor(implicit_order_rowid = false) {
        super(implicit_order_rowid);
        this.dataset = new FormDataSetSingle(this);
    }
    get_dataset() {return this.dataset;}

    /**
     * @param {Parameters<FormQuerySourceBase['auto_add_column_impl']>} args 
     */
    auto_add_value_impl(...args) {
        this.auto_add_column_impl(...args);
        return this.dataset.get(args[0]);
    }
    
    /**
     * Automatically get column name and wheather it is primary
     * @param {Parameters<FormQuerySourceBase['auto_add_column']>} args 
     */
    auto_add_value(...args) {
        this.auto_add_column(...args);
        return this.dataset.get(args[0]);
    }
    /**
     * Automatically get column name and wheather it is primary, and generate appropiate sync
     * @param {Parameters<FormQuerySourceBase['auto_add_column_synced']>} args 
     */
    auto_add_value_synced(...args) {
        this.auto_add_column_synced(...args);
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

    /**@returns {import('vue').MaybeRef<T | undefined>} */
    get_cached_ref() {
        return undefined;
    }
    /**@returns {import('vue').Ref<T>} */
    get_local_ref() {throw new Error('not implemented');}

    /**@param {T} v */
    set_local(v) {return this.get_local_ref().value = v;}
    get_local()  {return unref(this.get_local_ref()); }
    get_cached() {return unref(this.get_cached_ref());}
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
    get_cached_ref() {return this.cached;}
    get_local_ref() {return this.local;}
    get_cached() { return unref(this.cached);}
    set_cached(/**@type {T | undefined} */ new_cached) {
        if(isRef(this.cached)) {
            this.cached.value = new_cached;
        } else {
            this.cached = new_cached;
            const old_local = this.get_local();
            //@ts-ignore
            this.local.value = NaN;
            this.local.value = old_local;
        }
    }
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
        const true_initial_value = initial_value === undefined ?
            unref(default_value) :
            initial_value;
        super(default_value, true_initial_value, cached);
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
        /**@type {Column[]} */
        this._associated_columns = [];
        /**@type {Object.<string, number>} */
        this._col_index_lookup = {};
        /**@type {MaybeRef<SQLValue>[]} */
        this._col_default_lookup = [];

        /**@type {Object.<string, FormDataSetTableSync>} */
        this.syncs = {};
    }

    /**
     * @param {Column | string | number} name 
     */
    lookup_col_index(name) {
        if(typeof name === 'number') return name;
        if(name instanceof Column) name = name.get_full_sql();
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
     * @param {Column | string} column 
     * @param {MaybeRef<SQLValue>} default_value 
     * @param {number} [index] 
     */
    add_column(column, default_value = null, index) {
        const name = column instanceof Column ? column.get_full_sql() : column;
        index = index ?? this._column_names.length;
        this._column_names[index] = name;
        this._col_default_lookup[index] = default_value;
        this._col_index_lookup[name] = index;
        if(column instanceof Column) {
            this._associated_columns[index] = column;
        }
        return index;
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
    reset()         { throw new Error('not implemented'); }
    /**@returns {Promise<number>} */
    async perform_save_notransaction(forced = false) {
        throw new Error('not implemented');
    }
    /**@returns {import('./Sync.js').TableSyncReactiveRow[]}*/
    generate_data_rows_computed(/**@type {string[]} */ col_names) {
        throw new Error('not implemented');
    }
    //////////////////

    async perform_save_transaction(forced = false) {
        return ipc.db_as_transaction(() => this.perform_save_notransaction(forced));
    }
}

class FormDataSetFull_LocalRow {
    /**
     * @param {FormDataSetFull} dataset 
     * @param {FormChangebleValue[]} values 
     */
    constructor(dataset, values = [], inserted = false) {
        this.dataset  = markRaw(dataset);
        this.values   = markRaw(values);
        this.deleted  = false;
        this.inserted = inserted;
    }

    check_outdated() {
        return this.deleted  ||
               this.inserted || 
               this.values.some(v => v.changed.value);
    }

    get(/**@type {Column | string | number} */ name) {
        let index = 0;
        if(name instanceof Column) {
            index = this.dataset.lookup_col_index(name.get_full_sql());
        } else {
            index = this.dataset.lookup_col_index(name);
        }
        return this.values[index];
    }
    get_local(/**@type {Column | string | number} */ name) {
        const value = this.get(name);
        return value?.get_local();
    }
    get_cached(/**@type {Column | string | number} */ name) {
        const value = this.get(name);
        return value?.get_cached();
    }
    is_true(/**@type {Column | string | number} */ name) {
        return !!this.get(name).get_local();
    }
}

class FormDataSetFull extends FormDataSetBase {
    
    /**
     * @param {FormQuerySourceBase?} query_src 
     */
    constructor(query_src) {
        super();
        this.query_src = query_src;
        this.local_rows = ref(/**@type {FormDataSetFull_LocalRow[]} */ ([]));
        this._key_base = 0;
    }
    
    /**
     * @param {import('../../ipc').IPCQueryResult} full_result 
     * @param {FormDataSetFull} dataset 
     * @returns {FormDataSetFull_LocalRow[]}
     * */
    static _rebuild_from_query_full_result(full_result, dataset) {
        console.log('REBUILDING', full_result, dataset);
        const [rows, cols] = full_result;
        if(rows.length === 0 || rows[0].length === 0) return [];
        const mapped = rows.map((row, row_index) => {
            const values = row.map((cell, col_index) => {
                const cached        = dataset.query_src?.get_result_computed(col_index, row_index, undefined);
                const default_value = dataset.get_default_value_for_column(col_index);
                const value = new FormChangebleValue(dataset, cached, default_value);
                const assoced = dataset._associated_columns[col_index];
                if(assoced) {
                    value.assoc_col(assoced);
                }
                return value;
            });
            const local_row = new FormDataSetFull_LocalRow(dataset, values);
            return local_row;
        });
        return mapped;
    }

    add_row_default() {
        const new_row_index = this.local_rows.value.length;
        const new_values =  this._column_names.map((col_name, col_index) => {
            // const cached        = this.query_src?.get_result_computed(col_name, new_row_index, undefined);
            const default_value = this.get_default_value_for_column(col_name);
            const value = new FormChangebleValue(this, undefined, default_value);
            const assoced = this._associated_columns[col_index];
            if(assoced) {
                value.assoc_col(assoced);
            }
            return value;
        });
        const new_local_row = new FormDataSetFull_LocalRow(this, new_values, true);
        this.local_rows.value.push(new_local_row);
        // triggerRef(this.local_rows);
        return new_local_row;
    }
    add_or_swap_row_default_with_limit(limit = 0) {
		console.log("ADDING OR SWAPPING WITH LIMIT " + limit);
        const all_rows_count = this.local_rows.value.length;
        if(all_rows_count < limit) {
            console.log("HAS ROOM " + all_rows_count);
            return this.add_row_default();
        }
        let noninserted_last_index = this.local_rows.value.length - 1;
        while(noninserted_last_index >= 0 && this.local_rows.value[noninserted_last_index].inserted) {
            noninserted_last_index -= 1;
        }
        if(noninserted_last_index < 0) {
            console.log("NO MORE ROOM");
            return this.add_row_default();
        }
        const noninserted_last = this.local_rows.value[noninserted_last_index];
        if(noninserted_last.check_outdated()) {
            console.log("WOULD ERASE CHANGES");
            return this.add_row_default();
        }
        console.log("SWAP " + noninserted_last_index);
        this._key_base += 1;
        this.local_rows.value.splice(noninserted_last_index, 1);
        return this.add_row_default();
    }

    mark_row_deleted(/**@type {number} */ index, deleted_value = true) {
        if(this.local_rows.value[index]) {
            if(this.local_rows.value[index].inserted && deleted_value) {
                this.local_rows.value.splice(index, 1);
            } else {
                this.local_rows.value[index].deleted = deleted_value;
            }
            // console.log("DELETEDDDDD", index, this.local_rows.value.map(x => x.deleted), this.local_rows);
        }
        // triggerRef(this.local_rows);
    }
    flip_row_deleted(/**@type {number} */ index) {
        return this.mark_row_deleted(index, !this.local_rows.value[index]?.deleted);
    }

    get_unique_key(index) {
        return this._key_base + '_' + index;
    }


    //// OVERRIDE /////
    check_changed() { return this.local_rows.value.some(row => row.check_outdated()); }
    refresh() {
        this._key_base += 1;
        const new_local_rows = FormDataSetFull._rebuild_from_query_full_result(this.query_src?.full_result.value ?? [[],[]], this);
        this.local_rows.value = new_local_rows;
    }
    reset() {
        this._key_base += 1;
        this.local_rows.value = [];
    }
    async perform_save_notransaction(forced = false, no_delete = false) {
        const syncs = Object.values(this.syncs);
        const results = await Promise.all(syncs.map(async sync => {
            let affected_rows = 0;
            if(!no_delete) {
                affected_rows += await sync.perform_sync_notransaction('delete');
            }
            affected_rows += await sync.perform_sync_notransaction('update', forced);
            affected_rows += await sync.perform_sync_notransaction('insert');
            return affected_rows;
        }));
        return results.reduce((acc, v) => acc + v, 0);
    }
    /**@returns {import('./Sync.js').TableSyncReactiveRow[]}*/
    generate_data_rows_computed(/**@type {string[]} */ col_names) {
        console.log("GENERATING DATA ROWS COMPUTED", col_names);
        const col_indexes = col_names.map(name => this.lookup_col_index(name));
        const result = this.local_rows.value.map(row => {
            const row_values = col_indexes.map(index => row.values[index]);
            const inserted = row.inserted;
            const deleted  = row.deleted;
            const changed  = !inserted && !deleted && row_values.some(x => x.changed.value);
            const cached   = row_values.map (x => x.get_cached());
            const values   = row_values.map (x => x.get_local());
            return {deleted,inserted,changed,cached,values}
        });
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
        this.query_src   = query_src;
        this.insert_mode = query_src?.insert_mode ?? ref(false);
        /**@type {FormChangebleValue[]} */
        this.local_row   = [];
    }

    /**@param {Column | string | number} column */
    get(column) {
        const index  = this.lookup_col_index(column);
        const value = this.local_row[index];
        if(value) {
            return value;
        }
        const new_value = this.local_row[index] = new FormChangebleValue(this, ref(undefined), null);
        if(column instanceof Column) {
            new_value.assoc_col(column);
        }
        return new_value;
    }
    

    //// OVERRIDE from normal DatasetBase ///

    /**
     * @param {Column | string} column 
     * @param {MaybeRef<SQLValue>} default_value 
     * @param {number} [index] 
     */
    add_column(column, default_value = null, index) {
        const true_index = super.add_column(column, default_value, index);
        const cached = this.query_src?.get_result_raw(true_index, 0);
        const prev_value = this.local_row[true_index];
        if(prev_value) {
            prev_value.default_value = default_value;
            prev_value.set_cached(cached);
            return true_index;
        }
        const new_value = new FormChangebleValue(this,ref(cached),default_value);
        if(column instanceof Column) {
            new_value.assoc_col(column);
        }
        this.local_row[true_index] = new_value;
        return true_index;
    }


    //// OVERRIDE /////
    check_changed() { 
        return this.local_row.some(value => value.changed.value);
    }
    refresh() {
        return this.local_row.forEach((value, i) => {
            value.set_cached(this.query_src?.get_result_raw(i, 0));
            value.refresh();
        });
    }
    reset() {
        return this.local_row.forEach(value => value.reset());
    }
    async perform_save_notransaction(forced = false) {
        const syncs = Object.values(this.syncs);
        const results = await Promise.all(syncs.map(async sync => {
            let affected_rows = 0;
            if(this.insert_mode.value) {
                affected_rows += await sync.perform_sync_notransaction('insert');
            } else {
                affected_rows += await sync.perform_sync_notransaction('update', forced);
            }
            return affected_rows;
        }));
        return results.reduce((acc, v) => acc + v, 0);
    }
    /**@returns {import('./Sync.js').TableSyncReactiveRow[]}*/
    generate_data_rows_computed(/**@type {string[]} */ col_names) {
        const inserted = this.insert_mode.value;
        const changed  = this.changed.value;
        const cached   = this.local_row.map(x => x.get_cached());
        const values   = this.local_row.map(x => x.get_local());
        return [{inserted, changed, cached, values}]
    }
    //////////////////
}

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
    FormDataSetFull_LocalRow,
    FormDataSetSingle,
    FormDataSetTableSync,


}