//@ts-check

import ipc from "./ipc";
import { createApp } from "vue";
import "./styles.css";
import "./WinBox.css";
import App from "./App.vue";
import { showMenu } from "tauri-plugin-context-menu";
import { emit } from "@tauri-apps/api/event";


window.addEventListener("contextmenu", (e) => {
    const target = /**@type {HTMLElement & HTMLInputElement} */ (e.target);
    console.log('Opening context menu', target.tagName, target, e);
    if( target.tagName === 'INPUT' && target.type === 'text'   ||
        target.tagName === 'INPUT' && target.type === 'number' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
    ) {
        // TODO custom menu for text inptus
        return;
    }
    e.preventDefault();
    showMenu({items: [
        {label: "Otwórz Bazę Danych",  event: (e) => {ipc.db_open()}},
        {label: "Zamknij Bazę Danych", event: (e) => {ipc.db_close()}},
        {is_separator: true},
        {label: 'Okno Testowe', event: "change_to_test_window", payload: '2'},
        {label: 'Dev Tools', event: (e) => {emit('open_devtools');}},
    ]});
});

const app = createApp(App);

window['IPC']  = ipc;
window['_app'] = app;

app.mount("#app");