//@ts-check

import {AdvDependableRef, DataGraphNodeBase} from './DataGraph';
import {QuerySource, QuerySourceCachedValue} from './QuerySource';
import {computed, ref, unref} from 'vue';


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
     * @param {FormDataValueSrc?} src
     * @param {SQLValue} initial_value 
     */
    constructor(dataset, src, initial_value = null) {
        this.dataset = dataset;
        this.src = src;
        this.initial_value = initial_value;
        this.local = ref(initial_value);

        this.changed = computed(() => this.is_changed());
    }

    refresh() {
        if(this.src === null) return;
        this.local.value = this.src.get_value();
    }
    reset() {
        if(this.src === null) return;
        this.local.value = this.initial_value;
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

class FormDataSet extends DataGraphNodeBase {

    constructor() {
        super();
        this.query_sources = [];

        /**@type {Object.<string, FormDataValue>} */
        this.values = {};
    }

    check_changed_impl() {
        for(const value of Object.values(this.values)){
            if(value.changed.value) return true;
        }
        return false;
    }
    
    update_impl()  { this.refresh(); }
    refresh_impl() { Object.values(this.values).forEach(v => v.refresh()); }
    reset()        { Object.values(this.values).forEach(v => v.reset()); }

    /**
     * 
     * @param {string} name 
     * @param {FormDataValueSrc?} src 
     * @param {SQLValue} initial_value 
     */
    add(name, src, initial_value = null) {
        if(this.values[name]) {
            throw new Error('VALUE ALREADY EXISTS: ' + name);
        }
        const value = new FormDataValue(this, src, initial_value);
        this.add_dependable(src);
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