<script setup>
//@ts-check
import { computed, ref } from "vue";
import QueryViewer from "../QueryViewer/QueryViewer.vue";

const query_select  = ref("*");
const query_from    = ref("`płace`");
const query_where    = ref("`kwota` > 100");
const limit         = ref(10);
const step          = ref(1); 
const selectable    = ref(false); 
const from_json     = ref(false); 

// [["rowid"],["kwota", "kwota 123"], ["płace.`ID płac`", "ID"]]

function on_select(columns, row) {
    console.log("Selected row: ", columns, row);
}

const query_select_true = computed(() => {
    console.log("true deb", from_json.value, query_select.value);
    return from_json.value ? JSON.parse(query_select.value) : query_select.value;
});

</script>

<template>

    SELECT: <input type="text" v-model.lazy="query_select"> <br>
    FROM:   <input type="text" v-model.lazy="query_from">   <br>
    WHERE:  <input type="text" v-model.lazy="query_where">   <br>
    LIMIT:  <input type="number" v-model.lazy="limit">      <br>
    STEP:   <input type="number" v-model.lazy="step">       <br>

    SELECTABLE:   <input type="checkbox" v-model="selectable">       <br>
    FROM JSON:    <input type="checkbox" v-model="from_json">       <br>

    <QueryViewer  
        :query_select_fields="query_select_true" 
        :query_from="query_from" 
        :query_where="query_where" 
        :limit="limit" :step="step" 
        :selectable="selectable" 

        @select="on_select"
    />
    
</template>

<style>

    
</style>