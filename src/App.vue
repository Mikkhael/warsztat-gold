<script setup>
import { listen } from "@tauri-apps/api/event";

import SqlDebugConsole from "./components/SqlDebug/SqlDebugConsole.vue";
import QueryFormDebug from "./components/SqlDebug/QueryFormDebug.vue";
import QueryFormSimpleDebug from "./components/SqlDebug/QueryFormSimpleDebug.vue";
import FormControlsDebug from "./components/SqlDebug/FormControlsDebug.vue";
import FloatingWindowsTest from "./components/FloatingWindows/FloatingWindowsTest.vue";
import AlertsDebug from "./components/SqlDebug/AlertsDebug.vue";
import QueryViewerDebug from "./components/SqlDebug/QueryViewerDebug.vue";
import MainWindow from "./components/MainWindow.vue";
import { onMounted, readonly, ref } from "vue";

import WinBox from "./components/WinBox/winbox";

import useMainMsgManager from "./components/Msg/MsgManager";
import CornerMsgContainer from "./components/Msg/CornerMsgContainer.vue";

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
const current_main_component_index = ref(4);
const current_main_component = ref();

const msg_manager = useMainMsgManager();

listen("change_to_test_window", (e) => {
  console.log('Changing to test window ', e);
  current_main_component_index.value = +e.payload;
})

onMounted(() => {
    window.APP_DEBUG = {
      current_main_component,
      IDX: current_main_component_index,
      WinBox,
  };
});

</script>

<template>
  
  <select v-model="current_main_component_index">
    <option v-for="(name, index) in main_components_names" :value="index">{{ name }}</option>
  </select>
  
  <component :is="main_components[current_main_component_index]"  ref="current_main_component"/>
  
  
  <CornerMsgContainer :manager="msg_manager" class="msg_container"/>

</template>