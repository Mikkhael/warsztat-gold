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


let primary_key_name = "''";
let current_cols_info = [];
function parse_column(table_name) {
    let line = lines[i].trim();
    let has_comma = line.endsWith(',');
    if(has_comma) {
        line = line.slice(0, -1);
    }
    if(line.startsWith('`')){
        const [col_name, tokens_str] = matches(/^(`.*?`) (.*)$/, line);
        if(!col_name){
            console.error("SJDIUHJSDIUGS", line, table_name);
        }
        let col_type = 'any';
        let tokens = tokens_str.split(' ');
        let is_decimal = false;
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
            else if(token === "LONGTEXT"){tokens[i] = 'TEXT'; col_type="num"}
            else if(token === "TINYINT(1)") {tokens[i] = 'INTEGER'; col_type="int"}
            else if(token === "AUTO_INCREMENT") {
                primary_key_name = col_name;
                console.log('Primary:', col_name)
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
            else if(token.startsWith('DECIMAL')) {
                is_decimal = true;
                tokens[i] = `TEXT CHECK (${col_name} IS NULL OR decimal(${col_name}) IS NOT NULL)`; // TODO change decimal to regex
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
        lines[i] = res_line;
        current_cols_info.push({col_name, col_type});
    } else if(line.startsWith('INDEX')){
        let [index_name] = matches(/INDEX \((.*?)\)/, line);
        // lines[i] = '--' + lines[i];
        lines.splice(i, 1);
        i--;
        if(index_name !== primary_key_name) {
            // console.log(index_name, primary_key_name);
            return index_name;
        }
    }
    return '';
}

function parse_create_table() {
    let [table_name] = matches(/CREATE TABLE (`.*`) \(/, lines[i]);
    if(!table_name) return;
    // console.log(table_name);
    i++;

    let indexes_to_create = [];
    current_cols_info = [];
    while(!lines[i].endsWith(';')){
        let new_index = parse_column(table_name);
        if(new_index) {
            indexes_to_create.push(new_index);
        }
        i++;
    }
    primary_key_name = "''";
    i++;
    let index_lines = indexes_to_create.map(col_name => {
        let index_name = table_name.slice(0,-1) + ' IDX ' + col_name.slice(1);
        index_name = index_name.split(/\`,\s*\`/).join(',');
        return `CREATE INDEX IF NOT EXISTS ${index_name} ON ${table_name} (${col_name});`
    });
    lines.splice(i, 0, ...index_lines);
    i += index_lines.length;
    indexes_to_create = [];

    let csv_view_name = table_name.slice(0, -1) + '_csv_view`';
    let csv_view_cols = current_cols_info.map(({col_name, col_type}) => {
        if(col_type == "num"){
            return `REPLACE(CAST(${col_name} AS TEXT),".",",")`;
        }else if(col_type == "dec"){
            return `REPLACE(CAST(decimal(${col_name}) AS TEXT),".",",")`;
        }else if(col_type == "date"){
            return `DATETIME(${col_name})`;
        }else{
            return col_name;
        }
    });

    let csv_view_def  = `CREATE VIEW IF NOT EXISTS ${csv_view_name} (${current_cols_info.map(x=>x.col_name).join(', ')}) AS SELECT \n${csv_view_cols.map(x=>'  '+x).join(',\n')}\nFROM ${table_name};`;
    lines.splice(i, 0, csv_view_def);
    i += 1;
}

while(i < lines.length) {
    parse_create_table();
    i++;
}




// console.log(raw);

let out = lines.join('\n');

out = out.replace(/CREATE TABLE/g, "CREATE TABLE IF NOT EXISTS");
out = out.replace(/ENGINE=maria DEFAULT CHARSET=utf8/g, "STRICT");
out = out.replace(/, *\n\) STRICT/gm, "\n) STRICT");

fs.writeFileSync(OUT_FILE, out);


