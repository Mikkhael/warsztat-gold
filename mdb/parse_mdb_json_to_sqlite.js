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
*   "DATETIME"  |
*   "LONGTEXT"  |
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

const IN_FILE_JSON    = 'mdb_structure.json';
const OUT_FILE_SQLITE = 'mdb_structure_sqlite_v2.sql';

function main() {
    const str = fs.readFileSync(IN_FILE_JSON).toString();
    /**@type {JsonStructure} */
    const json = JSON.parse(str);
    // console.log(json);

    const tabs = json.tabs.map(convert_table_def);
    // console.log(tabs);

    const res  = tabs.join('\n');
    fs.writeFileSync(OUT_FILE_SQLITE, res);
}

/**@param {TabDefinition} tab */
function convert_table_def(tab){
    const name_original  = escape(tab.name);
    const name_migration = escape(tab.name + '_migration');
    const name_csv_view  = escape(tab.name + '_csv_view');
    const name_trigger   = escape(tab.name + '_dec_insert_trigger');

    const columns_definition = tab.cols.map(convert_column_def)
                                       .map(x => '  ' + x)
                                       .join(',\n');
    
    const create_table_header = `DROP TABLE IF EXISTS ${name_migration}; CREATE TABLE ${name_migration} (`;
    const create_table_footer = 
`) STRICT;
DROP VIEW IF EXISTS ${name_csv_view};
CREATE TABlE IF NOT EXISTS ${name_original} AS SELECT * FROM ${name_migration};
INSERT INTO ${name_migration} SELECT * FROM ${name_original};
DROP TABLE ${name_original};
ALTER TABLE ${name_migration} RENAME TO ${name_original};`

    const indexes = tab.inds.map(i => {
        const idx_joined = i.join(',');
        const idx_name  = escape(tab.name + ' IDX ' + idx_joined);
        const cols_joined = i.map(escape).join(', ');
        return `DROP INDEX IF EXISTS ${idx_name}; CREATE INDEX ${idx_name} ON ${name_original} (${cols_joined});`
    });


    const create_trigger_header = `DROP TRIGGER IF EXISTS ${name_trigger}; CREATE TRIGGER ${name_trigger} AFTER INSERT ON ${name_original} BEGIN\n   UPDATE ${name_original} SET `;
    const create_trigger_body   = tab.cols.filter(c => c.type === 'DECIMAL')
            .map(c => {
                const col_name = escape(c.name);
                return `${col_name} = decimal(new.${col_name})`;
            });
    const create_trigger_footer = ` WHERE ROWID = new.ROWID;\nEND;`;

    const triggers = create_trigger_body.length === 0 ? [] : [[
        create_trigger_header,
        create_trigger_body.join(', '),
        create_trigger_footer
    ].join('')];

    const all_cols_names = tab.cols.map(c => escape(c.name)).join(', ');
    const create_view_header = `CREATE VIEW ${name_csv_view} (${all_cols_names}) AS SELECT `;
    const create_view_body   = tab.cols.map(convert_column_view_def).map(x => '  ' + x).join(',\n');
    const create_view_footer = `FROM ${name_original};`;

    const create_table_full = [
        create_table_header,
        columns_definition,
        create_table_footer,
        '',
        ...indexes,
        ...triggers,
        create_view_header,
        create_view_body,
        create_view_footer,
        '\n\n'
    ].join('\n');

    return create_table_full;
}



/**@param {ColDefinition} col */
function convert_column_def(col) {
    const name = escape(col.name);

    // (this.primary  'p'
    // (this.autoincr 'a'
    // (this.unsigned 'u'
    // (this.notnull  'n'
    // (this.indexed  'i'
    // (this.unique   'q'
    const hasattr = (a) => col.attr.includes(a);

    let type = "TEXT";
    let checks = [];
    let check_allow_null = false;
    let unsigned = hasattr('u');
    

    // mdb -> wszędzie DATETIME i TIMESTAMP wyeksportowany wygląa na YYYY-MM-DD HH:MM:SS

    switch(col.type) {
        case "INTEGER": type = "INTEGER"; break;
        case "TINYINT": type = "INTEGER"; switch(col.targ) {
            case "1" : checks.push(name + ' <= 1');   unsigned = true; break;
            case "3" : checks.push(name + ' <= 255'); unsigned = true; break;
            default: throw new Error('Invalid TINYINT size: ' + col.name);
        } break;
        case "DECIMAL":
            if(col.targ !== '19,4') throw new Error('Invalid DECIMAL size: ' + col.name);
            checks.push(`decimal_cmp(${name},"922337203685477,5808") < 0`);
            checks.push(`decimal_cmp(${name},"-922337203685477,5808") > 0`);
            check_allow_null = true;
            break;
        case "DOUBLE": type = "REAL"; break;
        case "FLOAT":  type = "REAL"; break;
        case "TIMESTAMP": checks.push(`datetime(${name}) IS NOT NULL`); check_allow_null = true; break;
        case "DATETIME":  checks.push(`datetime(${name}) IS NOT NULL`); check_allow_null = true; break;
        case "LONGTEXT": break;
        case "VARCHAR":
            if(!col.targ.match(/^\d+$/)) throw new Error('Invalid VARCHAR size: ' + col.name);
            checks.push(`length(${name}) <= ${col.targ}`);
            break;
        default: throw new Error('Invalid COL TYPE: ' + col.name + ' | ' + col.type);
    }

    if(unsigned) {
        checks.push(`${name} >= 0`);
    }

    const checks_str_main = checks.join(' AND ');
    const checks_str_full = !check_allow_null ? checks_str_main :
        checks.length === 1 ? `${name} IS NULL OR ${checks_str_main}`  :
                              `${name} IS NULL OR (${checks_str_main})`;
    
    if(col.def === "CURRENT_TIMESTAMP" && col.type !== "DATETIME" && col.type !== "TIMESTAMP") {
        throw new Error("Usage of CURRENT_TIMESTAMP with non-date field");
    }

    const parts = [];
    parts.push(name);
    parts.push(type);
    if(checks.length > 0) {
        parts.push(`CHECK (${checks_str_full})`);
    }
    if(hasattr('n')){
        parts.push(`NOT NULL`);
    }
    if(col.def !== undefined) {
        parts.push(`DEFAULT ${col.def}`);
    }
    if(hasattr('q')) {
        parts.push('UNIQUE');
    }
    if(hasattr('p')) {
        parts.push('PRIMARY KEY');
        // never adding AUTO_INCREMENT (https://www.sqlite.org/autoinc.html)
    }

    const res = parts.join(' ');
    return res;
}

/**@param {ColDefinition} col */
function convert_column_view_def(col) {
    const name = escape(col.name);

    switch(col.type) {
        case "INTEGER":   return `CAST(${name} AS TEXT)`;
        case "TINYINT":   return `CAST(${name} AS TEXT)`;
        case "DECIMAL":   return `REPLACE(CAST(decimal(${name}) AS TEXT),".",",")`;
        case "DOUBLE":    return `REPLACE(CAST(${name} AS TEXT),".",",")`;
        case "FLOAT":     return `REPLACE(CAST(${name} AS TEXT),".",",")`;
        case "TIMESTAMP": return `DATETIME(${name})`;
        case "DATETIME":  return `DATETIME(${name})`;
        case "LONGTEXT":  return  name;
        case "VARCHAR":   return  name;
    }

    throw new Error('Invalid col type' + col.name);
}

//////////////////// Utils ///////////////////

/**
 * @param {string} val 
 */
function escape(val) {
    return '`' + val + '`';
}

//////////////////// MAIN ///////////////////

main();