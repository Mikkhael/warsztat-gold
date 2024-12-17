

//@ts-check
import { unref } from "vue";
import { TableNode } from "./Database";
import { escape_backtick_smart, escape_sql_value} from "../../utils";
import ipc from "../../ipc";


/**
 * @template T
 * @typedef {import('vue').Ref<T>} Ref
 */
/**
 * @template T
 * @typedef {import('vue').ComputedRef<T>} ComputedRef
 */
/**
 * @template T
 * @typedef {T | Ref<T>} MaybeRef
 */

/**
 * @typedef {number | string | null} SQLValue 
 */

/**
 * 
 * @param {[string, SQLValue][]} entries 
 */
function entries_to_sql(entries) {
    return entries
        .map(x => [escape_backtick_smart(x[0]), escape_sql_value(x[1])])
        .map(x => x[0] + ' = ' + x[1]);
}


/**
 * @typedef {{[P in "primary" | "values"]: [col: string, val: SQLValue][]}[]} BatchToUpdate
 * @typedef {{cols: string[], values: SQLValue[][]}[]} BatchToInsert
 * @typedef {[[col: string, val: SQLValue][][]]} BatchToDelete
 * @typedef {"update" | "insert" | "replace" | "delete" } SyncCommand
 */
/**
 * @template C
 * @typedef {C extends "update" ? BatchToUpdate : C extends "delete" ? BatchToDelete : BatchToInsert} CommandToBatchType
 */


class TableSyncRule {

    /**
     * @param {TableNode} table 
     */
    constructor(table) {
        this.table = table;
        this.update_only = false;
    }

    set_update_only(value = true) {
        this.update_only = value;
    }

    /**@returns {BatchToUpdate} */ get_batch_update (forced = false)  {throw new Error('not implemented');}
    /**@returns {BatchToDelete} */ get_batch_delete ()                {throw new Error('not implemented');}
    /**@returns {BatchToInsert} */ get_batch_insert ()                {throw new Error('not implemented');}
    /**@returns {BatchToInsert} */ get_batch_replace(forced = false)  {throw new Error('not implemented');}

    /**
     * @template {SyncCommand} C
     * @param {C} command
     * @param {boolean} [forced]
     * @returns {CommandToBatchType<C>}
     */
    get_batch(command, forced) {
        switch(command) {
            //@ts-ignore
            case 'update':  return this.get_batch_update(forced);
            //@ts-ignore
            case 'delete':  return this.update_only ? [] : this.get_batch_delete();
            //@ts-ignore
            case 'insert':  return this.update_only ? [] : this.get_batch_insert();
            //@ts-ignore
            case 'replace': return this.update_only ? [] : this.get_batch_replace(forced);
        }
        throw new Error('invalid sync command: ' + command);
    }

    /**
     * @param {SyncCommand} command 
     * @param {boolean} forced 
     * @returns {string[]}
     */
    generate_queries(command, forced = false) {
        switch(command) {
            case "update": {
                const batch = this.get_batch(command, forced);
                return batch.map(rows => TableSyncRule.generate_update_query_raw(this.table.name, rows)).filter(x => x !== '');
            }
            case "delete": {
                const batch = this.get_batch(command, forced);
                return batch.map(rows => TableSyncRule.generate_delete_query_raw(this.table.name, rows)).filter(x => x !== '');
            }
            case "insert": {
                const batch = this.get_batch(command, forced);
                return batch.map(rows => TableSyncRule.generate_insert_query_raw(this.table.name, rows, false)).filter(x => x !== '');
            }
            case "replace": {
                const batch = this.get_batch(command, forced);
                return batch.map(rows => TableSyncRule.generate_insert_query_raw(this.table.name, rows, true)).filter(x => x !== '');
            }
        }
    }

    /**
     * @template {SyncCommand} C
     * @param {C} command 
     * @param {boolean} forced 
     * @param {boolean} [get_last_rowid]
     */
    async perform_sync_notransaction(command, forced = false, get_last_rowid = false, as_batch = false) {
        const queries = this.generate_queries(command, forced);
        if(queries.length === 0){
            return 0;
        }
        this.table.expire();
        if(as_batch || get_last_rowid || queries.length === 1) {
            return ipc.db_execute(queries.join('\n'), queries.length > 1, get_last_rowid);
        } else {
            const results_promises = queries.map(query => ipc.db_execute(query, false, false));
            return Promise.all(results_promises).then(results => {
                let sum = 0;
                for(const result of results) {
                    sum += result;
                }
                return sum;
            });
        }
    }

    /**
     * @param {string} table_name
     * @param {BatchToUpdate[number]} row_to_update 
     */
    static generate_update_query_raw(table_name, row_to_update) {
        const set_sql   = entries_to_sql(row_to_update.values) .join(",");
        const where_sql = entries_to_sql(row_to_update.primary).join(" AND ");
        const table_sql = escape_backtick_smart(table_name);
        if(where_sql === '') {
            throw new Error("NO PRIMARY KEY FOR UPDATE " + table_name);
        }
        const query = `UPDATE ${table_sql} SET ${set_sql} WHERE ${where_sql};`;
        return query;
    }
    /**
     * @param {string} table_name
     * @param {BatchToInsert[number]} rows_to_insert 
     * @param {boolean} as_replace 
     */
    static generate_insert_query_raw(table_name, rows_to_insert, as_replace) {
        const {cols, values} = rows_to_insert;
        if (cols.length === 0 || values.length === 0) return "";
        const values_for_each_row = values.map(row_values => {
            const row_values_sql = row_values.map(x => escape_sql_value(x)).join(',');
            return row_values_sql;
        });
        const cols_sql   = cols.map(x => escape_backtick_smart(x)).join(',');
        const values_sql = values_for_each_row.map(x => '('+x+')').join(',');
        const table_sql  = escape_backtick_smart(table_name);
        const command    = as_replace ? 'REPLACE' : 'INSERT';
        const query = `${command} INTO ${table_sql} (${cols_sql}) VALUES ${values_sql};`;
        return query;
    }
    /**
     * @param {string} table_name
     * @param {BatchToDelete[number]} rows_to_delete
     */
    static generate_delete_query_raw(table_name, rows_to_delete) {
        if (rows_to_delete.length === 0) return "";
        const where_for_each_row = rows_to_delete.map(row => {
            const where_sql = entries_to_sql(row).join(' AND ');
            if(where_sql === '') {
                throw new Error("NO PRIMARY KEY FOR DELETE " + table_name);
            }
            return '(' + where_sql + ')';
        });
        const where_sql = where_for_each_row.join(' OR ');
        const table_sql = escape_backtick_smart(table_name);
        const query = `DELETE FROM ${table_sql} WHERE ${where_sql};`;
        return query;
    }

}



/**@typedef {{primary?: boolean, name: string}[]} TableSyncReactiveColsDef */
/**@typedef {{deleted?: boolean, changed?: boolean, inserted?: boolean, cached?: (SQLValue|undefined)[], values: SQLValue[]}} TableSyncReactiveRow */
/**@typedef {{cols: TableSyncReactiveColsDef, rows: TableSyncReactiveRow[]}} TableSyncReactiveData */

class TableSyncRuleReactive extends TableSyncRule {


    /**
     * @param {TableNode} table
     * @param {MaybeRef<TableSyncReactiveData>} data
     */
    constructor(table, data) {
        super(table);
        this.data = data;
    }

    static row_as_entries(/**@type {TableSyncReactiveColsDef} */ cols, /**@type {(SQLValue | undefined)[]} */ row, prims_only = false) {
        /**@type {[string, SQLValue][]} */
        const res = [];
        for(const col_i in cols) {
            if(prims_only && !cols[col_i].primary) continue;
            res.push([
                cols[col_i].name,
                row[col_i] ?? null
            ]);
        }
        return res;
    }
    static row_as_values(/**@type {TableSyncReactiveColsDef} */ cols, /**@type {SQLValue[]} */ row, prims_only = false) {
        /**@type {SQLValue[]} */
        const res = [];
        for(const col_i in cols) {
            if(prims_only && !cols[col_i].primary) continue;
            res.push(row[col_i] ?? null);
        }
        return res;
    }


    /**@returns {BatchToUpdate} */ get_batch_update(forced = false)  {
        const data = unref(this.data);
        /**@type {BatchToUpdate} */
        const batch = [];
        for(const row_i in data.rows) {
            const row = data.rows[row_i];
            if(row.deleted || row.inserted) continue;
            if(!forced && !row.changed) continue;
            if(row.cached === undefined) {
                throw new Error("NOT PROVIDED CACHED VALUES FOR UPDATE");
            }
            const row_to_update = {
                primary: TableSyncRuleReactive.row_as_entries(data.cols, row.cached, true),
                values:  TableSyncRuleReactive.row_as_entries(data.cols, row.values, false),
            };
            batch.push(row_to_update);
        }
        return batch;
    }
    /**@returns {BatchToDelete} */ get_batch_delete()  {
        const data = unref(this.data);
        const rows_to_delete    = data.rows.filter(row => row.deleted);
        const entreis_to_delete = rows_to_delete.map(row => TableSyncRuleReactive.row_as_entries(data.cols, row.values, true));
        return [entreis_to_delete];
    }
    /**@returns {BatchToInsert} */ get_batch_insert(forced_replace = false, as_replace = false)  {
        const data = unref(this.data);
        /**@type {BatchToInsert[number]} */
        const rows_to_insert = {
            cols: data.cols.map(x => x.name),
            values: []
        };
        for(const row_i in data.rows) {
            const row = data.rows[row_i];
            if(row.deleted) continue;
            if(!as_replace && !(row.inserted)) continue;
            if( as_replace && !forced_replace && !(row.changed || row.inserted)) continue;
            /**@type {BatchToInsert[number]['values'][number]} */
            const row_to_insert = TableSyncRuleReactive.row_as_values(data.cols, row.values, false);
            rows_to_insert.values.push(row_to_insert);
        }
        return [rows_to_insert];
    }
    /**@returns {BatchToInsert} */ get_batch_replace(forced = false) {
        return this.get_batch_insert(forced, true);
    }
}

export {
    TableSyncRule,
    TableSyncRuleReactive
}