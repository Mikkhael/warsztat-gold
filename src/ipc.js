//@ts-check
import { reactive } from 'vue'
import { invoke } from "@tauri-apps/api/tauri";
import { save, open, message, confirm } from "@tauri-apps/api/dialog";
import { exists } from "@tauri-apps/api/fs";



const state = reactive({
    db_is_open: false,
    db_path: "",
    db_info_version_int: 0,
});

const GET_DB_INFO = {
    version_int() {return state.db_info_version_int;},
    supports_klient_custom_info() {return state.db_info_version_int >= 1;},
}

/**
 * @param {boolean} value 
 */
async function set_state_db_opened(value, force = false) {
    if(force || state.db_is_open !== value) {
        state.db_is_open = value;
        if(value) {
            try {
                const db_info = await db_query("SELECT \"version_int\" FROM `DB_STRUCTURE_INFO`");
                const version_int_str = db_info[0]?.[0]?.[0] ?? '';
                const version_int = typeof version_int_str === 'number' ? Number(version_int_str) : 0;
                state.db_info_version_int = version_int;
            } catch(err) {
                state.db_info_version_int = 0;
            }
            window.dispatchEvent(new Event('db_opened'));
        } else {
            window.dispatchEvent(new Event('db_closed'));
        }
    }
}

/**
 * @param {string} value 
 */
function set_state_db_path(value) {
    state.db_path = value;
}

/**
 * @param {boolean} value 
 */
function sync_close_prevention(value) {
    return invoke('sync_close_prevention', {value});
}

// /**
//  * @param {string} label 
//  * @param {string} js 
//  */
// function run_js(label, js) {
//     console.log(`RUN_JS Label:${label} JS:\`${js}\` ...`);
//     return invoke("run_js", {label, js}).then( () => {
//         console.log("RUN_JS done.");
//     }).catch((err) => {
//         console.error("RUN_JS error: ", err);
//     });
// }


// function get_state(){
//     console.log("GOT STATE");
//     return state;
// }

//////////// Utils //////////////////////
/**
 * 
 * @param {string} a 
 * @param {string} b 
 * @returns {Promise<string>}
 */
function join_path(a, b) {
    return invoke("join_path", {a, b});
}
/**
 * 
 * @param {string} path 
 * @returns {Promise<string>}
 */
function file_name(path) {
    return invoke("file_name", {path});
}


//////////// File System //////////////////////

/**
 * @param {string} path 
 * @param {string} data
 */
function write_string_file(path, data) {
    return invoke("write_string_file", {path, data});
}


//////////// Dialog //////////////////////

// async function dialog_save_file_with_warn(options){
//     let path = await save(options);
//     if(exists(path)){
//         let res = await confirm("Plik już istnieje. Czy chcesz go nadpisać?");
//         if(!res) {
//             return null;
//         }
//     }
// }

//////////// Database //////////////////////

async function db_open(no_state_change = false, /**@type {string?} */ force_path = null) {
    let path = force_path ?? await open({
        title: "Wybierz plik bazy danych",
        filters: [{name: "Baza Danych Warsztat Gold", extensions: ['autogold']}, {name: "Sqlite Database", extensions: ['db3']}]
    });
    if(!path) return path;
    await db_close();
    return await invoke("open_database", {path}).then(() => {
        if(path instanceof Array) throw new Error("MULTIPLE PATHS CHOSEN FOR OPEN DATABASE");
        set_state_db_path(path);
        if(!no_state_change) {
            set_state_db_opened(true);
        }
        return path;
    });
}
function db_rebuild(reemit_opened_database = true, with_vacuum = true) {
    return invoke("rebuild_database", {withVacuum: with_vacuum}).then(() => {
        if(reemit_opened_database) {
            set_state_db_opened(true, true);
        }
    });
}
async function db_create() {
    let path = await save({
        title: "Stwórz plik nowej bazy danych",
        filters: [{name: "Baza Danych Warsztat Gold", extensions: ['autogold']}, {name: "Sqlite Database", extensions: ['db3']}],
        defaultPath: state.db_path || undefined,
    });
    if(!path) return null;
    await db_close();
    await invoke("open_database", {path});
    if(path) {
        await db_rebuild(true);
    }
    return path;
}

function db_close() {
    return invoke("close_database").then(() => {
        set_state_db_path("");
        set_state_db_opened(false);
    });
}
async function db_save() {
    let path = await save({
        title: "Wybierz plik, gdzie zapisać bazę danych",
        filters: [{name: "Sqlite Database", extensions: ['db3']}],
        defaultPath: state.db_path || undefined,
    });
    if(!path) return path;
    return await invoke("save_database", {path}).then(() => path);
}

async function db_export_csv() {
    let path = await open({
        title: "Wybierz folder docelowy",
        directory: true,
        recursive: true
    });
    if(path instanceof Array) throw new Error("MULTIPLE PATHS CHOSEN FOR EXPORT CSV");
    if(!path) return path;
    let name = await file_name(state.db_path);
    console.log("name", name);
    name = name + '_kopia_zapasowa_' + (new Date()).toString().replace(/:/g, '_');
    let exportPath = await join_path(path, name);
    console.log("export csv path", exportPath);
    return await invoke("export_csv", {exportPath}).then(() => exportPath);
}
async function db_import_csv() {
    let path = await open({
        title: "Wybierz folder źródłowy",
        directory: true,
        recursive: true
    });
    if(!path) return path;
    console.log("ixport csv path", path);
    return await invoke("import_csv", {importPath: path}).then(() => path);
}



/**
 * @param {string} query 
 * @returns {Promise<number>}
 */
async function db_execute(query, asBatch = false, getLastRowid = false) {
    console.log("QUERY EXECUTE: ", query);
    return await invoke("perform_execute", {query, asBatch, getLastRowid});
}

// async function db_insert(query) {
//     return await invoke("perform_insert", {query});
// }
// async function db_execute_batch(query) {
//     return await invoke("perform_execute_batch", {query});
// }


/**
 * @template T
 * @param {() => Promise<T>} callback 
 */
async function db_as_transaction(callback) {
    try {
        await db_execute("BEGIN TRANSACTION;");
        const res = await callback();
        await db_execute("COMMIT TRANSACTION;");
        return res;
    } catch (err) {
        await db_execute("ROLLBACK TRANSACTION;");
        throw err;
    }
}

/**
 * @typedef {{path: string, date: string}} BackupVariantListEntry
 * @typedef {{name: string, entries: BackupVariantListEntry[]}} BackupVariantList
 */

/**
 * @param {string} dirpath
 * @param {string[]} variantNames
 * @returns {Promise<BackupVariantList[]>}
 */
async function backup_list(dirpath, variantNames, prefix="kopia_warsztat", ext= '.autogold') {
    const res = await invoke('perform_backup_lists', {
        dirpath,
        variantNames,
        prefix,
        ext
    });
    return res;
}

/**
 * @typedef {{path: string, variant: string, date: string}} BackupNewFormat
 */

/**
 * @param {string[]} filepathsToDelete 
 * @param {BackupNewFormat[]} copiesToCreate 
 * @param {string}   prefix
 * @param {string}   ext
 * @param {boolean}  nodelete
 * @returns {Promise<{good: BackupNewFormat[], bad: [BackupNewFormat, string][]}>}
 */
async function backup(filepathsToDelete, copiesToCreate, prefix, ext, nodelete) {
    const res = await invoke('perform_backup', {
        filepathsToDelete,
        copiesToCreate,
        prefix,
        ext,
        nodelete
    });
    console.log("BACKUP RES", res);
    return res;
}

/**
 * @typedef IPCQueryResult
 * @type {[any[][], string[]]} 
 * [value[row_index][column_index], column_name[column_index]]
 */

/**
 * @param {string} query 
 * @param {number} [hardLimit]
 * @returns {Promise<IPCQueryResult>}
 */
async function db_query(query, hardLimit) {
    console.log("QUERY: ", query);
    const res = await invoke("perform_query", {query, hardLimit});
    return res;
}

/**
 * @param {string} path 
 * @param {string} data 
 */
async function save_ksef_faktura(path, data) {
    return write_string_file(path, data);
}


/**
 * @typedef {{
 *  is_open: boolean,
 *  path:    string,
 *  argv:    string[]
 * }} CurrentDbState
 */

function refresh_state(){
    console.log("Refreshing IPC state");
    return invoke("get_current_db_state").then(/**@param {CurrentDbState} init_state*/ init_state => {
        set_state_db_path  (init_state.path);
        set_state_db_opened(init_state.is_open);
        console.log("ARGV", init_state.argv);
        return init_state;
    });
}

refresh_state()
.then(init_state => {
    if(!init_state.is_open && init_state.argv.length >= 2){
        db_open(undefined, init_state.argv[1]);
    }
})
.catch(err => {
    console.error("Error refreshing state", err);
});

export default {
    state,
    GET_DB_INFO,
    set_state_db_opened,
    set_state_db_path,
    sync_close_prevention,
    
    db_open,
    db_rebuild,
    db_create,
    db_close,
    db_save,
    db_export_csv,
    db_import_csv,
    // db_insert,
    db_execute,
    // db_execute_batch,
    db_query,

    db_as_transaction,

    save_ksef_faktura,

    backup_list,
    backup,
}
