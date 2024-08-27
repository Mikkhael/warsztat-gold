//@ts-check

import ipc from "./ipc";
import useMainMsgManager from "./components/Msg/MsgManager";
import { createApp, registerRuntimeCompiler } from "vue";
import "./styles.css";
import "./WinBox.css";
import App from "./App.vue";
import contextmenu from "./contextmenu";
import { listen } from "@tauri-apps/api/event";
import { writeText as clipboard_write, readText as clipboard_read} from "@tauri-apps/api/clipboard";

const msgManager = useMainMsgManager();

listen("request_db_open", async (e) => {
    ipc.db_open().catch((err) => {
        console.error(err);
        msgManager.postError(err);
    });
});
listen("request_db_close", async (e) => {
    ipc.db_close().catch(err => {
        console.error(err);
        msgManager.postError(err);
    });
});

window.addEventListener('db_opened', () => {
    msgManager.post('info', 'Otworzono bazę danych', 3000);
    msgManager.close_all_with_content('Nie otworzono bazy danych');
});

window.addEventListener('db_closed', () => {
    msgManager.post('info', 'Zamknięto bazę danych', 3000);
});

function get_selection_string(accept_empty) {
    const selection_string = window.getSelection()?.toString();
    if(selection_string === undefined || (accept_empty && selection_string === ""))
        return null;
    return selection_string;
}
listen("request_clipboard_copy", async (e) => {
    const to_copy = get_selection_string(false);
    if(to_copy === null)
        return;
    await clipboard_write(to_copy);
    console.log("Coppied text: ", to_copy);
});
listen("request_clipboard_cut", async (e) => {
    const to_copy = get_selection_string(false);
    if(to_copy === null)
        return;
    await clipboard_write(to_copy);
    document.execCommand('insertText', false, '');
    console.log('Cut string:', to_copy);
});
listen("request_clipboard_paste", async (e) => {
    const to_write = await clipboard_read();
    if(to_write === null)
        return; 
    document.execCommand('insertText', false, to_write);
    console.log("Pasted text: ", to_write);
});

contextmenu.start();

const app = createApp(App);

window['IPC']  = ipc;
window['_app'] = app;

app.mount("#app");