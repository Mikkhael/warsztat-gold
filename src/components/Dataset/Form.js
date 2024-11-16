//@ts-check

import ipc from '../../ipc';
import { Column, TableNode } from './Database';
import {AdvDependableReasRef, AdvDependableRef, DataGraphNodeBase} from './DataGraph';
import {QuerySource} from './QuerySource';
import {TableSync} from './Sync';
import {computed, ref, shallowReactive, unref} from 'vue';


/**
 * @typedef {string | number | null} SQLValue
 */

/**
 * @typedef {"text" | "number" | "integer" | "date" | "datetime"} FormDataValueType
 */


/**
 * @typedef {FormQuerySourceCachedValue | AdvDependableRef<SQLValue>} FormDataValueSrc
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
*  param?:    MaybeDependable,
*  default?:  MaybeDependable,
*  primary?:  boolean,
*  sql?:      string,
*  sync?:     TableSync
*  sync_col?: string 
* }} StandardFormValueRoutineParams
* */


class QuerySourceRequest_Insert {
    constructor(value = false) {this.value = value};
}

class FormQuerySource extends QuerySource {
    constructor(implicit_order_rowid = true) {
        super(implicit_order_rowid);
        
        /**@type {string[]} */
        this.result_query_names = [];
        /**@type {Object.<string, FormQuerySourceCachedValue>} */
        this.result = shallowReactive({});

        this.insert_mode = ref(false);

        this.dataset = new FormDataSet(this);

        this.form_style = computed(() => {return {
            empty:    (this.is_empty.value && !this.insert_mode.value) || this.disabled.value,
            disabled: this.disabled.value
        }});

        this.associated_form_element = ref(/**@type {HTMLFormElement?} */ (null));
    }

    assoc_form(elem) {
        this.associated_form_element.value = elem;
    }

    report_validity_deep() {
        return !this.for_each_dist_deep(node => {
            if(node instanceof FormQuerySource && !node.report_validity_self()) {
                return true;
            }
        }, true);
    }
    report_validity_self(){
        if(this.associated_form_element.value === null) return true;
        const res = this.associated_form_element.value.reportValidity();
        return res;
    }


    /**
     * 
     * @param {string} name 
     * @param {MaybeRef<SQLValue>} default_value 
     * @returns 
     */
    register_result(name, default_value) {
        if(this.result[name]) {
            this.result[name].reregister(default_value);
        }else{
            this.result[name] = new FormQuerySourceCachedValue(this, default_value);
        }
        return this.result[name];
    }

    /**
     * @param {string | Column} result_name 
     * @param {MaybeRef<SQLValue>} initial_value 
     */
    get(result_name, initial_value = null) {
        let name = '';
        if(result_name instanceof Column) {
            name = result_name.get_full_sql();
        } else {
            name = result_name;
        }
        if(this.result[name]) return this.result[name];
        return this.register_result(name, initial_value);
    }
    /**
     * @param {string | Column} result_name 
     * @param {MaybeRef<SQLValue>} initial_value 
     */
    get_ref(result_name, initial_value = null) {
        const cached = this.get(result_name, initial_value);
        return cached.get_ref();
    }

    /// OVERWRITES //////////////////////
    check_changed_impl() {
        return this.dataset.changed.value || this.insert_mode.value;
    }
    check_should_disable_dists_impl() {
        return this.is_empty.value || this.insert_mode.value;
    }
    
    async update__request_impl() {
        if(this.request instanceof QuerySourceRequest_Insert) {
            this.insert_mode.value = this.request.value;
            if(this.insert_mode.value) {
                this.for_each_dist_deep(node => {node instanceof FormQuerySource && 
                                                (node.insert_mode.value = false)});
            }
            this.request_clear();
        } else {
            this.insert_mode.value = false;
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

    async save_impl(force = false) {
        const res = await this.dataset.perform_save_notransaction(undefined, force);
        if(res.insert) {
            this.request_offset_goto(-1, true);
        }
    }

    perform_reset() {
        for(const key in this.result) {
            this.result[key].reset();
        }
        this.dataset.refresh();
    }

    async perform_offset_query() {
        const full_result = await super.perform_offset_query();
        if(full_result === null) {
            this.perform_reset();
            return null;
        }
        const first_row = full_result[0][0];
        for(let i in first_row) {
            this.result[this.result_query_names[i]].ref.value = first_row[i];
        }
        this.dataset.refresh();
        return full_result;
    }
    
    /**
     * @param {string}   name 
     * @param {string=}  sql_definition 
     */
    add_select(name, sql_definition = undefined) {
        this.add_select_data(name, null, sql_definition);
    }

    /**
     * @param {string}   name 
     * @param {MaybeDependable} default_value
     * @param {string=}  sql_definition 
     */
    add_select_data(name, default_value = null, sql_definition = undefined) {
        this.query.add_select(name, sql_definition);
        this.result_query_names.push(name);
        const ref    = this.add_dependable(default_value);
        const cached = this.register_result(name, ref);
        // const cached = new FormQuerySourceCachedValue(this, ref);
        // this.result[name] = cached;
        this.dataset.add(name, cached);
    }

    /**
     * @param {string} name 
     * @param {StandardFormValueRoutineParams} params
     */
    auto_form_value_adv(name, params = {}) {
        this.add_select_data(name, params.default ?? params.param ?? null, params.sql);
        const value = this.dataset.get(name);
        if(params.param !== undefined) {
            this.add_where_eq(name, params.param, true);
        }
        if(params.sync) {
            params.sync.assoc_value(params.sync_col ?? name, value, params.primary)
        }
        return value;
    }
    
    /**
     * @param {Column} col 
     * @param {StandardFormValueRoutineParams} params
     */
    auto_form_value(col, params = {}) {
        /**@type {StandardFormValueRoutineParams} */
        const auto_params = {primary: col.is_primary()};
        Object.assign(auto_params, params);
        const value = this.auto_form_value_adv(col.get_full_sql(), auto_params);
        value.assoc_col(col);
        return value;
    }
    /**
     * @param {Column} col 
     * @param {StandardFormValueRoutineParams} params
     */
    auto_form_value_synced(col, params = {}) {
        const sync = this.dataset.get_or_create_sync(col.tab);
        /**@type {StandardFormValueRoutineParams} */
        const auto_params = Object.assign({}, {sync, sync_col: col.name}, params);
        return this.auto_form_value(col, auto_params);
    }

    /**
     * @param {boolean} value 
     */
    request_insert_mode(value) {
        this._add_update_request_impl(new QuerySourceRequest_Insert(value), false);
    }
    request_insert_toggle() {
        this._add_update_request_impl(new QuerySourceRequest_Insert(!this.insert_mode.value), false);
    }


}


/**
 * @extends {AdvDependableReasRef<SQLValue>}
 */
class FormQuerySourceCachedValue extends AdvDependableReasRef {
    /**
     * @param {QuerySource} src 
     * @param {MaybeRef<SQLValue>}    default_value
     */
    constructor(src, default_value = null) {
        super(src, unref(default_value));
        this.src = src;
        this.default_value = default_value;
    }

    /**
     * @param {MaybeRef<SQLValue>} new_default_value
     */
    reregister(new_default_value) {
        this.reassign(unref(new_default_value));
        this.default_value = new_default_value;
    }

    reset() {
        this.ref.value = unref(this.default_value);
    }
}

/**
 * @template T
 */
class FormDataValueLike {
    /**
     * @param {T} initial_value 
     */
    constructor(initial_value) {
        this.local = ref(initial_value);
        this.changed = computed(() => this.is_changed());
    }

    get_local() {
        return unref(this.local);
    }

    refresh() {}
    is_changed() {return false;}
    /**@returns {import('vue').Ref<T>?} */
    get_cached_ref() {return null;}


}

/**
 * @extends {FormDataValueLike<SQLValue>}
 */
class FormDataValue extends FormDataValueLike{
    /**
     * @param {FormDataSet} dataset
     * @param {FormQuerySourceCachedValue} src
     */
    constructor(dataset, src) {
        super(src.get_value());

        this.dataset = dataset;
        this.src     = src;

        /**@type {Column?} */
        this.associated_col = null;
    }

    /**
     * @param {Column} col
     */
    assoc_col(col) {
        this.associated_col = col;
    }

    refresh() {
        if(this.src === null) return;
        this.local.value = this.src.get_value();
    }
    get_cached() {
        if(this.src === null) return undefined;
        return this.src.get_value();
    }
    get_cached_ref() {
        if(this.src === null) return null;
        return this.src.get_ref();
    }

    is_changed() {
        const cached = this.get_cached();
        return cached !== undefined &&
               cached !== this.local.value;
    }
}

class FormDataSet {

    /**
     * @param {FormQuerySource?} query_src 
     */
    constructor(query_src) {
        this.query_src = query_src;
        this.insert_mode = query_src?.insert_mode || false;

        /**@type {Map<TableNode, TableSync>} */
        this.syncs = new Map();

        /**@type {Object.<string, FormDataValue>} */
        this.values = shallowReactive({});

        this.changed = computed(() => this.check_changed());
    }

    check_changed() { return Object.values(this.values).some(v => v.changed.value); }
    refresh() { Object.values(this.values).forEach(v => v.refresh()); }

    /**
     * @param {TableNode} table 
     */
    create_sync(table) {
        const sync = new TableSync(table, this);
        if(this.syncs.has(table)) {
            throw new Error("CANNOT HAVE MULTIPLE SYNCS FOR THE SAME TABLE IN ONE DATASET");
        }
        this.syncs.set(table, sync);
        return sync;
    }
    /**
     * @param {TableNode} table 
     */
    get_or_create_sync(table) {
        const sync = this.syncs.get(table);
        if(sync) return sync;
        return this.create_sync(table);
    }

    async perform_save_notransaction(/**@type {boolean?} */ insert = null, force = false) {
        if(insert === null) insert = unref(this.insert_mode);
        const values = await Promise.all(Array.from(this.syncs).map(x => x[1].perform_save(insert, force)))
        return {insert, values, dataset: this};
    }
    async perform_save_transaction(/**@type {boolean?} */ insert = null, force = false) {
        if(insert === null) insert = unref(this.insert_mode);
        return ipc.db_as_transaction(() => this.perform_save_notransaction(insert, force));
    }

    /**
     * 
     * @param {string} name 
     * @param {FormDataValueSrc?} src 
     */
    add(name, src) {
        if(this.values[name]) {
            throw new Error('VALUE ALREADY EXISTS: ' + name);
        }
        if(src instanceof FormQuerySourceCachedValue && src.src !== this.query_src) {
            throw new Error('WRONG QUERY SOURCE FOR SET: ' + name);
        }
        else if(!(src instanceof FormQuerySourceCachedValue)){
            throw new Error('NON-QUERY-CACHE NOT IMPLEMENTED YET IN DATASET');
        }
        const value = new FormDataValue(this, src);
        this.values[name] = value;
        return value;
    }
    /**
     * @param {string} name 
     */
    get(name) {
        const res = this.values[name];
        if(!res) throw new Error('GETTING UNDEFINED FORM VALUE: ' + name);
        return res;
    }

}

// src  expired -> dane w DB są prawdopodobnie inne niż w cache'u
// src  changed -> wywołanie update'u teraz, spowoduje nadpisanie nie-zcommitowanych zmian
// data epxired -> dane w DB są prawdopodobnie inne niż w cache'u
// data changed -> dane wpisane są inne niż w cache'u

export {
    QuerySourceRequest_Insert,
    FormQuerySource,
    FormQuerySourceCachedValue,
    FormDataSet,
    FormDataValue,
    FormDataValueLike
}