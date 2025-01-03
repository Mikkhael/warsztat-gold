//@ts-check

import ipc from "./ipc";
import useMainMsgManager from "./components/Msg/MsgManager";
import { useMainSettings } from "./components/Settings/Settings";
import { createApp, registerRuntimeCompiler } from "vue";
import "./styles.css";
import "./WinBox.css";
import App from "./App.vue";
import contextmenu from "./contextmenu";
import { listen } from "@tauri-apps/api/event";
import { writeText as clipboard_write, readText as clipboard_read} from "@tauri-apps/api/clipboard";

const msgManager = useMainMsgManager();
const mainSettings = useMainSettings();

listen("request_db_open", async (e) => {
    ipc.db_open().catch((err) => {
        msgManager.postError(err);
    });
});
listen("request_db_close", async (e) => {
    ipc.db_close().catch(err => {
        msgManager.postError(err);
    });
});

function disable_refresh() {
    document.addEventListener('keydown', async event => {
        // Prevent F5 or Ctrl+R (Windows/Linux) and Command+R (Mac) from refreshing the page
        if ( event.key === 'F5' ||
            (event.key === 'r'  && event.ctrlKey) ||
            (event.key === 'r'  && event.metaKey) ) {
                if(!event.shiftKey) {
                    event.preventDefault();
                }
        }
    });
};
disable_refresh();

window.addEventListener('db_opened', () => {
    msgManager.post('info', 'Otworzono bazę danych', 3000);
    msgManager.close_all_with_content('Nie otworzono bazy danych');
    mainSettings.load_from_db_all().then(has_settings_table => {
        if(!has_settings_table){
            msgManager.post('warn', 'Baza nie posiada tablicy pozwalającej na zapisywanie ustawień!', 4000);
        }
    }).catch((err) => {
        msgManager.postError('Błąd podczas wczytywania konfiguracji z bazy danych: ' + (err?.message ?? err));
    });
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
    console.log('COPY', e);
    if(to_copy === null || to_copy === '') {
        await clipboard_write(e.payload);
        return;
    }
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