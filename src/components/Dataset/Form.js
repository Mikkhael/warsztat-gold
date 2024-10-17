//@ts-check

import ipc from '../../ipc';
import { TableNode } from './Database';
import {AdvDependableRef, DataGraphNodeBase} from './DataGraph';
import {QuerySource, QuerySourceCachedValue} from './QuerySource';
import {TableSync} from './Sync';
import {computed, ref, shallowReactive, unref} from 'vue';


/**
 * @typedef {string | number | null} SQLValue
 */

/**
 * @typedef {"text" | "number" | "integer" | "date" | "datetime"} FormDataValueType
 */


/**
 * @typedef {QuerySourceCachedValue | AdvDependableRef<SQLValue>} FormDataValueSrc
 */


// TODO add type (and also other attributes, potentialy)
class FormDataValue {
    /**
     * @param {FormDataSet} dataset
     * @param {QuerySourceCachedValue} src
     */
    constructor(dataset, src) {
        this.dataset = dataset;
        this.src = src;
        this.local = ref(this.src.get_value());

        this.changed = computed(() => this.is_changed());
    }

    refresh() {
        if(this.src === null) return;
        this.local.value = this.src.get_value();
    }

    get_local() {
        return unref(this.local);
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
     * @param {QuerySource?} query_src 
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

    // TODO report validity


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
        if(src instanceof QuerySourceCachedValue && src.src !== this.query_src) {
            throw new Error('WRONG QUERY SOURCE FOR SET: ' + name);
        }
        else if(!(src instanceof QuerySourceCachedValue)){
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
    FormDataSet,
    FormDataValue
}