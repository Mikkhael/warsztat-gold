import { reactive } from 'vue'
import { invoke } from "@tauri-apps/api/tauri";


const state = reactive({
    db_is_open: false,
    db_path: "",
});

// function get_state(){
//     console.log("GOT STATE");
//     return state;
// }

function db_open() {
    return invoke("open_database").then(path => {
        state.db_is_open = true;
        state.db_path = path; 
        return path;
    })
}
function db_close() {
    return invoke("close_database");
}
function db_save() {
    return invoke("save_database");
}

function db_execute(query) {
    return invoke("perform_execute", {query});
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

await refresh_state().catch(err => {
    console.error("Error refreshing state", err);
});
console.log("Initialized IPC");

export default {
    state,
    db_open,
    db_close,
    db_save,
    db_execute,
    db_query,
}
