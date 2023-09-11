import ipc from "./ipc";
import { createApp } from "vue";
import "./styles.css";
import App from "./App.vue";

window.IPC = ipc;

window._app = createApp(App)
window._app.mount("#app");
