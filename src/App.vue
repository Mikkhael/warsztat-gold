<script setup>
import SqlDebugConsole from "./components/SqlDebug/SqlDebugConsole.vue";
import FloatingWindowsTest from "./components/FloatingWindows/FloatingWindowsTest.vue";
import MainWindow from "./components/MainWindow.vue";
import { onMounted, readonly, ref } from "vue";

const main_components = [
  MainWindow,
  SqlDebugConsole,
  FloatingWindowsTest,
];
const main_components_names = readonly([
  "MainWindow",
  "SqlDebugConsole",
  "FloatingWindowsTest",
]);
const current_main_component_index = ref(0);
const current_main_component = ref();


onMounted(() => {
    window.APP_DEBUG = {
    current_main_component,
  };
});

</script>

<template>
  
  <component :is="main_components[current_main_component_index]"  ref="current_main_component"/>

  <!-- <select v-model="current_main_component_index">
    <option v-for="(name, index) in main_components_names" :value="index">{{ name }}</option>
  </select> -->

</template>

