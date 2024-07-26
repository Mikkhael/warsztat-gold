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

class ColumnStructure {
    /**
     * @param {string} name 
     * @param {ColumnType} type 
     * @param {boolean} [primary] 
     */
    constructor(name, type, primary = false) {
        this.name = name;
        this.type = type;
        this.primary = primary;
    }
}

class TableStructure {
    /**
     * @param {string} name 
     * @param {Object.<string, ColumnStructure>} columns
     */
    constructor(name, columns) {
        this.name = name;
        this.columns = columns;
    }
}

export {
    ColumnType,
    ColumnStructure,
    TableStructure,
}