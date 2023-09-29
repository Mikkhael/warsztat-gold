import { table } from "console";
import fs from "fs"

const IN_FILE  = 'mdb_structure.sql';
const OUT_FILE = 'mdb_structure_sqlite.sql';

const raw = fs.readFileSync(IN_FILE).toString();

let lines = raw.split(/(?:\r)?\n/);
console.log(lines.length);

lines = lines.filter(x => x[0] !== '#');
console.log(lines.length);

lines = lines.filter(x => !x.startsWith('CREATE DATABASE'));
console.log(lines.length);

lines = lines.filter(x => !x.startsWith('USE'));
console.log(lines.length);

lines = lines.filter(x => !x.startsWith('DROP TABLE IF'));
console.log(lines.length);

let i = 0;

function matches(regex, str){
    const res = str.match(regex);
    if(res) {
        res.shift();
        return res;
    }
    return [];
}


// let primary_key_name = "''";
// let current_cols_info = [];

function parse_column(table_name, line) {

    let col_info = {};

    line = line.trim();
    let has_comma = line.endsWith(',');
    if(has_comma) {
        line = line.slice(0, -1);
    }
    if(line.startsWith('`')){
        const [col_name, tokens_str] = matches(/^(`.*?`) (.*)$/, line);
        if(!col_name){
            console.error("NO COL NAME !!!!", line, table_name);
        }
        let col_type = 'any';
        let tokens = tokens_str.split(' ');
        let is_decimal = false;
        let is_primary = false;
        for(let i=0; i<tokens.length; i++){
            let token = tokens[i];
                 if(token === "NOT")     {}
            else if(token === "NULL")    {}
            else if(token === "INTEGER") {col_type="int"}
            else if(token === "DEFAULT") {}
            else if(token == +token)     {}
            else if(token.startsWith("'") &&
                    token.endsWith("'")) {}
            else if(token === "CURRENT_TIMESTAMP") {}
            else if(token === "FLOAT")   {tokens[i] = 'REAL'; col_type="num"}
            else if(token === "DOUBLE")  {tokens[i] = 'REAL'; col_type="num"}
            else if(token === "LONGTEXT"){tokens[i] = 'TEXT'; col_type="str"}
            else if(token === "TINYINT(1)") {tokens[i] = 'INTEGER'; col_type="int"}
            else if(token === "AUTO_INCREMENT") {
                is_primary = true;
                tokens[i] = '';
            }
            else if(token.startsWith('VARCHAR')) {
                let [n] = matches(/VARCHAR\((.*?)\)/, token);
                tokens[i] = `TEXT CHECK (length(${col_name}) <= ${n})`;
                col_type = "str";
            }
            else if(token.startsWith('TINYINT(3)')) {
                tokens[i] = `INTEGER CHECK (${col_name} <= 255)`;
                col_type = "int";
            }
            else if(token.startsWith('DECIMAL(19,4)')) {
                is_decimal = true;
                const MAX = `922337203685477,5808`;
                tokens[i] = `TEXT CHECK (${col_name} IS NULL OR (decimal_cmp(${col_name},"${MAX}") < 0 AND decimal_cmp(${col_name},"-${MAX}") > 0))`;
                // tokens[i] = 'TEXT';
                col_type = "dec";
            }
            else if(token.startsWith('UNSIGNED')) {
                tokens[i] = `CHECK (${col_name} >= 0)`;
            }
            else if(token.startsWith('DATETIME') || token.startsWith('TIMESTAMP')) {
                tokens[i] = `TEXT CHECK (${col_name} IS NULL OR datetime(${col_name}) IS NOT NULL)`;
                col_type = "date";
            }
            else {
                console.error("UNKNOWN TOKEN", token, line, table_name);
            }
        }
        let res_line = `  ${col_name} ${tokens.join(' ')}`;
        if(has_comma){
            res_line += ',';
        }
        col_info = {col_name, col_type, res_line, is_primary};
    } else if(line.startsWith('INDEX')){
        let [index_name] = matches(/INDEX \((.*?)\)/, line);
        col_info = {col_name: index_name, col_type: "idx"};
    }
    return col_info;
}

function parse_create_table() {
    let [table_name] = matches(/CREATE TABLE (`.*`) \(/, lines[i]);
    if(!table_name) return;

    // MIGRATION TABLE
    let table_name_migration = table_name.slice(0, -1) + '_migration`';
    lines[i] = `DROP TABLE IF EXISTS ${table_name_migration}; ` + lines[i].replace(table_name, table_name_migration);
    i++;

    // TABLE SCHEMA
    let indexes_to_create = [];
    let current_cols_info = [];
    let primary_key_name = "''";
    while(!lines[i].endsWith(';')){
        let col_info = parse_column(table_name, lines[i]);
        if(col_info.col_type == "idx") {
            lines.splice(i, 1); // !!!
            i--;                // !!!
            if(col_info.col_type != primary_key_name){
                indexes_to_create.push(col_info.col_name);
            }
        } else if ( col_info.col_name !== undefined) {
            if(col_info.is_primary){
                primary_key_name = col_info.col_name;
            }
            lines[i] = col_info.res_line; // !!!
            current_cols_info.push(col_info);
        }
        i++;
    }
    console.log(`Primary of ${table_name}:`, primary_key_name);
    // console.log(current_cols_info.map(({col_name, col_type}) => `${col_name}: ${col_type}`));
    i++;

    // MIGRATION PROCESS
    let csv_view_name = table_name.slice(0, -1) + '_csv_view`';
    let migration_sql = `DROP VIEW IF EXISTS ${csv_view_name};\n`+
                        `CREATE TABlE IF NOT EXISTS ${table_name} AS SELECT * FROM ${table_name_migration};\n` +
                        `INSERT INTO ${table_name_migration} SELECT * FROM ${table_name};\n`+
                        `DROP TABLE ${table_name};\n`+
                        `ALTER TABLE ${table_name_migration} RENAME TO ${table_name};\n`;
    lines.splice(i, 0, migration_sql);
    i++;

    // INDExES
    let index_lines = indexes_to_create.map(col_name => {
        let index_name = table_name.slice(0,-1) + ' IDX ' + col_name.slice(1);
        index_name = index_name.split(/\`,\s*\`/).join(',');
        return `DROP INDEX IF EXISTS ${index_name}; CREATE INDEX ${index_name} ON ${table_name} (${col_name});`
    });
    lines.splice(i, 0, ...index_lines);
    i += index_lines.length;

    // TRIGGER DECIMAL INSERTS
    let dec_cols = current_cols_info.filter(x => x.col_type === "dec").map(x => x.col_name);
    if(dec_cols.length > 0){
        let dec_ins_trig_name = table_name.slice(0, -1) + '_dec_insert_trigger`';
        let dec_ins_trig_sets = dec_cols.map(x => `${x} = decimal(new.${x})`).join(', ');
        let dec_ins_trig_sql =  `DROP TRIGGER IF EXISTS ${dec_ins_trig_name}; CREATE TRIGGER ${dec_ins_trig_name} AFTER INSERT ON ${table_name} BEGIN\n` +
        `   UPDATE ${table_name} SET ${dec_ins_trig_sets} WHERE ROWID = new.ROWID;\nEND;`;
        lines.splice(i, 0, dec_ins_trig_sql);
        i++;
    }

    // CSV VIEW
    let csv_view_cols = current_cols_info.map(({col_name, col_type}) => {
        if(col_type == "num"){
            return `REPLACE(CAST(${col_name} AS TEXT),".",",")`;
        }else if(col_type == "int"){
            return `CAST(${col_name} AS TEXT)`;
        }else if(col_type == "dec"){
            return `REPLACE(CAST(decimal(${col_name}) AS TEXT),".",",")`;
        }else if(col_type == "date"){
            return `DATETIME(${col_name})`;
        }else{
            return col_name;
        }
    });
    let csv_view_def  = `CREATE VIEW ${csv_view_name} (${current_cols_info.map(x=>x.col_name).join(', ')}) AS SELECT \n${csv_view_cols.map(x=>'  '+x).join(',\n')}\nFROM ${table_name};`;
    lines.splice(i, 0, csv_view_def);
    i++;
}

while(i < lines.length) {
    parse_create_table();
    i++;
}




// console.log(raw);

let out = lines.join('\n');

// out = out.replace(/CREATE TABLE/g, "CREATE TABLE IF NOT EXISTS");
out = out.replace(/ENGINE=maria DEFAULT CHARSET=utf8/g, "STRICT");
out = out.replace(/, *\n\) STRICT/gm, "\n) STRICT");

fs.writeFileSync(OUT_FILE, out);


