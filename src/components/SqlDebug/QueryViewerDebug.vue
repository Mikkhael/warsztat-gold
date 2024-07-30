<script setup>
//@ts-check
import { ref } from "vue";
import QueryViewer from "../QueryViewer/QueryViewer.vue";

const query_select  = ref("*");
const query_from    = ref("`płace`");
const query_where    = ref("`kwota` > 100");
const limit         = ref(10);
const step          = ref(1); 

</script>

<template>

    SELECT: <input type="text" v-model.lazy="query_select"> <br>
    FROM:   <input type="text" v-model.lazy="query_from">   <br>
    WHERE:  <input type="text" v-model.lazy="query_where">   <br>
    LIMIT:  <input type="number" v-model.lazy="limit">      <br>
    STEP:   <input type="number" v-model.lazy="step">       <br>

    <QueryViewer  :query_select="query_select" :query_from="query_from" :query_where="query_where" :limit="limit" :step="step" />
    
</template>

<style>

    
</style>