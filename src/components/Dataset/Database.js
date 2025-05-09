//@ts-check

import { escape_backtick_smart } from "../../utils";
import { DataGraphNodeBase } from "./DataGraph";
import { markRaw } from "vue";

/**
 * @typedef {(
*  "INTEGER"   | 
*  "TINYINT"   | 
*  "DECIMAL"   | 
*  "DOUBLE"    |
*  "FLOAT"     |
*  "TIMESTAMP" |
*  "DATETIME"  |
*  "LONGTEXT"  |
*  "VARCHAR"
* )} ColType 
*/

/**
 * @typedef {{
*   name: string,
*   type: ColType,
*   targ?: string,
*   attr: string,
*   def?: string
 * }} ColDefinition
 */
/**
 * @typedef {{
*   name: string,
*   cols: ColDefinition[]
*  }} TabDefinition
 */

/**
 * @param {string} str 
 */
function to_snake_case(str) {
    return str.replace(/\s/g, '_');
}


class DatabaseNode extends DataGraphNodeBase {
    /**
     * @param {TabDefinition[]} tabs_def
     */
    constructor(tabs_def){
        super();
        /**@type {Object.<string, TableNode>} */
        this.tabs = {};

        for(const tab_def of tabs_def) {
            this.add_table(tab_def);
        }
    }

    /**
     * @param {TabDefinition} tab_def 
     */
    add_table(tab_def) {
        const table = new TableNode(this, tab_def.name, tab_def.cols);
        this.tabs[to_snake_case(tab_def.name)] = table;
        return table;
    }
}

/**
 * @template {string} [T=string]
 */
class TableNode extends DataGraphNodeBase{
    /**
     * @param {DatabaseNode} db
     * @param {string} name 
     * @param {ColDefinition[]} cols_def 
     */
    constructor(db, name, cols_def) {
        super();
        this.db = db;
        this.add_dep(db);

        this.name = name;
        /**@type {{[P in T]: Column}}*/
        //@ts-ignore
        this.cols = {};
        this.rowid = new Column(this, {
            name: "rowid",
            type: "INTEGER",
            attr: "pu",
        });

        for(const col_def of cols_def) {
            this.add_col(col_def);
        }
    }

    /**@param {ColDefinition} coL_def */
    add_col(coL_def) {
        const col = new Column(this, coL_def);
        this.cols[to_snake_case(coL_def.name)] = col;
        return col;
    }
    
    get_full_sql() {
        return escape_backtick_smart(this.name);
    }
    toString() {return this.get_full_sql();}
}

class Column {
    /**
     * @param {TableNode} tab 
     * @param {ColDefinition} params
     */
    constructor(tab, params) {
        this.tab = markRaw(tab);
        this.name = params.name;
        this.type = params.type;
        this.targ = params.targ ?? "";
        this.def  = params.def;
        this.attr = params.attr;
    }

    /**
     * @param {string} a 
     */
    hasattr(a) {
        return this.attr.includes(a);
    }
    // (this.primary  'p'
    // (this.autoincr 'a' --
    // (this.unsigned 'u'
    // (this.notnull  'n'
    // (this.indexed  'i' --
    // (this.unique   'q'

    is_primary()  { return this.hasattr('p')};
    is_unique()   { return this.hasattr('q')};
    is_nonull()   { return this.hasattr('n')};
    is_unsigned() { return this.hasattr('u')};

    get_full_sql() {
        return escape_backtick_smart(this.tab.name) + '.' + escape_backtick_smart(this.name);
    }
    toString() {return this.get_full_sql();}
}

export {
    TableNode,
    DatabaseNode,
    Column
}