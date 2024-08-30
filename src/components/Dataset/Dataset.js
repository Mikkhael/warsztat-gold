//@ts-check
import { computed, unref, ref, reactive } from "vue";
import { escape_backtick, escape_sql_value, iterate_query_result_values, iterate_query_result_values_single_row } from "../../utils";
import ipc from "../../ipc";

//// HOW TO USE ////

/*

const dataset = new Dataset();

const sync1 = dataset.create_table_sync('tab1');
const src1  = dataset.create_source_query();
const src2  = dataset.create_simple_source_query();

// inne potencjalne rodzaje synców/sourceów...

const r1 = ref(1);
const r2 = ref(2);

const val1 = dataset.create_value_raw   ('val1', 0);
const val2 = dataset.create_value_raw   ('val2', r1);       // synchronized with ref
// auto syncs/bindings
const val3 = dataset.create_value_raw   ('val3', 0, sync1);
const val4 = dataset.create_value_synced('val4', 0, src1);  
const val5 = dataset.create_value_synced('val5', 0, [src1, 'a2.`col4`']);
const val6 = dataset.create_value_synced('val6', 0, sync1, sync2, src1, [src2, 'a2.`col4`']);

sync1.add_primary('prim1', r1)
sync1.add_primary('prim2', val1)
sync1.add_primary('prim3', 0)

// unbinded fields
src1.select_raw('col0');
src1.select_raw(`a2col0`, 'a2.`col0`');

// directly binded fields
src1.select_bind(val1, 'col1');
src1.select_bind(val2, `col2`, 'a2.`col2`');
src1.select_bind(r1,   'col3');
src1.select_bind(r2,   'sum',  'decimal_add(`col4` + `col5`)');

src1.set_body_query([
    'FROM ...',
    'WHERE X = ', val1,
    'AND Y = ', r1
]);

// Advanced binding
src2.set_query(['SELECT * FROM tab1 WHERE a = ', r1, ' AND b = ', val1]);
src2.set_handler((rows, col_names) => {
    ///...    
})

dataset.perform_update_all()            .then(...).catch(...);
dataset.perform_query_all()             .then(...).catch(...);
dataset.perform_query_and_replace_all() .then(...).catch(...);
dataset.perform_query_and_refresh_all() .then(...).catch(...);
dataset.perform_query_and_retcon_all()  .then(...).catch(...);

*/


////////////////// Dataset Values ////////////////////////////////////////


/**
 * @typedef {number | string | null} SQLValue 
 * @typedef {SQLValue | import('vue').Ref<SQLValue>} SQLValuelike
 * @typedef {SQLValue | import('vue').Ref<SQLValue> | DatasetValue} DatasetValuelike 
 * @typedef {import('vue').Ref<SQLValue> | DatasetValue} DatasetValueReflike 
 * @typedef {{local: SQLValue, remote: SQLValue | undefined, changed: boolean}} ReactiveDatasetValue
 *  */

class DatasetValue {
    constructor(/**@type {SQLValuelike}*/ initial_value, /**@type {string} */ name) {
        // this.name    = name;
        this.local         = /**@type {import('vue').Ref<SQLValue>} */ (ref(initial_value));
        this.initial_value = unref(initial_value);
        // this.changed = computed(() => false);
    }

    reinitialize() {this.local.value = this.initial_value;}
    set    (/**@type {SQLValuelike}*/ new_value) { this.local.value = unref(new_value); }
    replace(/**@type {SQLValuelike}*/ new_value) { this.local.value = unref(new_value); }
    refresh(/**@type {SQLValuelike}*/ new_value) { this.local.value = unref(new_value); }
    retcon (/**@type {SQLValuelike}*/ new_value) {}
    revert(){}

    is_changed()   { return false; }
    is_to_update() { return true; }

    // as_ref_changed() { return this.changed; }
    as_ref_local()   { return this.local; }
    as_ref_remote()  { return this.local; }
    as_local()       { return this.local.value; }
    as_remote()      { return this.local.value; }

    as_sql() {return escape_sql_value(this.as_local());}

    /** @returns {ReactiveDatasetValue}*/
    to_reactive_values() {return reactive({
            local:  this.local,
            remote: undefined,
            changed: false
        });
    }
}
class DatasetValueSynced extends DatasetValue {
    constructor(/**@type {SQLValuelike}*/ initial_value, /**@type {string} */ name) {
        super(initial_value, name);
        this.remote = /**@type {import('vue').Ref<SQLValue>} */ (ref(unref(initial_value)));
        this.changed = computed(() => this.local.value !== this.remote.value);
    }

    reinitialize() {
        this.local.value  = this.initial_value;
        this.remote.value = null;
    }

    replace(/**@type {SQLValuelike}*/ new_value) {
        this.local.value  = unref(new_value);
        this.remote.value = unref(new_value);
    }
    refresh(/**@type {SQLValuelike}*/ new_value) {
        if(!this.is_changed())
            this.local.value = unref(new_value);
        this.remote.value = unref(new_value);
    }
    retcon(/**@type {SQLValuelike}*/ new_value) { this.remote.value = unref(new_value); }
    revert() { this.local.value = this.remote.value; }

    is_changed()   { return this.changed.value; }
    is_to_update() { return this.changed.value; }

    as_ref_changed() { return this.changed; }
    as_ref_local()   { return this.local; }
    as_ref_remote()  { return this.remote; }
    as_local()       { return this.local.value; }
    as_remote()      { return this.remote.value; }
    
    /** @returns {ReactiveDatasetValue}*/
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

class SourceQuery{
    async perform_query()             {return /**@type {import('../../ipc').IPCQueryResult} */ ([[], []]) }
    async perform_query_and_replace() {return await this.perform_query(); }
    async perform_query_and_refresh() {return await this.perform_query(); }
    async perform_query_and_retcon () {return await this.perform_query(); }
}

class DatasetSourceQuery extends SourceQuery{

    constructor(){
        super();
        this.column_binds     = /**@type {Object.<string, DatasetValueReflike>} */ ({});
        this.select_fields    = /**@type {import('vue').Ref<([string, string?])[]>} */ (ref([]));
        this.query_body_parts = /**@type {import('vue').Ref<(string | DatasetValueReflike)[]>} */ (ref([]));
        this.advanced_binder_function = /**@type {QueryResultCallback?} */ (null);

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
            return 'SELECT ' + this.query_select_sql.value + ' ' + this.query_body_sql.value + ';';
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
    
    // /**
    //  * @param {DatasetValue} binder 
    //  * @param {string=} definition 
    //  */
    // select_auto(binder, definition) {
    //     this.select_bind(binder, binder.name, definition);
    // }

    /**
     * @param {(string | DatasetValueReflike)[]} query_body_parts 
     */
    set_body_query_and_finalize(query_body_parts) {
        this.query_body_parts.value = query_body_parts;
    }


    async perform_query(){
        const result = await ipc.db_query(this.query_sql.value);
        if(this.advanced_binder_function) {
            this.advanced_binder_function(result[0], result[1]);
        }
        return result;
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


class SimpleSourceQuery extends SourceQuery{

    /**@typedef {(rows: any[][], column_names: string[]) => any} QueryResultCallback */

    constructor(){
        super();
        this.query_handler = /**@type {QueryResultCallback?} */ (null);
        this.query_parts = /**@type {import('vue').Ref<(string | DatasetValueReflike)[]>} */ (ref([]));
        this.last_result = /**@type {import('vue').Ref<import('../../ipc').IPCQueryResult>} */ (ref([[], []]));
        
        this.query_sql = computed(() => {
            return this.query_parts.value.map(part => {
                if(typeof part === 'string')
                    return part;
                return escape_sql_value(DVUtil.as_value(part));
            }).join('') + ';';
        });
    }

    /**
     * @param {(string | DatasetValueReflike)[]} query_parts 
     */
    set_query(query_parts) {
        this.query_parts.value = query_parts;
    }

    /**
     * @param {QueryResultCallback} query_handler 
     */
    set_handler(query_handler) {
        this.query_handler = query_handler;
    }

    /**
     * @param {QueryResultCallback} computed_definition 
     */
    to_computed(computed_definition) {
        const res = computed(() => {
            return computed_definition(this.last_result.value[0], this.last_result.value[1]);
        });
        return res;
    }


    async perform_query(){
        // console.log("QUERY SQL: ", this.query_sql.value);
        const result = await ipc.db_query(this.query_sql.value);
        // console.log("QUERY RES: ", result, this.query_sql.value);
        this.last_result.value = result;
        if(this.query_handler) {
            this.query_handler(result[0], result[1]);
        }
        return result;
    }
}


////////////////// Dataset ////////////////////////////////////////

class Dataset {
    constructor(){
        this.table_syncs = /**@type {DatasetTableSync[]} */ ([]);
        this.source_queries = /**@type {SourceQuery[]} */ ([]);
        this.values = /**@type {Object.<string, DatasetValue>} */ ({});

        this.insert_mode = ref(false);
        this.forms = /**@type {import('vue').Ref<HTMLFormElement>[]} */ ([]);
        this.index = ref(/**@type {SQLValue} */ (null));
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

    create_simple_source_query() {
        const src = new SimpleSourceQuery();
        this.source_queries.push(src);
        return src;
    }


    /**
     * @param {boolean} value 
     */
    set_insert_mode(value){
        this.insert_mode.value = value;
    }
    /**
     * @param {SQLValue} value 
     */
    set_index(value){
        this.index.value = value;
    }
    get_index_ref() { return this.index; }
    get_index()     { return this.index.value; }

    /**
     * 
     * @param {import('vue').Ref<HTMLFormElement>} value 
     */
    assosiate_form(value) {
        this.forms.push(value);
    }

    reportFormValidity(){
        return this.forms.map(x => x.value.reportValidity()).every(x => x);
    }


    /**
     * @typedef {DatasetTableSync | DatasetSourceQuery} AutoBindingTarget
     * @typedef {AutoBindingTarget | [AutoBindingTarget, ...any]} AutoBindingTargetWithArgs
     */


    /**
     * @param {string} value_name 
     * @param {DatasetValue} value 
     * @param {...AutoBindingTargetWithArgs} auto_binding_targets
     */
    #create_value_impl(value_name, value, ...auto_binding_targets){
        if(this.values[value_name] !== undefined) {
            console.error(`Reinitializing Dataset Value with name: ${value_name}`);
        }
        this.values[value_name] = value;

        for(let binding_target_with_args of auto_binding_targets) {
            let binding_target;
            let binding_args = [];
            if(binding_target_with_args instanceof Array) {
                [binding_target, ...binding_args] = binding_target_with_args;
            } else {
                binding_target = binding_target_with_args;
            }
            // console.log(`PARSING AUTO BINDING`, value_name, binding_target, binding_args);
            if(binding_target instanceof DatasetTableSync) {
                // console.log('AUTO SYNC:',       binding_args[0] ?? value_name, value);
                binding_target.add_synced_value(binding_args[0] ?? value_name, value);
                continue;
            }
            if(binding_target instanceof DatasetSourceQuery) {
                // console.log('AUTP BIND:',  value, binding_args[1] ?? value_name, binding_args[0]);
                binding_target.select_bind(value, binding_args[1] ?? value_name, binding_args[0]);
                continue;
            }
        }

        return value;
    }

    /**
     * @param {string} value_name 
     * @param {SQLValuelike} initial_value 
     * @param {...AutoBindingTargetWithArgs} auto_binding_targets
     */
    create_value_raw(value_name, initial_value = null, ...auto_binding_targets){
        return this.#create_value_impl(value_name, new DatasetValue(initial_value, value_name), 
                                        ...auto_binding_targets);
    }

    /**
     * @param {string} value_name 
     * @param {SQLValuelike} initial_value 
     * @param {...AutoBindingTargetWithArgs} auto_binding_targets
     */
    create_value_synced(value_name, initial_value = null, ...auto_binding_targets){
        return this.#create_value_impl(value_name, new DatasetValueSynced(initial_value, value_name),
                                        ...auto_binding_targets);
    }


    
    is_to_update() { return Object.values(this.values).some(x => x.is_to_update()); }
    is_changed()   { return Object.values(this.values).some(x => x.is_changed()); }
    
    reinitialize_all() { Object.values(this.values).forEach(x => x.reinitialize()); }

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






