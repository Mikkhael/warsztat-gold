

//@ts-check
import { computed, unref } from "vue";
import { escape_backtick_smart, escape_sql_value} from "../../utils";
import ipc from "../../ipc";
import { FormDataSet, FormDataValue } from "./Form";
import { TableNode } from "./Database";


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
 * @param {[string, FormDataValue][]} entries 
 */
function entries_to_sql(entries) {
    return entries
        .map(x => [escape_backtick_smart(x[0]), escape_sql_value(x[1].get_local())])
        .map(x => x[0] + ' = ' + x[1]);
}


class TableSync {
    /**
     * @param {TableNode} table
     * @param {FormDataSet} dataset
     */
    constructor(table, dataset) {
        this.table = table;
        this.dataset = dataset;

        /**@type {Object.<string, FormDataValue>} */ 
        this.values    = {};
        /**@type {Object.<string, FormDataValue>} */ 
        this.primaries = {};

        this.to_update = computed(() => this.check_to_update());
    }

    /**
     * @param {string} column_name 
     * @param {FormDataValue} value 
     */
    assoc_value(column_name, value, is_primary = false) {
        if(this.values[column_name]){
            throw new Error('Value for column ' + column_name + ' already is synced for table ' + this.table.name);
        }
        if(value.dataset !== this.dataset) {
            throw new Error('Value of incorrect dataset synced for table ' + this.table.name);
        }
        this.values[column_name] = value;
        if(is_primary) {
            this.primaries[column_name] = value;
        }
    }

    check_to_update() {
        return this.dataset.changed.value;
    }

    filter_values_to_update(force = false) {
        if(force) {
            return Object.entries(this.values);
        }
        return Object.entries(this.values).filter(x => x[1].changed.value);
    }

    generate_update_query(force = false) {
        const to_update = this.filter_values_to_update(force);
        if (to_update.length === 0) return "";

        const primaries = Object.entries(this.primaries);

        const set   = entries_to_sql(to_update).join(",");
        const where = entries_to_sql(primaries).join(" AND ");
        
        const query = `UPDATE ${escape_backtick_smart(this.table.name)} SET ${set} WHERE ${where};`;
        return query;
    }
    
    generate_insert_query() {
        const to_insert = Object.entries(this.values);

        const names  = to_insert.map(x => escape_backtick_smart(x[0]            )).join(",");
        const values = to_insert.map(x => escape_sql_value     (x[1].get_local())).join(",");
        
        const query = `INSERT INTO ${escape_backtick_smart(this.table.name)} (${names}) VALUES (${values});`;
        return query;
    }

    async perform_save(insert = unref(this.dataset?.insert_mode), force = false) {
        this.table.expire();
        if(insert) {
            const insert_query = this.generate_insert_query();
            return await ipc.db_insert(insert_query);
        } else {
            const update_query = this.generate_update_query(force);
            if(update_query === "")
                return 0;
            return await ipc.db_execute(update_query);
        }
    }
}


export {
    TableSync
}