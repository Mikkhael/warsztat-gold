import { reactive } from 'vue'
import { invoke } from "@tauri-apps/api/tauri";
import { save, open, message, confirm } from "@tauri-apps/api/dialog";
import { exists } from "@tauri-apps/api/fs";


const state = reactive({
    db_is_open: false,
    db_path: "",
});

// function get_state(){
//     console.log("GOT STATE");
//     return state;
// }

//////////// Utils //////////////////////

function join_path(a, b) {
    return invoke("join_path", {a, b});
}
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
        state.db_is_open = true;
        state.db_path = path;
        return path;
    });
}
function db_close() {
    return invoke("close_database").then(() => {
        state.db_is_open = false;
        state.db_path = "";
    });
}
async function db_save() {
    let path = await save({
        title: "Wybierz plik, gdzie zapisać bazę danych",
        filters: [{name: "Sqlite Database", extensions: ['db3']}],
        defaultPath: state.path || undefined,
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

function db_execute(query) {
    return invoke("perform_execute", {query});
}

function db_execute_batch(query) {
    return invoke("perform_execute_batch", {query});
}

function db_query(query) {
    return invoke("perform_query", {query});
}

function refresh_state(){
    console.log("Refreshing IPC state");
    return Promise.all([
        invoke("get_current_db_state").then(init_state => {
            state.db_is_open = init_state.is_open;
            state.db_path    = init_state.path;
        })
    ])
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
    db_execute,
    db_execute_batch,
    db_query,
}
