//@ts-check

import { escape_sql_value } from './utils';
import ipc from './ipc';
import {reactive, unref, toRef} from 'vue'


/*

Jak wygląda powiązanie reaktywnosci z kontrolkami formularza, z uwzględnieniem mechanizmu updateowania oryginalnych danych w bazie

const formValues = new FormValuesCollection();
const formValue1 = formValues.new_local ("name1", 123); // returns reactive FormValue
const formValue2 = formValues.new_remote("name2", "a"); // returns reactive RemoteFormValue

formValues.replace({ // [replace, set, refresh, replace_and_set]
    name1: 456,
    name2: 'b'
});
replace_and_set - current(if unchanged) + true
replace - current + true
set     - current
refresh - true

const formTab1Col1 = formTab1.new("column1", 123);

formTab1Col1.fetch();
formTab1.fetch();
formValues.fetch();

formTab1Col1.update();
formTab1.update();
formValues.update();

formTab1Col1.set(456);
formTab1Col1.replace(789);

<Kontrolka v-model:value="formValue1" >
<Kontrolka v-model:value="formTab1Col1" >

*/

class FormValue {
    constructor(/**@type {any}*/ initial_value = null) {
        this.value = initial_value;
        // this.is_changed = readonly(false);
    }

    set(new_value) { this.value = new_value; }
    replace(new_value) { this.value = new_value; }
    refresh(new_value) { this.value = new_value; }
    retcon(new_value) {}
    revert(){}

    is_changed() {return false;}

    as_ref() {return toRef(this, 'value');}
}

class RemoteFormValue extends FormValue {
    constructor(/**@type {any}*/ initial_value = null) {
        super(initial_value);
        this.true_value = initial_value;
        // this.is_changed = computed(() => this.value != this.true_value);
    }

    replace(new_value) {
        this.true_value = new_value;
        this.value      = new_value;
    }
    refresh(new_value) {
        if(!this.is_changed())
            this.value = new_value;
        this.true_value = new_value;
    }
    retcon(new_value) { this.true_value = new_value; }
    revert() { this.value = this.true_value; }
    is_changed() { return this.value != this.true_value}
};

/*
    To sync up the update to a table, we need:
    - table name
    - column names of primary keys
    - sources of primary key values:
        - from a raw ref (or raw value)
    - column names to set
    - sources for setted values:
        - from a raw ref (or raw value)
        - from the form's values, by value name (it can detect, if it was changed (but dosen't))
*/

class TableUpdateSyncManager {
    /**
     * 
     * @param {string} table_name 
     * @param {Object.<string, any>} primary 
     * @param {Object.<string, any>} columns 
     */
    constructor(table_name, primary, columns) {
        this.table_name = table_name;
        this.primary = primary;
        this.columns = columns;
    }

    get_update_query() {
        const pe = Object.entries(this.primary);
        const ce = Object.entries(this.columns);

        const set   = ce.map(([name, val]) => `\`${name}\` = ${escape_sql_value(unref(val))}`).join(",");
        const where = pe.map(([name, val]) => `\`${name}\` = ${escape_sql_value(unref(val))}`).join(" AND ");
        
        const query = `UPDATE \`${this.table_name}\` SET ${set} WHERE ${where};`;
        return query;
    }
}

class FormValuesCollection {
    constructor() {
        /**@type {Object.<string, FormValue>} */
        this.values = {};
        /**@type {Object.<string, TableUpdateSyncManager>} */
        this.update_tables = {};
    }

    /**
     * @param {string} name 
     * @param {any} value 
     * @returns {FormValue}
     */
    new_local(name, value = null){
        const formValue = reactive(new FormValue(value));
        this.values[name] = formValue;
        return formValue;
    }
    /**
     * @param {string} name 
     * @param {any} value 
     * @returns {RemoteFormValue}
     */
    new_remote(name, value = null){
        const formValue = reactive(new RemoteFormValue(value));
        this.values[name] = formValue;
        return formValue;
    }
    
    /**
     * @param {string} table_name 
     * @param {Object.<string, any>} primary 
     * @param {Object.<string, any>} columns 
     */
    add_table_sync(table_name, primary, columns) { 
        const table_sync = new TableUpdateSyncManager(table_name, primary, columns);
        this.update_tables[table_name] = table_sync;
        return table_sync;
    }

    set    (/**@type {Object.<String, any>}*/ new_values) { for(let name in new_values) this.values[name]?.set    (new_values[name]); }
    replace(/**@type {Object.<String, any>}*/ new_values) { for(let name in new_values) this.values[name]?.replace(new_values[name]); }
    refresh(/**@type {Object.<String, any>}*/ new_values) { for(let name in new_values) this.values[name]?.refresh(new_values[name]); }
    retcon (/**@type {Object.<String, any>}*/ new_values) { for(let name in new_values) this.values[name]?.retcon (new_values[name]); }
    revert (/**@type {string[]}*/ names)                  { for(let name of names)      this.values[name]?.revert(); }
}

export {
    FormValue,
    RemoteFormValue,
    FormValuesCollection,
    TableUpdateSyncManager
}