<script setup>
import SqlDebugConsole from "./components/SqlDebug/SqlDebugConsole.vue";
import QueryFormDebug from "./components/SqlDebug/QueryFormDebug.vue";
import FloatingWindowsTest from "./components/FloatingWindows/FloatingWindowsTest.vue";
import MainWindow from "./components/MainWindow.vue";
import { onMounted, readonly, ref } from "vue";

const main_components = [
  MainWindow,
  SqlDebugConsole,
  QueryFormDebug,
  FloatingWindowsTest,
];
const main_components_names = readonly([
  "MainWindow",
  "SqlDebugConsole",
  "QueryFormDebug",
  "FloatingWindowsTest",
]);
const current_main_component_index = ref(2);
const current_main_component = ref();


onMounted(() => {
    window.APP_DEBUG = {
    current_main_component,
    IDX: current_main_component_index
  };
});

</script>

<template>

<select v-model="current_main_component_index">
  <option v-for="(name, index) in main_components_names" :value="index">{{ name }}</option>
</select>

  <component :is="main_components[current_main_component_index]"  ref="current_main_component"/>


</template>

