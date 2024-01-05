//@ts-check

import { escape_sql_value, query_row_to_object } from './utils';
import ipc from './ipc';
import {ref, unref, readonly, computed, watch} from 'vue'


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

/**@template T */
class FormValue {
    constructor(/**@type {T}*/ initial_value) {
        this.value = /**@type {import('vue').Ref<T>} */ (ref(initial_value));
        this.changed = computed(() => false);
        // this.is_changed = readonly(false);
    }

    set(new_value)     { this.value.value = unref(new_value); }
    replace(new_value) { this.value.value = unref(new_value); }
    refresh(new_value) { this.value.value = unref(new_value); }
    retcon(new_value) {}
    revert(){}

    is_changed() { return this.changed.value; }

    as_ref_changed() { return this.changed; }
    as_ref() {return this.value;}
    as_value() {return this.value.value;}
}


/**
 * @template T 
 * @extends FormValue<T>
*/
class RemoteFormValue extends FormValue {
    constructor(/**@type {T}*/ initial_value) {
        super(initial_value);
        this.true_value = /**@type {import('vue').Ref<T>} */ (ref(initial_value));
        this.changed = computed(() => this.value.value !== this.true_value.value);
        // this.is_changed = computed(() => this.value != this.true_value);
    }

    replace(new_value) {
        this.true_value.value = unref(new_value);
        this.value.value      = unref(new_value);
    }
    refresh(new_value) {
        if(!this.is_changed())
            this.value.value  = unref(new_value);
        this.true_value.value = unref(new_value);
    }
    retcon(new_value) { this.true_value.value = unref(new_value); }
    revert() { this.value.value = this.true_value.value; }
    
    as_ref_true() {return this.true_value;}
    as_value_true() {return this.true_value;}
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
     * @param {FormManager} form_manager
     * @param {string} table_name 
     * @param {Object.<string, any>} primary 
     * @param {Object.<string, any>} columns 
     */
    constructor(form_manager, table_name, primary, columns) {
        this.form_manager = form_manager;
        this.table_name = table_name;
        this.#convert_all_entries_to_FormValues(primary);
        this.#convert_all_entries_to_FormValues(columns);
        this.primary = /**@type {Object.<string, FormValue>} */ (primary);
        this.columns = /**@type {Object.<string, FormValue>} */ (columns);
    }

    /**
     * @param {string} prefix 
     */
    auto_add_columns_with_prefix(prefix) {
        const entries            = Object.entries( this.form_manager.values );
        const matching_entries   = entries.filter(([key, _]) => key.startsWith(prefix));
        const removed_prefix     = matching_entries.map(([key, val]) => [key.slice(prefix.length), val]);
        Object.assign(this.columns, Object.fromEntries(removed_prefix));
    }

    add_column(name, value) {
        this.columns[name] = this.#convert_value_to_FormValue(value);
    }

    /**
     * @template T 
     * @returns {FormValue<T>}
    */
    #convert_value_to_FormValue(/**@type {T} */ value) {
        if(value instanceof FormValue)
            return value;
        return new FormValue(unref(value));
    }
    #convert_all_entries_to_FormValues(object) {
        for(let key in object ) {
            object[key] = this.#convert_value_to_FormValue(object[key]);
        }
    }

    is_changed() {
        return Object.values(this.columns).some(x => x.is_changed());
    }

    get_update_query(force = false) {
        let ce = Object.entries(this.columns)
        if(!force)
            ce = ce.filter(x => x[1].is_changed());
        if (ce.length == 0) return "";
        const pe = Object.entries(this.primary);

        const set   = ce.map(([name, val]) => `\`${name}\` = ${escape_sql_value( val.as_value() )}`).join(",");
        const where = pe.map(([name, val]) => `\`${name}\` = ${escape_sql_value( val.as_value() )}`).join(" AND ");
        
        const query = `UPDATE \`${this.table_name}\` SET ${set} WHERE ${where};`;
        return query;
    }

    async update(force = false) {
        const update_query = this.get_update_query(force);
        if(update_query === "")
            return 0;
        return await ipc.db_execute(update_query);
    }
}

class FormManager {
    constructor(/**@type {import('vue').Ref<HTMLFormElement> | null} */ form_elem = null) {
        this.form_elem = form_elem;
        /**@type {Object.<string, FormValue>} */
        this.values = {};
        /**@type {{prefix: string, sync: TableUpdateSyncManager}[]} */
        this.update_tables = [];
        /**@type {import('vue').ComputedRef<string> | null} */
        this.fetch_query = null;
    }

    set_fetch_query(/**@type {import('vue').ComputedRef<string>} */ fetch_query) {
        this.fetch_query = fetch_query;
    }

    /**
     * @template T
     * @param {string} name 
     * @param {T} initial_value 
     */
    new_local(name, initial_value){
        const formValue = new FormValue(initial_value);
        this.values[name] = formValue;
        return formValue;
    }
    /**
     * @template T
     * @param {string} name 
     * @param {T} initial_value 
     */
    new_remote(name, initial_value){
        const formValue = new RemoteFormValue(initial_value);
        this.values[name] = formValue;
        return formValue;
    }
    
    /**
     * @param {string} table_name 
     * @param {Object.<string, FormValue>} primary 
     * @param {Object.<string, FormValue>} columns
     */
    add_table_sync(table_name, prefix, primary, columns = {}) { 
        const sync = new TableUpdateSyncManager(this, table_name, primary, columns);
        this.update_tables.push({prefix, sync});
        if(prefix) sync.auto_add_columns_with_prefix(prefix);
        return sync;
    }

    set    (/**@type {Object.<string, any>}*/ new_values) { for(let name in new_values) this.values[name]?.set    (new_values[name]); return new_values; }
    replace(/**@type {Object.<string, any>}*/ new_values) { for(let name in new_values) this.values[name]?.replace(new_values[name]); return new_values; }
    refresh(/**@type {Object.<string, any>}*/ new_values) { for(let name in new_values) this.values[name]?.refresh(new_values[name]); return new_values; }
    retcon (/**@type {Object.<string, any>}*/ new_values) { for(let name in new_values) this.values[name]?.retcon (new_values[name]); return new_values; }
    revert (/**@type {string[]}*/ names)                  { for(let name of names)      this.values[name]?.revert(); }

    throw_if_invalid() {
        if(this.form_elem) {
            const is_valid = unref(this.form_elem).reportValidity();
            if(!is_valid) {
                throw new Error("Form Invalid");
            }
        }
    }

    async update_all(force = false, bypass_validation = false) {
        const syncs   = this.update_tables.map(x => x.sync);
        const queries = syncs.map(x => x.get_update_query(force)).filter(x => x.length > 0);
        if(queries.length == 0) {
            return 0;
        }
        if(!bypass_validation) {
            this.throw_if_invalid();
        }
        const batch_query = queries.join('');
        return await ipc.db_execute_batch(batch_query).then(() => queries.length);
    }
    
    /**
     * @returns {Promise<[number, Object.<string, any> | null]>}
     */
    async update_all_and_refresh(force = false, bypass_validation = false) {
        const updated_rows = await this.update_all(force, bypass_validation);
        const res = (updated_rows != 0) ? await this.fetch_row_and_refresh() : null;
        return [updated_rows, res];
    }

    async fetch_row() {
        const [rows, col_names] = await ipc.db_query(this.fetch_query?.value || "");
        if(rows.length <= 0) {
            return {};
        }
        return query_row_to_object(rows[0], col_names);
    }

    fetch_row_and_replace() {return this.fetch_row().then(res => this.replace(res)); }
    fetch_row_and_refresh() {return this.fetch_row().then(res => this.refresh(res)); }
    fetch_row_and_retcon()  {return this.fetch_row().then(res => this.retcon(res)); }
    
}

export {
    FormValue,
    RemoteFormValue,
    FormManager,
    TableUpdateSyncManager
}