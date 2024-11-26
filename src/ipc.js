//@ts-check
import { reactive } from 'vue'
import { invoke } from "@tauri-apps/api/tauri";
import { save, open, message, confirm } from "@tauri-apps/api/dialog";
import { exists } from "@tauri-apps/api/fs";



const state = reactive({
    db_is_open: false,
    db_path: "",
});

/**
 * @param {boolean} value 
 */
function set_state_db_opened(value) {
    if(state.db_is_open !== value) {
        state.db_is_open = value;
        if(value) {
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

async function db_open() {
    let path = await open({
        title: "Wybierz plik bazy danych",
        filters: [{name: "Sqlite Database", extensions: ['db3']}]
    });
    if(!path) return path;
    return await invoke("open_database", {path}).then(() => {
        if(path instanceof Array) throw new Error("MULTIPLE PATHS CHOSEN FOR OPEN DATABASE");
        set_state_db_path(path);
        set_state_db_opened(true);
        return path;
    });
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
    name = name + '_' + (new Date()).toString().replace(/:/g, '_');
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
async function db_insert(query) {
    return await invoke("perform_insert", {query});
}

/**
 * @param {string} query 
 * @returns {Promise<number>}
 */
async function db_execute(query) {
    return await invoke("perform_execute", {query});
}

/**
 * @param {string} query 
 */
async function db_execute_batch(query) {
    return await invoke("perform_execute_batch", {query});
}


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
async function backup_list(dirpath, variantNames, prefix="kopia_warsztat", ext= '.db3') {
    const res = await invoke('perform_backup_lists', {
        dirpath,
        variantNames,
        prefix,
        ext
    });
    return res;
}

/**
 * @param {string[]} filepathsToDelete 
 * @param {{path: string, variant: string, date: string}[]} copiesToCreate 
 * @param {string}   prefix
 * @param {string}   ext
 * @param {boolean}  nodelete
 * @returns {Promise<void>}
 */
async function backup(filepathsToDelete, copiesToCreate, prefix, ext, nodelete) {
    const res = await invoke('perform_backup', {
        filepathsToDelete,
        copiesToCreate,
        prefix,
        ext,
        nodelete
    });
    return res;
}

/**
 * @typedef IPCQueryResult
 * @type {[any[][], string[]]} 
 * [value[row_index][column_index], column_name[column_index]]
 */

/**
 * @param {string} query 
 * @returns {Promise<IPCQueryResult>}
 */
async function db_query(query) {
    return await invoke("perform_query", {query});
}

function refresh_state(){
    console.log("Refreshing IPC state");
    return invoke("get_current_db_state").then(init_state => {
        set_state_db_path  (init_state.path);
        set_state_db_opened(init_state.is_open);
    });
}

refresh_state().catch(err => {
    console.error("Error refreshing state", err);
});

export default {
    state,
    
    db_open,
    db_close,
    db_save,
    db_export_csv,
    db_import_csv,
    db_insert,
    db_execute,
    db_execute_batch,
    db_query,

    db_as_transaction,

    backup_list,
    backup,
}
