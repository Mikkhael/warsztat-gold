//@ts-check

import { DataGraphNodeBase } from "./DataGraph";


class DatabaseNode extends DataGraphNodeBase {
    constructor(){
        super();
        /**@type {Object.<string, TableNode>} */
        this.tables = {};
    }

    add_table(name) {
        const table = new TableNode(this, name);
        this.tables[name] = table;
        return table;
    }
}

class TableNode extends DataGraphNodeBase{
    /**
     * @param {DatabaseNode?} db
     * @param {string} name 
     */
    constructor(db, name) {
        super();
        this.name = name;
        this.add_dep(db);
    }
}

export {
    TableNode,
    DatabaseNode
}