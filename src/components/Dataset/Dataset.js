//@ts-check
import { computed, unref, ref, reactive } from "vue";
import { escape_backtick, escape_sql_value, iterate_query_result_values, iterate_query_result_values_single_row } from "../../utils";
import ipc from "../../ipc";

//// HOW TO USE ////

/*

const dataset = new Dataset();

const sync1 = dataset.create_table_sync('tab1');
// inne potencjalne rodzaje synców...

const r1 = ref(1);
const r2 = ref(2);

const val1 = dataset.create_value_raw   ('val1', 0);
const val2 = dataset.create_value_raw   ('val2', r1);
const val3 = dataset.create_value_raw   ('val3', 0, sync1, <'col3' = 'val3'>);
const val4 = dataset.create_value_synced('val4', 0, sync1, <'col4' = 'val4'>);

sync1.add_primary('prim1', r1)
sync1.add_primary('prim2', val1)
sync1.add_primary('prim3', 0)

const src1 = dataset.create_source_query();

// unbinded fields
src1.select('col0');
src1.select(`a2col0`, 'a2.`col0`');

// directly binded fields
src1.select_bind(val1, 'col1');
src1.select_bind(val2, `col2`, 'a2.`col2`');
src1.select_bind(r1,   'col3');
src1.select_bind(r2,   'sum',  'decimal_add(`col4` + `col5`)');

// fields binded with name given during dataset value creation (cannot be Refs)
src1.select_auto(val1);
src1.select_auto(val2, 'a2.`val2`');
src1.select_auto(val3, 'decimal_add(`col4` + `col5`)');

src1.set_body_query([
    'FROM ...',
    'WHERE X = ', val1,
    'AND Y = ', r1
]);


dataset.perform_update_all()            .then(...).catch(...);
dataset.perform_query_all()             .then(...).catch(...);
dataset.perform_query_and_replace_all() .then(...).catch(...);
dataset.perform_query_and_refresh_all() .then(...).catch(...);
dataset.perform_query_and_retcon_all()  .then(...).catch(...);

*/


////////////////// Dataset Values ////////////////////////////////////////


/**@typedef {number | string | null} SQLValue */
/**
 * @template {SQLValue} [T=SQLValue]
 * @typedef {T | import('vue').Ref<T>} SQLValuelike
 * */
/**
 * @template {SQLValue} [T=SQLValue]
 * @typedef {T | import('vue').Ref<T> | DatasetValue<T>} DatasetValuelike 
 * */
/**
 * @template {SQLValue} [T=SQLValue]
 * @typedef {import('vue').Ref<T> | DatasetValue<T>} DatasetValueReflike 
 * */

/** 
 * @template {SQLValue} [T=SQLValue]
 * @typedef {{local: T, remote: T | undefined, changed: boolean}} ReactiveDatasetValue
 * */

/**@template {SQLValue} T */
class DatasetValue {
    constructor(/**@type {import('vue').Ref<T> | T}*/ initial_value, /**@type {string} */ name) {
        this.name    = name;
        this.local   = /**@type {import('vue').Ref<T>} */ (ref(initial_value));
        // this.changed = computed(() => false);
    }

    set    (/**@type {T}*/ new_value) { this.local.value = unref(new_value); }
    replace(/**@type {T}*/ new_value) { this.local.value = unref(new_value); }
    refresh(/**@type {T}*/ new_value) { this.local.value = unref(new_value); }
    retcon (/**@type {T}*/ new_value) {}
    revert(){}

    is_changed()   { return false; }
    is_to_update() { return true; }

    // as_ref_changed() { return this.changed; }
    as_ref_local()   { return this.local; }
    as_ref_remote()  { return this.local; }
    as_local()       { return this.local.value; }
    as_remote()      { return this.local.value; }

    as_sql() {return escape_sql_value(this.as_local());}

    /** @returns {ReactiveDatasetValue<T>}*/
    to_reactive_values() {return reactive({
            local:  this.local,
            remote: undefined,
            changed: false
        });
    }
}

/**
 * @template {SQLValue} T 
 * @extends DatasetValue<T>
*/
class DatasetValueSynced extends DatasetValue {
    constructor(/**@type {import('vue').Ref<T> | T}*/ initial_value, /**@type {string} */ name) {
        super(initial_value, name);
        this.remote = /**@type {import('vue').Ref<T>} */ (ref(unref(initial_value)));
        this.changed = computed(() => this.local.value !== this.remote.value);
    }

    replace(/**@type {T}*/ new_value) {
        this.local.value  = unref(new_value);
        this.remote.value = unref(new_value);
    }
    refresh(/**@type {T}*/ new_value) {
        if(!this.is_changed())
            this.local.value = unref(new_value);
        this.remote.value = unref(new_value);
    }
    retcon(/**@type {T}*/ new_value) { this.remote.value = unref(new_value); }
    revert() { this.local.value = this.remote.value; }

    is_changed()   { return this.changed.value; }
    is_to_update() { return this.changed.value; }

    as_ref_changed() { return this.changed; }
    as_ref_local()   { return this.local; }
    as_ref_remote()  { return this.remote; }
    as_local()       { return this.local.value; }
    as_remote()      { return this.remote.value; }
    
    to_reactive_values() {return reactive({
            local:   this.local,
            remote:  this.remote,
            changed: this.changed
        });
    }
};

////////////////// Utils ////////////////////////////////////////

function is_empty(/**@type {Object}*/ object) { return Object.keys(object).length === 0 }
class DVUtil {
    static is_to_update(/**@type {DatasetValuelike} */ value) { return (!(value instanceof DatasetValueSynced)) || value.is_to_update(); }
    static is_changed  (/**@type {DatasetValuelike} */ value) { return (value instanceof DatasetValueSynced) && value.is_changed(); }
    static as_value    (/**@type {DatasetValuelike} */ value) { return (value instanceof DatasetValue) ? value.as_local() : unref(value); }
    static as_ref      (/**@type {DatasetValueReflike} */ value) { return (value instanceof DatasetValue) ? value.as_ref_local() : value; }

    static set    (/**@type {DatasetValueReflike} */ value, /**@type {SQLValue}*/ new_value) { (value instanceof DatasetValue) ? value.set    (new_value) : (value.value = unref(new_value)); }
    static replace(/**@type {DatasetValueReflike} */ value, /**@type {SQLValue}*/ new_value) { (value instanceof DatasetValue) ? value.replace(new_value) : (value.value = unref(new_value)); }
    static refresh(/**@type {DatasetValueReflike} */ value, /**@type {SQLValue}*/ new_value) { (value instanceof DatasetValue) ? value.refresh(new_value) : (value.value = unref(new_value)); }
    static retcon (/**@type {DatasetValueReflike} */ value, /**@type {SQLValue}*/ new_value) { (value instanceof DatasetValue) && value.retcon(new_value) }
    static revert (/**@type {DatasetValueReflike} */ value )                                 { (value instanceof DatasetValue) && value.revert(); }
}


////////////////// Table Sync ////////////////////////////////////////

class DatasetTableSync{
    /**
     * @param {string} table_name 
     */
    constructor(table_name) {
        this.table_name = table_name;
        this.synced_values   = /**@type {Object.<string, DatasetValuelike>} */ ({});
        this.primary_columns = /**@type {Object.<string, DatasetValuelike>} */ ({});
    }

    /**
     * @param {string} column_name 
     * @param {DatasetValuelike} value 
     */
    add_synced_value(column_name, value) {
        this.synced_values[column_name] = value;
    }

    /**
     * @param {string} column_name 
     * @param {DatasetValuelike} value 
     */
    add_primary(column_name, value) {
        this.primary_columns[column_name] = value;
    }

    is_to_update() {
        return Object.values(this.synced_values).some(x => DVUtil.is_to_update(x));
    }

    get_columns_to_update(force = false) {
        if(force) {
            return Object.entries(this.synced_values);
        }
        return Object.entries(this.synced_values).filter(x => DVUtil.is_to_update(x[1]));
    }

    get_update_query(force = false) {
        const cols = this.get_columns_to_update(force);
        if (cols.length === 0) return "";

        const pris = Object.entries(this.primary_columns);

        const set   = cols.map(([name, val]) => `\`${name}\` = ${escape_sql_value( DVUtil.as_value(val) )}`).join(",");
        const where = pris.map(([name, val]) => `\`${name}\` = ${escape_sql_value( DVUtil.as_value(val) )}`).join(" AND ");
        
        const query = `UPDATE \`${this.table_name}\` SET ${set} WHERE ${where};`;
        return query;
    }

    async perform_update(force = false) {
        const update_query = this.get_update_query(force);
        if(update_query === "")
            return 0;
        return await ipc.db_execute(update_query);
    }
}



////////////////// Source Query ////////////////////////////////////////


class DatasetSourceQuery{
    constructor(){
        this.column_binds     = /**@type {Object.<string, DatasetValueReflike>} */ ({});
        this.select_fields    = /**@type {import('vue').Ref<([string, string?])[]>} */ (ref([]));
        this.query_body_parts = /**@type {import('vue').Ref<(string | DatasetValueReflike)[]>} */ (ref([]));

        this.query_select_sql = computed(() => {
            return this.select_fields.value.map(([name, definition]) => {
                if(definition === undefined)
                    return escape_backtick(name);
                return `${definition} as ${escape_backtick(name)}`;
            }).join(', ');
        });
        
        this.query_body_sql = computed(() => {
            return this.query_body_parts.value.map(part => {
                if(typeof part === 'string')
                    return part;
                return escape_sql_value(DVUtil.as_value(part));
            }).join('');
        });

        this.query_sql = computed(() => {
            return 'SELECT ' + this.query_select_sql.value + ' ' + this.query_body_sql.value;
        });
    }

    /**
     * @param {string} name 
     * @param {string=} definition 
     */
    select_raw(name, definition) {
        this.select_fields.value.push([name, definition]);
    }
    
    /**
     * @param {DatasetValueReflike} binder 
     * @param {string} name 
     * @param {string=} definition 
     */
    select_bind(binder, name, definition) {
        this.select_raw(name, definition);
        if(this.column_binds[name] !== undefined)
            console.error(`Overwriting binding for value ${name} with definition ${definition}`);
        this.column_binds[name] = binder;
    }
    
    /**
     * @param {DatasetValue} binder 
     * @param {string=} definition 
     */
    select_auto(binder, definition) {
        this.select_bind(binder, binder.name, definition);
    }

    /**
     * @param {(string | DatasetValueReflike)[]} query_body_parts 
     */
    set_body_query_and_finalize(query_body_parts) {
        this.query_body_parts.value = query_body_parts;
    }


    async perform_query(){
        return await ipc.db_query(this.query_sql.value);
    }

    /**
     * @param {(value: DatasetValueReflike, new_value: SQLValue) => void} callback 
     */
    async #perform_after_query(callback) {
        const result = await this.perform_query();
        iterate_query_result_values_single_row(result, (value, col) => {
            const binder = this.column_binds[col];
            if(!binder) return;
            callback(binder, value);
        });
        return result;
    }

    async perform_query_and_replace() {return await this.#perform_after_query(DVUtil.replace);}
    async perform_query_and_refresh() {return await this.#perform_after_query(DVUtil.refresh);}
    async perform_query_and_retcon () {return await this.#perform_after_query(DVUtil.retcon);}
}


////////////////// Dataset ////////////////////////////////////////

class Dataset {
    constructor(){
        this.table_syncs = /**@type {DatasetTableSync[]} */ ([]);
        this.source_queries = /**@type {DatasetSourceQuery[]} */ ([]);
        this.values = /**@type {Object.<string, DatasetValue>} */ ({});
    }

    /**
     * @param {string} table_name 
     */
    create_table_sync(table_name) {
        const sync = new DatasetTableSync(table_name);
        this.table_syncs.push(sync);
        return sync;
    }

    create_source_query() {
        const src = new DatasetSourceQuery();
        this.source_queries.push(src);
        return src;
    }



    // TODO naprtawić templaty

    /**
     * @param {string} value_name 
     * @param {DatasetValue} value 
     * @param {DatasetTableSync=} table_sync
     * @param {string=} table_sync_column_name
     */
    #create_value_impl(value_name, value, table_sync, table_sync_column_name){
        if(this.values[value_name] !== undefined) {
            console.error(`Reinitializing Dataset Value with name: ${value_name}`);
        }
        this.values[value_name] = value;
        if(table_sync) {
            const column_name = table_sync_column_name ?? value_name;
            table_sync.add_synced_value(column_name, value);
        }
        return value;
    }

    /**
     * @param {string} value_name 
     * @param {SQLValuelike} initial_value 
     * @param {DatasetTableSync=} table_sync
     * @param {string=} table_sync_column_name
     */
    create_value_raw(value_name, initial_value = null, table_sync, table_sync_column_name){
        return this.#create_value_impl(value_name, new DatasetValue(initial_value, value_name), 
                                        table_sync, table_sync_column_name);
    }

    /**
     * @param {string} value_name 
     * @param {SQLValuelike} initial_value 
     * @param {DatasetTableSync=} table_sync
     * @param {string=} table_sync_column_name
     */
    create_value_synced(value_name, initial_value = null, table_sync, table_sync_column_name){
        return this.#create_value_impl(value_name, new DatasetValueSynced(initial_value, value_name),
                                        table_sync, table_sync_column_name);
    }

    async perform_update_all()            {return await Promise.all(this.table_syncs.map(x => x.perform_update()))}

    async perform_query_all()             {return await Promise.all(this.source_queries.map(x => x.perform_query()))}
    async perform_query_and_replace_all() {return await Promise.all(this.source_queries.map(x => x.perform_query_and_replace()))}
    async perform_query_and_refresh_all() {return await Promise.all(this.source_queries.map(x => x.perform_query_and_refresh()))}
    async perform_query_and_retcon_all () {return await Promise.all(this.source_queries.map(x => x.perform_query_and_retcon()))}
}


// const d = new Dataset();
// const v1 = d.create_value_raw('v1', 'asd1');
// const v2 = d.create_value_raw('v2', 123);
// const v3 = d.create_value_raw('v3', null);






////////////////////////////////////////////////////////////////////////


export {
    Dataset,
    DVUtil,
    DatasetValue,
    DatasetValueSynced,
    DatasetTableSync
}






