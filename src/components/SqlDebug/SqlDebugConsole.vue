<script setup>
//@ts-check
import { ref, onMounted } from "vue";
import ipc from "../../ipc";
// import { invoke } from "@tauri-apps/api/tauri";

const query_string  = ref("");
const query_history_select = ref();
const query_history = ref(/**@type {string[]}*/ ([]));
const returned_rows = ref([]);
const returend_col_names = ref([]);
const last_status_success  = ref(true);
const last_status_message  = ref("");


function handle_error(err_message){
    last_status_success.value = false;
    last_status_message.value = err_message;
}

function handle_success_insert(rowid){
    last_status_success.value = true;
    last_status_message.value = `Inserted rowid ${rowid}`;
    // returned_rows.value = [];
}
function handle_success_execute(count){
    last_status_success.value = true;
    last_status_message.value = `Query affected ${count} rows`;
    // returned_rows.value = [];
}
function handle_success_query([rows, col_names]){
    last_status_success.value = true;
    last_status_message.value = `Query returned ${rows.length} rows`;
    returned_rows.value = rows;
    returend_col_names.value = col_names;
}

function paste_query(query){
    query_string.value = query;
}
function paste_selected(element) {
    paste_query(element.options[element.selectedIndex].text);
}
function save_query_to_history(query){
    let index = query_history.value.indexOf(query);
    if(index > 0){
        query_history.value.splice(index, 1);
    }
    if(index != 0){
        query_history.value.unshift(query);
        query_history_select.value.value = 0;
    }
    if(query_history.value.length > 100){
        query_history.value.splice(100, query_history.value.length - 100);
    }
    localStorage.setItem("sql_debug_query_history", JSON.stringify(query_history.value));
}

function perform_select(){
    save_query_to_history(query_string.value);
    return ipc.db_query(query_string.value).then(handle_success_query).catch(handle_error);
}
function perform_insert(){
    save_query_to_history(query_string.value);
    return ipc.db_execute(query_string.value, true, true).then(handle_success_insert).catch(handle_error);
}
function perform_execute(){
    save_query_to_history(query_string.value);
    return ipc.db_execute(query_string.value).then(handle_success_execute).catch(handle_error);
}
function perform_execute_batch(){
    save_query_to_history(query_string.value);
    return ipc.db_execute(query_string.value, true).then(handle_success_execute).catch(handle_error);
}
function save(){
    return ipc.db_save().then(path => {
        if(!path) return;
        last_status_success.value = true;
        last_status_message.value = `Saved Database at '${path}'`;
    }).catch(handle_error);
}
function export_csv(){
    return ipc.db_export_csv().then(path => {
        if(!path) return;
        last_status_success.value = true;
        last_status_message.value = `Exported CSV to '${path}'`;
    }).catch(handle_error);
}
function import_csv(){
    return ipc.db_import_csv().then(path => {
        if(!path) return;
        last_status_success.value = true;
        last_status_message.value = `Imported CSV from '${path}'`;
    }).catch(handle_error);
}
function open(){
    return ipc.db_open().then(path => {
        if(!path) return;
        last_status_success.value = true;
        last_status_message.value = `Opened Database at '${path}'`;
    }).catch(handle_error);
}
function close(){
    return ipc.db_close().then(() => {
        last_status_success.value = true;
        last_status_message.value = `Closed database`;
    }).catch(handle_error);
}

onMounted(() => {
    const x = localStorage.getItem("sql_debug_query_history");
    if(x !== null) {
        query_history.value = JSON.parse(x);
    }
});


defineExpose({
    query_history,
    query_string,
    last_status_success, 
    last_status_message
});

</script>

<template>

<div class="sql_console">
    
    <textarea v-model="query_string" class="query">
        
    </textarea>
    <select class="query_history" @change="paste_selected($event.target)" ref="query_history_select">
        <option v-for="(query, index) in query_history" :value="index">{{ query }}</option>
        <option value="-1"></option>
    </select>
    <div class="control">
        <button type="button" @click="perform_select()">SELECT</button>
        <button type="button" @click="perform_insert()">INSERT</button>
        <button type="button" @click="perform_execute()">EXE1</button>
        <button type="button" @click="perform_execute_batch()">EXECUTE</button>
        <button type="button" @click="open()">OPEN</button>
        <button type="button" @click="save()">SAVE</button>
        <button type="button" @click="export_csv()">EXPORT CSV</button>
        <button type="button" @click="import_csv()">IMPORT CSV</button>
        <button type="button" @click="close()">CLOSE</button>
    </div>
    <span v-if="ipc.state.db_is_open" >{{ ipc.state.db_path }} </span>
    <p :style="{color: last_status_success ? 'green' : 'red'}">{{last_status_message}}</p>
    <table class="result">
        <tr>
            <th>#</th>
            <th v-for="col_name in returend_col_names">{{ col_name }}</th>
        </tr>
        <tr v-for="(row, row_i) in returned_rows">
            <td>{{ row_i }}:</td>
            <td v-for="cell in row" :style="{color: typeof cell == 'number' ? 'green' : ''}">{{cell == null ? '~NULL~' : cell}}</td>
        </tr>
    </table>
</div>
    
</template>

<style>

.sql_console {
    display: flex;
    flex-direction: column;
    align-items: stretch;
}

.sql_console .control {
    display: flex;
    flex-direction: row;
}
.sql_console .control > * {
    flex-grow: 1;
}
.sql_console .result tr * {
    outline: 1px solid black;
}
    
</style>