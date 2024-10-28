//@ts-check
import fs from "fs"

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
*   inds: string[][]
*  }} TabDefinition
 */

/**
 * @typedef {{
 *  tabs: TabDefinition[]
 * }} JsonStructure
 */

/*

const TABS = {
    klienci: new TableNode('klienci', {
        "NAZWA": new Column("NAZWA", {...}), 
        "ab 12": new Column("ab 12", {...}), 
    })
}
*/

//////////////// TEST START //////////////////


// class TableNode {
//     /**
//      * @param {string} name 
//      * @param {{name: string, def: any}[]} columns
//      */
//     constructor(name, columns) {
//         this.name = name;
//         this.cols = Object.fromEntries(columns.map( x => [x.name, new Column(x.name, x.def)] ));
//     }
// }

// class Column {
//     constructor(name, def) {
//         this.name = name;
//         this.def  = def;
//     }
// }

// /**
//  * @type {TableNode & {cols: {col1: Column, col2: Column}} }
//  */
// //@ts-ignore
// const t1 = new TableNode('Tab1', [
//     {name: 'col1', def: 1},
//     {name: 'col2', def: 2},
// ]);

// /**@param {TableNode} tab */
// function test_tab (tab) {
//     console.log(tab.name, tab.cols);
// }




//////////////// TEST END //////////////////

const IN_FILE_JSON = 'mdb_structure.json';
const OUT_FILE_JS  = '../src/DBStructure/db_warsztat_structure_impl.js';

/*

@type {DatabaseNode & {
    "tab1": TableNode & {
        "col11": Column,
        "col12": Column,
        ...
    },
    "tab2": TableNode & {
        "col21": Column,
        "col22": Column,
        ...
    },
    ...
}} 
const DB = new DatabaseNode([
    {name: 'tab1', cols: [
        {name: 'col11', ...},
        {name: 'col12', ...},
    ]},
    {name: 'tab2', cols: [
        {name: 'col21', ...},
        {name: 'col22', ...},
    ]},
    ...
]);

*/

function main() {
    const str = fs.readFileSync(IN_FILE_JSON).toString();
    /**@type {JsonStructure} */
    const json = JSON.parse(str);

    const type = convert_db_type(json).join('\n');
    const def  = convert_db_def (json).join('\n');

    // console.log(type);
    // console.log(def);

    const header = `import {DatabaseNode, TableNode, Column} from '../components/Dataset';`;
    const footer = `\nexport {DB};`;

    const full = 
        header + '\n' +
        type   + '\n' + 
        def    + '\n' +
        footer;

    fs.writeFileSync(OUT_FILE_JS, full);
}


/**@param {JsonStructure} json */
function convert_db_type(json) {
    const tabs = json.tabs.map(convert_table_type).flat();
    return [
        `/**@type {DatabaseNode & {tabs: {`,
        ...indent(tabs),
        `}}}*/`
    ];
}
/**@param {TabDefinition} tab */
function convert_table_type(tab) {
    const cols = tab.cols.map(convert_column_type);
    return [
        `"${to_snake_case(tab.name)}": TableNode & {cols: {`,
        ...indent(cols),
        `}},`,
    ];
}
/**@param {ColDefinition} col */
function convert_column_type(col) {
    return `"${to_snake_case(col.name)}": Column,`;
}


/**@param {JsonStructure} json */
function convert_db_def(json) {
    const tabs = json.tabs.map(convert_table_def).flat();
    return [
        `const DB = new DatabaseNode([`,
        ...indent(tabs),
        `]);`
    ];
}
/**@param {TabDefinition} tab */
function convert_table_def(tab) {
    const cols = tab.cols.map(convert_column_def);
    return [
        `{name: "${escape_quote(tab.name)}", cols: [`,
        ...indent(cols),
        `]},`,
    ];
}
/**@param {ColDefinition} col */
function convert_column_def(col) {
    return JSON.stringify(col) + ',';
}

//////////////////// Utils ///////////////////

/**
 * @param {string[]} arr 
 */
function indent(arr) {
    return arr.map(x => '    ' + x);
}
/**
 * @param {string} val 
 */
function escape_quote(val) {
    if(val.includes('"')) throw new Error('sdjfiosdjf');
    return val.replace(/\"/g, '\\"');
}

/**
 * @param {string} val 
 */
function to_snake_case(val) {
    return escape_quote(val.replace(/\s/g, '_'));
}

//////////////////// MAIN ///////////////////

main();