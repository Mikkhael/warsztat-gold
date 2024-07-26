//@ts-check

function escape_backtick(/**@type {string | undefined} */ value) {
    if(typeof value == "string") {
        if(value.indexOf('`') != -1) {
            console.error("Invalid column name: ", value);
        }
        return "`" + value + "`";
    }
    return value;
}


class ColumnType {
    /**
     * @param {string} name 
     * @param {boolean} nonull 
     * @param {number} [len] 
     * @param {string[] | number[]} [values_list]
     */
    constructor(name = "text", nonull = false, len = 0, values_list = []) {
        this.name = name;
        this.nonull = nonull;
        this.len = len;
        this.values_list = values_list;
    }

    static EnumText  (/** @type {string[]} */ values_list, nonull = false) { return new ColumnType("text",   nonull, undefined, values_list); }
    static EnumNumber(/** @type {number[]} */ values_list, nonull = false) { return new ColumnType("number", nonull, undefined, values_list); }
    static Text    (/**@type {number | undefined} */ len, nonull = false)  { return new ColumnType("text", nonull, len); }
    static Number  (nonull = false) { return new ColumnType("number",   nonull) }
    static Integer (nonull = false) { return new ColumnType("integer",  nonull) }
    static Short   (nonull = false) { return new ColumnType("short",    nonull) }
    static Bool    (nonull = false) { return new ColumnType("bool",     nonull) }
    static Decimal (nonull = false) { return new ColumnType("decimal",  nonull) }
    static Date    (nonull = false) { return new ColumnType("date",     nonull) }
    static Datetime(nonull = false) { return new ColumnType("datetime", nonull) }
}


class QueryTable {
    /**
     * @param {string} true_name 
     * @param {string} [name]
     */
    constructor(true_name, name) {
        this.true_name = name;
        this.name = name ?? true_name;
    }

    get_name_sql() {
        return escape_backtick(this.true_name);
    }
}

class QueryColumn {
    /**
     * @param {string} name 
     * @param {ColumnType} type 
     * @param {boolean} [primary]
     * @param {string} [sql]
     * @param {QueryTable} [table]
     */
    constructor(name, type, primary, sql, table) {
        this.name  = name;
        this.type  = type;
        this.is_primary = primary ?? false;
        this.sql = sql;
        this.table = table;
    }

    is_sync() {
        return this.table !== undefined;
    }

    get_select_sql_header() {
        if(this.sql) {
            return this.sql + ' as ' + escape_backtick(this.name);
        } else if(this.table) {
            return escape_backtick(this.table.name) + '.' + escape_backtick(this.name) + ' as ' + escape_backtick(this.name);
        } else {
            return escape_backtick(this.name);
        }
    }
}


class QueryDefinition {
    constructor(sql = "") {
        this.tables         = /** @type {QueryTable[]} */ ([]);
        this.all_columns   = /** @type {QueryColumn[]} */ ([]);
        
        this.sql_body = sql;
    }

    /**
     * @param {string} name 
     * @param {ColumnType} type 
     * @param {QueryTable} table
     * @param {boolean} [primary]
     */
    add_column(name, type, table, primary = false) {
        const column = new QueryColumn(name, type, primary, undefined, table);
        this.all_columns.push(column);
        return column;
    }
    
    /**
     * @param {string} name 
     * @param {ColumnType} type 
     * @param {string} [sql]
     */
    add_column_free(name, type, sql) {
        const column = new QueryColumn(name, type, undefined, sql);
        this.all_columns.push(column);
        return column;
    }

    /**
     * @param {string} true_name 
     * @param {string} [name] 
     */
    add_table(true_name, name) {
        const table = new QueryTable(true_name, name);
        this.tables.push(table);
        return table;
    }

    get_select_sql_header() {
        return this.all_columns.map(x => x.get_select_sql_header()).join(', ');
    }
}


