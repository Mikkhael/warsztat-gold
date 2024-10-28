//@ts-check

import { DataGraphNodeBase } from "./DataGraph";

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
*   targ: string,
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
        /**@type {Object.<string, Column>}*/
        this.cols = {};

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
}

class Column {
    /**
     * @param {TableNode} tab 
     * @param {ColDefinition} params
     */
    constructor(tab, params) {
        this.tab = tab;
        this.name = params.name;
        this.type = params.type;
        this.targ = params.targ;
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

    is_primary() { return this.hasattr('p')};
    is_unique()  { return this.hasattr('q')};
    is_nonull()  { return this.hasattr('n')};
}

export {
    TableNode,
    DatabaseNode,
    Column
}