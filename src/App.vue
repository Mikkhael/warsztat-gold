<script setup>
import TestGreet from "./components/test_App.vue";
import SqlDebugConsole from "./components/SqlDebug/SqlDebugConsole.vue";
import { onMounted, ref } from "vue";

const sql_mode = ref("true");
const test_greet = ref();
const sql_debug_console = ref();

// defineExpose({
//   sql_debug_console,
//   test_greet
// })

onMounted(() => {
    window.APP_DEBUG = {
    sql_debug_console,
    test_greet
  };
});

</script>

<template>
  
  <SqlDebugConsole v-if="sql_mode" ref="sql_debug_console"/>
  <TestGreet v-else ref="test_greet"/>

  <input type="checkbox" v-model="sql_mode"> SQL_MODE

</template>

