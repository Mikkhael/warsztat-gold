<script setup>
import SqlDebugConsole from "./components/SqlDebug/SqlDebugConsole.vue";
import QueryFormDebug from "./components/SqlDebug/QueryFormDebug.vue";
import QueryFormSimpleDebug from "./components/SqlDebug/QueryFormSimpleDebug.vue";
import FormControlsDebug from "./components/SqlDebug/FormControlsDebug.vue";
import FloatingWindowsTest from "./components/FloatingWindows/FloatingWindowsTest.vue";
import AlertsDebug from "./components/SqlDebug/AlertsDebug.vue";
import QueryViewerDebug from "./components/SqlDebug/QueryViewerDebug.vue";
import MainWindow from "./components/MainWindow.vue";
import { onMounted, readonly, ref } from "vue";

const main_components = [
  MainWindow,
  SqlDebugConsole,
  QueryFormDebug,
  QueryFormSimpleDebug,
  FormControlsDebug,
  FloatingWindowsTest,
  QueryViewerDebug,
  AlertsDebug,
];
const main_components_names = readonly([
  "MainWindow",
  "SqlDebugConsole",
  "QueryFormDebug",
  "QueryFormSimpleDebug",
  "FormControlsDebug",
  "FloatingWindowsTest",
  "QueryViewerDebug",
  "AlertsDebug"
]);
const current_main_component_index = ref(5);
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

