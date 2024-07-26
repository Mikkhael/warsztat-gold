<script setup>
//@ts-check

import { ref } from "vue";
import ipc from "../../ipc";
// import { invoke } from "@tauri-apps/api/tauri";


const props = defineProps({
    query: String,
    
});



</script>

<template>

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

<style>

</style>