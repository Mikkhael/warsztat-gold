//@ts-check
import { computed, unref, ref, reactive } from "vue";
import { escape_backtick, escape_sql_value } from "../../utils";
import ipc from "../../ipc";

//// HOW TO USE ////

/*

const dataset = new Dataset();

const sync1 = dataset.create_table_sync('tab1');
// inne potencjalne rodzaje synców...

const r1 = ref(1);

const val1 = dataset.create_value_raw   ('val1', 0);
const val2 = dataset.create_value_raw   ('val2', r1);
const val3 = dataset.create_value_raw   ('val3', 0, sync1, <'col3' = 'val3'>);
const val4 = dataset.create_value_synced('val4', 0, sync1, <'col4' = 'val4'>);

sync1.add_primary('prim1', r1)
sync1.add_primary('prim2', val1)
sync1.add_primary('prim3', 0)

const src1 = dataset.create_source_query(
    [
        ['col1'],                     // no auto-bind
        ['col2', '`a2.col2`']         // no auto-bind, renamed
        [val3]                        // auto bind to val3 (search the col name in dataset)
        [val4  , 'col4']              // auto-bind col4 to val4
        [val5  , 'col5', '`a2.col5`'] // auto bind col5 to val5, renamed

        // TODO think about ho to structure it
    ]
);



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

/**@template {SQLValue} T */
class DatasetValue {
    constructor(/**@type {import('vue').Ref<T> | T}*/ initial_value) {
        this.local   = /**@type {import('vue').Ref<T>} */ (ref(initial_value));
        this.changed = computed(() => false);
    }

    set    (/**@type {T}*/ new_value) { this.local.value = unref(new_value); }
    replace(/**@type {T}*/ new_value) { this.local.value = unref(new_value); }
    refresh(/**@type {T}*/ new_value) { this.local.value = unref(new_value); }
    retcon (/**@type {T}*/ new_value) {}
    revert(){}

    is_changed()   { return false; }
    is_to_update() { return true; }

    as_ref_changed() { return this.changed; }
    as_ref_local()   { return this.local; }
    as_ref_remote()  { return this.local; }
    as_local()       { return this.local.value; }
    as_remote()      { return this.local.value; }

    as_sql() {return escape_sql_value(this.as_local());}
}

/**
 * @template {SQLValue} T 
 * @extends DatasetValue<T>
*/
class DatasetValueSynced extends DatasetValue {
    constructor(/**@type {import('vue').Ref<T> | T}*/ initial_value) {
        super(initial_value);
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
};

////////////////// Utils ////////////////////////////////////////

function is_empty(/**@type {Object}*/ object) { return Object.keys(object).length === 0 }
class DVUtil {
    static is_to_update(/**@type {DatasetValuelike} */ value) { return (!(value instanceof DatasetValueSynced)) || value.is_to_update(); }
    static is_changed  (/**@type {DatasetValuelike} */ value) { return (value instanceof DatasetValueSynced) && value.is_changed(); }
    /**@template {SQLValue} T */
    static as_value    (/**@type {DatasetValuelike<T>} */ value) { return (value instanceof DatasetValue) ? value.as_local() : unref(value); }
    // static as_ref      (/**@type {DatasetValuelike} */ value) { return (value instanceof DatasetValue) ? value.as_ref_local() : value; }
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
    /**
     * @param {([string]|[string, string])[]} select_fields 
     * @param {(string | DatasetValueReflike)[]} query_rest
     */
    constructor(select_fields, query_rest){

        // TODO rewrite select_fields parsing, according to HOT TO USE
        this.select_sql = '';

        // const valid_select_fields = select_fields.map(field => {
        //     if(field.length === 1) {
        //         /**@type {[string, string]} */
        //         const res = [field[0], field[0]];
        //         return res;
        //     }
        //     return field;
        // })

        // this.select_fields = /**@type {[string, string][]} */ (valid_select_fields);
        // this.select_sql = `SELECT ` + this.select_fields.map(([name, as_name]) => `${name} as ${escape_backtick(as_name)}` );

        this.query_rest = query_rest;
        this.full_sql = computed(() => {
            return this.select_sql + ' ' + this.query_rest.map(part => {
                if(typeof part === "string")
                    return part;
                return escape_sql_value(DVUtil.as_value(part));
            });
        });
    }
}


////////////////// Dataset ////////////////////////////////////////

class Dataset {
    constructor(){
        this.table_syncs = /**@type {DatasetTableSync[]} */ ([]);
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
        return this.#create_value_impl(value_name, new DatasetValue(initial_value), table_sync, table_sync_column_name);
    }

    /**
     * @param {string} value_name 
     * @param {SQLValuelike} initial_value 
     * @param {DatasetTableSync=} table_sync
     * @param {string=} table_sync_column_name
     */
    create_value_synced(value_name, initial_value = null, table_sync, table_sync_column_name){
        return this.#create_value_impl(value_name, new DatasetValueSynced(initial_value), table_sync, table_sync_column_name);
    }
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






