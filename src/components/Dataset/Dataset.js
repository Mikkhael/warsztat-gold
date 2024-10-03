//@ts-check
import { computed, unref, ref, reactive, shallowRef, watch, triggerRef, shallowReactive, toRef, readonly } from "vue";
import { escape_backtick, escape_sql_value, iterate_query_result_values, iterate_query_result_values_single_row } from "../../utils";
import ipc from "../../ipc";
import { installUpdate } from "@tauri-apps/api/updater";

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
        this.local         = /**@type {import('vue').Ref<SQLValue>} */ (ref(unref(initial_value)));
        this.initial_value = initial_value;
    }

    reinitialize() {this.local.value = unref(this.initial_value);}
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
        this.local.value  = unref(this.initial_value);
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


    /**
     * @param {(string | DatasetValueReflike)[]} parts 
     */
    static sql_parts(parts) {
        return parts.map(part => {
            if(typeof part === 'string') return part;
            else                         return escape_sql_value(DVUtil.as_value(part));
        }).join('');
    }
    
    /**
     * @param {(string | DatasetValueReflike)[]} parts 
     */
    static sql_parts_ref(parts) {
        return computed(() => DVUtil.sql_parts(parts));
    }
}


////////////////// Query Builder ////////////////////////////////////////

/**
 * Potrzebne do:
 *  - Scroller 
 *      - value name
 *      - from
 *      - where bez indeksu
 *  - Source
 *      - from
 *      - where z indeksem
 *  - Find
 *      - from
 *      - where bez indeksu
 *  - Sync
 *      - table_name
 *      - primary keys
 * 
 * 
 * 
 * 
 */



/**
 * @typedef {(string | DatasetValueReflike)[]} QueryParts
 */

/**
 * @param {string} str 
 */
function escape_backtick_smart(str) {
    return str.indexOf('`') === -1 ? escape_backtick(str) : str;
}

class QueryBuilder {
    /**
     * @param {Dataset} dataset 
     * @param {string} index_name 
     */
    constructor(dataset, index_name = 'rowid') {
        this.index_name   = index_name;
        this.index_value  = dataset.get_index_ref();
        this.offset_value = dataset.get_offset_ref();

        this.from = ref('');

        this.conditions_common           = shallowRef(/**@type {QueryParts[]} */ ([]));
        this.conditions_optional         = shallowRef(/**@type {QueryParts[]} */ ([]));

        this.conditions_merged = computed(() => {
            return [
                ...this.conditions_common.value,
                ...this.conditions_optional.value.filter(x => !x.some(xx => DVUtil.as_value(xx) === null))
            ];
        });
        this.is_complete = computed(() => {
            const res = this.conditions_common.value.every(x => x.every(xx => DVUtil.as_value(xx) !== null));
            console.log('CALC COMPLETE', this.from.value, res, this.conditions_common.value.length, this.conditions_common.value);
            return res;
        });
        // console.log("IS COMPLETE AT START", this.from.value, this.is_complete.value);


        this.sql_where_conditions = computed(() => {
            return this.conditions_merged.value.map(x => '(' + DVUtil.sql_parts(x) + ')').join(' AND ');
        })
        
        this.sql_from       = this.from;
        this.sql_index      = computed(() => DVUtil.sql_parts(['(', unref(this.index_name), ' = ', this.index_value, ')']) );
        this.sql_offset     = computed(() => DVUtil.sql_parts(['LIMIT 1 OFFSET ', this.offset_value]));

        this.sql_where_full_noindex = this.sql_where_conditions;
        this.sql_where_full_index   = computed(() => [this.sql_where_conditions.value, this.sql_index.value].filter(x => x.length > 0).join(' AND '));

        this.sql_rest_full_noindex = this.sql_where_full_noindex;
        this.sql_rest_full_index   = this.sql_where_full_index;
        this.sql_rest_full_offset  = computed(() => this.sql_rest_full_noindex.value + ' ' + this.sql_offset.value);

        this.where_keyword = computed(() => this.sql_where_full_noindex.value.length > 0 ? ' WHERE ' : ' ');


        this.sql_full_index   = computed(() => 'FROM ' + this.sql_from.value + ' WHERE ' + this.sql_rest_full_index.value);
        this.sql_full_noindex = computed(() => 'FROM ' + this.sql_from.value + this.where_keyword.value + this.sql_rest_full_noindex.value);
        this.sql_full_offset  = computed(() => 'FROM ' + this.sql_from.value + this.where_keyword.value + this.sql_rest_full_offset.value);

        
        // SELECT off FROM (SELECT row_number() OVER () as off, rowid as id FROM `samochody klientów` WHERE `ID klienta` BETWEEN 91 AND 95) WHERE `id` = 19
        this.sql_full_rownumber_select_parts = computed(() => {
            return ['SELECT n FROM (SELECT row_number() OVER () as n, ',' as i ' + this.sql_full_noindex.value + ') WHERE i = '];
        })
    }


    set_from_table(table_name) {
        this.from.value = escape_backtick_smart(table_name);
    }
    set_from_advanced(sql) {
        this.from.value = sql;
    }

    /**
     * @param {string} field_name 
     * @param {QueryParts | DatasetValueReflike} value 
     */
    add_simple_condition(field_name, value, is_optional = false) {
        let value_parts = (value instanceof Array) ? value : [value];
        const to_add = [escape_backtick_smart(field_name) + ' = ', ...value_parts];
        if(is_optional){
            this.conditions_optional.value.push(to_add);
            triggerRef(this.conditions_optional);
        } else {
            this.conditions_common.value.push(to_add);
            triggerRef(this.conditions_common);
            // triggerRef(this.is_complete);
        }
    }


    get_scroller_query() {
        return readonly({
            query_value_name:   this.index_name,
            query_from:         this.sql_from,
            query_where:        this.sql_rest_full_noindex,
        });
    }

    get_src_query_index() {
        return this.sql_full_index;
    }
    get_src_query_offset() {
        return this.sql_full_offset;
    }

    get_viewer_query() {
        return {
            query_from:  this.sql_from,
            query_where: this.sql_rest_full_noindex,
        }
    }
    /**
     * @param {SQLValue} value 
     */
    get_rownumber_select(value, name = 'rowid') {
        name = escape_backtick_smart(name);
        const parts = this.sql_full_rownumber_select_parts.value;
        return parts[0] + name + parts[1] + escape_sql_value(value);
    }

    /**
     * @param {SQLValue} value 
     */
    async perform_rownumber_select(value, name = 'rowid') {
        const res = await ipc.db_query(this.get_rownumber_select(value, name));
        return res[0]?.[0]?.[0];
    }


    /**
     * @param {DatasetSourceQuery} src 
     */
    set_source_query_index(src) {
        src.set_body_query_and_finalize(this.get_src_query_index(), this.is_complete);
    }
    /**
     * @param {DatasetSourceQuery} src 
    */
   set_source_query_offset(src) {
        src.set_body_query_and_finalize(this.get_src_query_offset(), this.is_complete);
    }
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
    
    get_insert_query() {
        const cols = Object.entries(this.synced_values);

        const names  = cols.map(([name, val]) => escape_backtick(name)).join(",");
        const values = cols.map(([name, val]) => escape_sql_value(DVUtil.as_value(val))).join(",");
        
        const query = `INSERT INTO \`${this.table_name}\` (${names}) VALUES (${values});`;
        return query;
    }

    async perform_update(force = false) {
        const update_query = this.get_update_query(force);
        if(update_query === "")
            return 0;
        return await ipc.db_execute(update_query);
    }

    async perform_insert() {
        const insert_query = this.get_insert_query();
        return await ipc.db_insert(insert_query);
    }
}



////////////////// Source Query ////////////////////////////////////////

class SourceQuery{
    is_complete() {return true;}
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
        // this.query_body_parts = /**@type {import('vue').Ref<(string | DatasetValueReflike)[]>} */ (ref([]));
        this.advanced_binder_function = /**@type {QueryResultCallback?} */ (null);

        this.query_select_sql = computed(() => {
            return this.select_fields.value.map(([name, definition]) => {
                if(definition === undefined)
                    return escape_backtick(name);
                return `${definition} as ${escape_backtick(name)}`;
            }).join(', ');
        });
        
        // this.query_body_sql = computed(() => {
        //     return DVUtil.sql_parts(this.query_body_parts.value);
        // });
        /**@type {import('vue').ShallowRef<string | import('vue').Ref<string>>} */
        this.query_body_sql = shallowRef('');

        /**@type {import('vue').ShallowRef<boolean | import('vue').Ref<boolean>>} */
        this.is_complete_indicator = shallowRef(true);

        this.query_sql = computed(() => {
            return 'SELECT ' + this.query_select_sql.value + ' ' + unref(this.query_body_sql.value) + ';';
        });
    }

    is_complete() {
        return unref(this.is_complete_indicator.value);
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
     * @param {import('vue').ComputedRef<string>  } query_body_sql 
     * @param {import('vue').ComputedRef<boolean>?} is_complete 
     */
    set_body_query_and_finalize(query_body_sql, is_complete = null) {
        if(is_complete) {
            this.is_complete_indicator.value = is_complete;
        }
        this.query_body_sql.value = query_body_sql;
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
    /**
     * @param {Dataset?} parent_dataset 
     */
    constructor(parent_dataset = null){
        this.table_syncs = /**@type {DatasetTableSync[]} */ ([]);
        this.source_queries = /**@type {SourceQuery[]} */ ([]);
        this.values = shallowReactive(/**@type {Object.<string, DatasetValue>} */ ({}));
        
        this.synced_values =  shallowRef(/**@type {DatasetValueSynced[]} */ ([]));
        
        /**@type {Object?} */
        this.associated_dataset_scroller = null;
        /**@type {import('vue').ComputedRef<boolean>} */
        this.insert_mode = computed(() => {
            // console.log('SETTING INSERT', this.associated_dataset_scroller, this.values);
            return this.associated_dataset_scroller?.insert_mode.value || false;
        });

        this.forms = /**@type {import('vue').Ref<HTMLFormElement>[]} */ ([]);
        this.index = ref(/**@type {SQLValue} */ (null));
        this.offset = computed(() => Number(this.index.value) - 1);

        // watch(this.empty, (new_empty) => {
            //     if(new_empty) this.reinitialize_all();
            // });
            
        this.sub_datasets = shallowReactive(/**@type {Object.<string, Dataset>} */ ({}));
        this.parent_dataset = parent_dataset;
        
        // HAS TO BE TRIGGERED
        this.is_src_complete = computed(() => {
            const res = this.source_queries.map(x => x.is_complete()).every(x => x);
            console.log('TRIGGER', res, this.source_queries, this.source_queries.length);
            return res;
        });
        this.disabled = computed(() =>  (this.parent_dataset && (
                                            this.parent_dataset?.empty.value ||
                                            this.parent_dataset?.insert_mode.value
                                        )) || 
                                        !this.is_src_complete.value );
        this.empty = computed(() => this.disabled.value ||
                                    this.index.value === null && !this.insert_mode.value);

        // Is inserting, or is anything non-empty changed
        /**@type {import('vue').ComputedRef<boolean>} */
        this.is_changed_ref = computed(() => {
            const changed_list = this.synced_values.value.map(x => x.changed.value);
            const changed_list_deep = this.#foreach_dataset(x => x.is_changed_ref.value);
            return  this.insert_mode.value || ( 
                        !this.empty.value && 
                        ([...changed_list, ...changed_list_deep].indexOf(true) !== -1)
                    );
        });

        /**@type {import('vue').ComputedRef<boolean>} */
        this.is_any_sub_insert_mode = computed(() => {
            return this.#foreach_dataset(x => x.insert_mode.value || x.is_any_sub_insert_mode.value).some(x => x);
        });

        this.debug_all_changed_values = computed(() => {
            const local = this.synced_values.value.filter(x => x.changed.value);
            const deep  = this.#foreach_dataset(x => x.debug_all_changed_values.value);
            return [local, ...deep];
        });

        this.form_container_classes = readonly({
            empty:    this.empty,
            disabled: this.disabled
        });
    }

    /**
     * @template T
     * @param {(dataset: Dataset) => T} callback 
     */
    #foreach_dataset(callback) {
        return Object.values(this.sub_datasets).map(callback);
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
        this.is_src_complete.effect.run();
        return src;
    }

    create_simple_source_query() {
        const src = new SimpleSourceQuery();
        this.source_queries.push(src);
        return src;
    }

    create_sub_dataset(name){
        const sub_dataset = new Dataset(this);
        this.sub_datasets[name] = sub_dataset;
        return sub_dataset;
    }

    /**
     * @param {SQLValue} new_index 
     */
    set_index(new_index){
        this.index.value = new_index;
        if(new_index === null) { // IS EMPTY
            this.reinitialize_all();
        }
    }
    get_offset_ref() { return this.offset; }
    get_index_ref()  { return this.index; }
    get_index()      { return this.index.value; }

    set_insert_mode(new_mode = true, cascade_deep = true) {
        if(cascade_deep) {
            this.#foreach_dataset(d => d.set_insert_mode(false, cascade_deep));
        }
        this.associated_dataset_scroller?.set_insert_mode(new_mode);
    }
    get_insert_mode_ref() {return this.insert_mode;}

    assosiate_dataset_scroller(dataset_scroller) {
        this.associated_dataset_scroller = dataset_scroller;
        // console.log('SETTING ASSOC', this.associated_dataset_scroller);
        this.insert_mode.effect.run();
    }

    
    /**
     * @param {string}   value_name 
     * @param {SQLValue} default_value
    */
   get(value_name, default_value = null) {
       if(this.values[value_name]) {
           return this.values[value_name].local;
        }
        return computed(() => {
            if(this.values[value_name]) {
                return this.values[value_name].local.value;
            }
            return default_value;
        });
    }
    
    // TODO optimize, if they already exist
    /**
     * @param {string[]} path 
     * @param {SQLValue} default_value
     */
    get_deep(path = [], default_value = null) {
        return computed(() => {
            /**@type {Dataset} */
            let dataset = this;
            let i = 0;
            while(i < path.length - 1) {
                dataset = dataset.sub_datasets[path[i]];
                if(!dataset) return default_value;
            }
            if(dataset.values[path[i]]) {
                return dataset.values[path[i]].local.value;
            }
            return default_value;
        });
    }

    /**
     * 
     * @param {import('vue').Ref<HTMLFormElement>} value 
     */
    assosiate_form(value) {
        this.forms.push(value);
    }

    /**
     * @returns {boolean}
     */
    reportFormValidity(empty_as_valid = true){
        console.log('FORMY: ', this.forms);
        const good = this.forms.map(x => x.value.reportValidity()).every(x => x);
        const deep = this.#foreach_dataset(x => (x.empty.value && empty_as_valid) || x.reportFormValidity()).every(x => x);
        return good && deep;
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
        const value = this.#create_value_impl(value_name, new DatasetValueSynced(initial_value, value_name),
                                        ...auto_binding_targets);
        this.synced_values.value.push( /**@type {DatasetValueSynced} */ (value));
        return value;
    }


    
    is_to_update() { return Object.values(this.values).some(x => x.is_to_update()) || this.#foreach_dataset(x => x.is_to_update()).some(x => x); }
    is_changed()   { return this.is_changed_ref.value; }
    
    /**
     * @template T
     * @param {(dataset: Dataset) => T} callback 
     * @returns {T[]}
     */
    do_for_all_deep(callback) {
        const subs_res = this.#foreach_dataset(x => x.do_for_all_deep(callback)).flat();
        const this_res = callback(this);
        return [this_res, ...subs_res];
    }

    reinitialize_all() { this.do_for_all_deep(dataset => Object.values(dataset.values).forEach(x => x.reinitialize())); }
    
    /**
     * @template T
     * @param {(dataset: Dataset) => (Promise<T>[] | Promise<T>)} callback
     * @returns {Promise<T[]>}
     */
    async helper_perform_all(callback, no_deep = false, allow_empty = false) {
        if(this.empty.value && !allow_empty) {
            return [];
        }
        /**@type {T[]} */
        let res;
        const callback_res = callback(this);
        if(callback_res instanceof Promise){
            res = [await callback_res];
        } else {
            res = await Promise.all(callback_res);
        }
        for(let d of Object.values(this.sub_datasets)) {
            res.push( ... await d.helper_perform_all(callback, no_deep, allow_empty) );
        }
        return res;
    }

    async perform_insert_all()  { 
        return ipc.db_as_transaction(() => {
            return Promise.all( this.table_syncs.map(x => x.perform_insert()) );
        });
    }
    async perform_update_all(no_deep = false, allow_empty = false) {
        return ipc.db_as_transaction(() => {
            return this.helper_perform_all(x => x.table_syncs.map(xx => xx.perform_update()), no_deep, allow_empty);
        });
    }

    async perform_automatic_save_or_insert_all(no_deep = false, allow_empty = false) {
        return ipc.db_as_transaction(() => {
            return this.helper_perform_all(x => {
                let result;
                if(x.insert_mode.value) {
                    result = x.table_syncs.map(xx => xx.perform_insert());
                } else {
                    result = x.table_syncs.map(xx => xx.perform_update());
                }
                return Promise.all(result).then(/**@returns {[number[], boolean, Dataset]} */ xx => [xx, x.insert_mode.value, x]);
            }, no_deep, allow_empty);
        });
    }

    async perform_query_all            (no_deep = false, allow_empty = false) {return this.helper_perform_all(x => x.source_queries.map(xx => xx.perform_query()),             no_deep, allow_empty);}
    async perform_query_and_replace_all(no_deep = false, allow_empty = false) {return this.helper_perform_all(x => x.source_queries.map(xx => xx.perform_query_and_replace()), no_deep, allow_empty);}
    async perform_query_and_refresh_all(no_deep = false, allow_empty = false) {return this.helper_perform_all(x => x.source_queries.map(xx => xx.perform_query_and_refresh()), no_deep, allow_empty);}
    async perform_query_and_retcon_all (no_deep = false, allow_empty = false) {return this.helper_perform_all(x => x.source_queries.map(xx => xx.perform_query_and_retcon()),  no_deep, allow_empty);}
}


// const d = new Dataset();
// const v1 = d.create_value_raw('v1', 'asd1');
// const v2 = d.create_value_raw('v2', 123);
// const v3 = d.create_value_raw('v3', null);






////////////////////////////////////////////////////////////////////////


export {
    QueryBuilder,

    Dataset,
    DVUtil,
    DatasetValue,
    DatasetValueSynced,
    DatasetTableSync
}






