//@ts-check
import fs from "fs"

const IN_FILE       = 'mdb_structure.sql';
const OUT_FILE_JSON = 'mdb_structure.json';

function main() {
    const lines = read_and_filter_lines_from_file(IN_FILE);

    const parser = new Parser(lines);
    parser.run();
    const res = parser.result;

    console.log(res.tables[4]);

    const json = JSON.stringify(res.to_compact());
    fs.writeFileSync(OUT_FILE_JSON, json);
}


function read_and_filter_lines_from_file(path = '') {
    const raw = fs.readFileSync(IN_FILE).toString();

    // split raw into lines
    /**@type {[string, number][]} */
    let lines = raw.split(/(?:\r)?\n/).map((x, i) => [x.trim(), i]);
    console.log('#LINES ALL      ', lines.length);

    // remove empty and commented lines
    lines = lines.filter(x => x[0].length > 0 && x[0][0] !== '#'); 
    console.log('#LINES no empty ', lines.length);

    // remove everything, but CREATE TABLE statements
    lines = lines.filter(x => !x[0].startsWith('CREATE DATABASE'));
    console.log('#LINES  no DB   ', lines.length);
    lines = lines.filter(x => !x[0].startsWith('USE'));
    console.log('#LINES  no USE  ', lines.length);
    lines = lines.filter(x => !x[0].startsWith('DROP TABLE IF'));
    console.log('#LINES  no DROP ', lines.length);

    return lines;
}


///////////////// PARSING RESULT //////////////////

class ParsingResult {
    constructor() {
        /**@type {TableNode[]} */
        this.tables = [];
    }

    to_compact() {
        return {
            tabs: this.tables.map(x => x.to_compact())
        };
    }
}

class TableNode {
    /**
     * @param {string} name 
     */
    constructor(name) {
        this.name = name;
        /**@type {ColNode[]} */
        this.cols = [];
        /**@type {string[][]} */
        this.inds = [];
    }

    /**
     * 
     * @param {string} col_name 
     * @param {(col: ColNode) => void} callback 
     */
    for_col(col_name, callback) {
        const col = this.cols.find(x => x.name === col_name);
        if(!col) return false;
        callback(col);
        return true;
    }

    to_compact() {
        return {
            name: this.name,
            cols: this.cols.map(x => x.to_compact()),
            inds: this.inds,
        }
    }
}

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

class ColNode {
    /**
     * 
     * @param {string} name 
     */
    constructor(name) {
        this.name = name;

        /**@type {ColType?} */
        this.type = null;
        this.type_arg = '';
        /**@type {string?} */
        this.default = null;

        this.primary  = false;
        this.autoincr = false;
        this.unsigned = false;
        this.notnull  = false;
        // this.indexed  = false;
        this.unique   = false;
    }

    to_compact() {
        const attrs = 
            (this.primary  ? 'p' : '') +
            (this.autoincr ? 'a' : '') +
            (this.unsigned ? 'u' : '') +
            (this.notnull  ? 'n' : '') +
            // (this.indexed  ? 'i' : '') +
            (this.unique   ? 'q' : '');

        const res = {};
        res.name = this.name;
        res.type = this.type;
        if(this.type_arg !== '')   res.targ = this.type_arg;
        if(this.default  !== null) res.def  = this.default;
        res.attr = attrs;

        return res;
    }
}

//////////////////// PARSER STATE ///////////////////////


class Parser {
    /**
     * @param {[string, number][]} lines 
     */
    constructor(lines) {
        this.i = 0;
        this.lines = lines;

        this.result = new ParsingResult();

        this.last_attr = '';
    }

    curr() {return this.lines[this.i]?.[0]}
    skip() {this.i++; return this.curr();}
    next() {const res = this.curr(); this.i++; return res;}

    /**
     * @param {string} msg 
     */
    ERROR(msg) {
        return new Error('LINE ' + this.lines[this.i][1] + ': ' + msg);
    }


    run() {
        while(this.curr()) {
            this.parse_create_table();
        }
    }

    parse_create_table() {
        const pline = matches(/^CREATE TABLE \`(.*)\` \($/, this.next());
        if(pline === null) throw this.ERROR('Expected CREATE TABLE statement');

        const [table_name] = pline;
        if(table_name.includes('`')) throw this.ERROR('Invalid table name: ' + table_name);
        const tab = new TableNode(table_name);

        while(true) {
            const line = this.next();
            if(line.startsWith(')')) break;
            this.parse_column_definition_or_end(tab, line);
        }

        this.result.tables.push(tab);
    }

    /**
     * @param {TableNode} tab 
     * @param {string} line 
     */
    parse_column_definition_or_end(tab, line) {

        const special_attr_routine = (str, callback) => {
            if(line.startsWith(str)) {
                const col_names_all = matches(/\((?:\`([^\`]+)\`, )*\`([^\`]+)\`\)/, line);
                if(!col_names_all) throw this.ERROR("Invalid " + str);
                const col_names = col_names_all.filter(x => x !== undefined);
                if(callback === null) {
                    for(const col_name of col_names) {
                        if(tab.cols.find(x => x.name === col_name)) continue;
                        throw this.ERROR('Not found '+str+': '  + col_name + ' | ' + tab.cols.map(x => x.name));
                    }
                    tab.inds.push(col_names);
                    return true;
                } else {
                    for(const col_name of col_names) {
                        if(!tab.for_col(col_name, callback)) 
                            throw this.ERROR('Not found '+str+': '  + col_name + ' | ' + tab.cols.map(x => x.name));
                    }
                    return true;
                }
            }
            return false;
        }

        if(special_attr_routine("PRIMARY KEY", c => c.primary = true)) return;
        if(special_attr_routine("UNIQUE",      c => c.unique  = true)) return;
        if(special_attr_routine("INDEX",       null)) return;

        const parts = matches(/^\`([^\`]*?)\`(?: (.*?))?\,?$/, line);
        if(parts === null) throw this.ERROR("Invalid col definition: " + line);

        const [name, rest] = parts;
        if(name.includes('`')) throw this.ERROR("Invalid col name: " + name);
        const attrs = rest.split(' ');

        const col = new ColNode(name);

        this.last_attr = '';
        for(const attr of attrs) {
            this.parse_col_attr(col, attr);
            this.last_attr = attr;
        }

        tab.cols.push(col);
        return;
    }

    /**
     * @param {ColNode} col 
     * @param {string} attr 
     */
    parse_col_attr(col, attr) {
        console.log("##", attr);
        if(this.last_attr === 'NOT') {
            if(attr !== 'NULL') throw this.ERROR("Expected NOT NULL");
            col.notnull = true;
            return;
        }

        if(this.last_attr === 'DEFAULT') {
            col.default = attr;
            return;
        }

        if(attr === 'NOT') {
            return;
        }
        if(attr === 'DEFAULT') {
            return;
        }

        if(attr === 'NULL') {
            return;
        }

        if(attr === 'UNSIGNED') {
            col.unsigned = true;
            return;
        }
        if(attr === 'AUTO_INCREMENT') {
            col.autoincr = true;
            return;
        }

        const type_attr = matches(/^([^\(\)]+)(?:\((.+)\))?$/, attr);
        if(!type_attr) throw this.ERROR("Invalid type attr format: " + attr);

        /**
         * @type {[ColType, string | undefined]}
         */
        //@ts-ignore
        const [type, arg] = type_attr;

        col.type = type;
        col.type_arg = arg ?? '';

        switch(type){
            case "INTEGER":     return;
            case "TINYINT":     return;
            case "DECIMAL":     return;
            case "DOUBLE":      return;
            case "FLOAT":       return;
            case "TIMESTAMP":   return;
            case "DATETIME":    return;
            case "LONGTEXT":    return;
            case "VARCHAR":     return;
        }

        throw this.ERROR("Unknown attr type: " + attr);
    }
}

//////////////////// UTILITY /////////////////

/**
 * @param {RegExp} regex 
 * @param {string} str 
 */
function matches(regex, str){
    /**@type {string[]?} */
    const res = str.match(regex);
    if(res) {
        res.shift();
        return res;
    }
    return null;
}

///////////////// MAIN ////////////////////////

main();