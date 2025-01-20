<script setup>
//@ts-check
import { onMounted, readonly, ref, computed } from "vue";
import { emit, listen } from "@tauri-apps/api/event";
import { onUpdaterEvent } from "@tauri-apps/api/updater";
import ipc from "../ipc";
import FWCollection from "./FloatingWindows/FWCollection.vue";
import useMainFWManager from "./FloatingWindows/FWManager";
import useMainMsgManager from "./Msg/MsgManager";

import { useMainBackupManager } from "./Backup";
import { useMainClosePreventionManager } from "../ClosePrevention";

import MainWindow_OptionBtn from "./MainWindow_OptionBtn.vue";

import TestWindow1 from "./FloatingWindows/TestWindow1.vue"
import TestWindow2 from "./FloatingWindows/TestWindow2.vue"

import TableViewer from "./TableViewer/TableViewer.vue";

import SettingsWindow from "./Settings/SettingsWindow.vue";


import Klienci from "../Forms/Klienci.vue";
// import SamochodyKlientow from "../Forms/SamochodyKlientow.vue";
import ZleceniaNaprawy from "../Forms/ZleceniaNaprawy.vue";
import NazwyCzesci from "../Forms/NazwyCzesci.vue";
// import ZleceniaNaprawy_Czesci from "../Forms/ZleceniaNaprawy_Czesci.vue";

import SQLDebugConsole from "./SqlDebug/SqlDebugConsole.vue";
import ZleceniaNaprawyAdv from "../Forms/ZleceniaNaprawyAdv.vue";


const fwManager  = useMainFWManager();
const msgManager = useMainMsgManager();

onUpdaterEvent(({ status, error }) => {
    console.log('Updater event', status, error);
    if(status === 'ERROR') {
        msgManager.postError("Błąd podczas pobierania aktualizacji: " + error);
    }
});

listen('open_sql_console_window', () => {
    tool_sql();
});
fwManager.set_viewport({top: '24px'});

function handle_error(msg) {
    msgManager.postError(msg);
}

const backupManager = useMainBackupManager();
backupManager.start_in_component();

const mainClosePreventionManager = useMainClosePreventionManager();
mainClosePreventionManager.reset();
mainClosePreventionManager.start_main_guard(async () => {
    await backupManager.perform_backup_on_close();
});

function focus_on_window(title) {
    fwManager.focus_window(title);
}

function create_window_focus_subs() {
    const titles = Array.from(fwManager.opened_windows.keys()).sort();
    return titles.map(title => {
        return {name: title, onclick: focus_on_window}
    });
}

const window_focus_subs = computed(() => {
    return create_window_focus_subs();
})

//////////// TOOLBAR HANDLERS

function tool_create_new() {
    return ipc.db_create().then(path => {
        if(path === null) return;
    }).catch(handle_error);
}

function tool_table_viewer() {
    fwManager.open_or_focus_window("Podgląd Tabeli", TableViewer);
}
function tool_open() {
    ipc.db_open().catch((err) => {
        msgManager.postError(err);
    });
}
function tool_close() {
    ipc.db_close().catch((err) => {
        msgManager.postError(err);
    });
}
function tool_rebuild() {
    ipc.db_rebuild().catch((err) => {
        msgManager.postError(err);
    });
}

function tool_import() {
    return ipc.db_import_csv().then((path) => {
        if(path) {
            msgManager.post("info", `Zaimportowano z: ${path}`);
        }
    }).catch(handle_error);
}
function tool_export() {
    return ipc.db_export_csv().then((path) => {
        if(path) {
            msgManager.post("info", `Wyeksportowano do: ${path}`);
        }
    }).catch(handle_error);
}

function tool_sql() {
    fwManager.open_or_focus_window("Konsola SQL", SQLDebugConsole);
}

function tool_testview() {
    window.dispatchEvent(new Event('testview_request'));
}

function tool_devtools() {
    emit('open_devtools');
}

function tool_settings() {
    fwManager.open_or_focus_window("Ustawienia", SettingsWindow);
}

function tool_zlecenia_all(){
    fwManager.open_or_focus_window("Wszystkie Zlecenia", ZleceniaNaprawyAdv, {category: "zlecenia_wszystkie"});
}

function tool_zlecenia(){
    fwManager.open_or_focus_window("Zlecenia Otwarte", ZleceniaNaprawyAdv, {category: "zlecenia_otwarte", props: {show_only_open: true}});
}

function tool_klienci(){
    fwManager.open_or_focus_window("Klienci", Klienci, {category: "klienci"});
}

function tool_czesci(){
    fwManager.open_or_focus_window("Części", NazwyCzesci,{category: "czesci"});
}

// function tool_obroty_zlec(){
//     fwManager.open_or_focus_window("Test Obroty Zlec", ZleceniaNaprawy_Czesci);
// }

function minimize_all() {
    fwManager.minimize_all();
}
async function close_all(subname, name, /**@type {MouseEvent} */ event) {
    const force = event.shiftKey;
    await fwManager.close_all(force);
}


</script>

<template>
  
    <section class="container">

        <section class="toolbar">

            <MainWindow_OptionBtn
                :options="{
                    name: 'Plik',
                    sub: [
                        {name: 'Nowa Baza',        onclick: tool_create_new},
                        {name: 'Otwórz',           onclick: tool_open},
                        {name: 'Zamknij',          onclick: tool_close},
                        {name: 'Importuj',         onclick: tool_import},
                        {name: 'Eksportuj',        onclick: tool_export},
                        {name: 'Napraw Strukturę', onclick: tool_rebuild},
                        {},
                        {name: 'Konsola SQL',      onclick: tool_sql},
                        {name: 'Tryp Testowy',     onclick: tool_testview, dev: true},
                        {name: 'Narzędzia Dev',    onclick: tool_devtools, dev: false},
                    ],
                }"
            />
            <MainWindow_OptionBtn
                :options="{
                    name: 'Okna',
                    sub: [
                        {name: 'Minimalizuj wszystkie', onclick: minimize_all},
                        {name: 'Zamknij wszystkie',     onclick: close_all},
                        {},
                        ...window_focus_subs
                    ],
                }"
            />
            <MainWindow_OptionBtn
                :options="{
                    name: 'Podgląd Tabeli',
                    onclick: tool_table_viewer,
                }"
            />
            <MainWindow_OptionBtn
                :options="{
                    name: 'Ustawienia',
                    onclick: tool_settings
                }"
            />
            <div class="spacer"></div>
            <MainWindow_OptionBtn
                :options="{
                    name: 'Wszystkie Zlecenia',
                    onclick: tool_zlecenia_all
                }"
            />
            <MainWindow_OptionBtn
                :options="{
                    name: 'Zlecenia Otwarte',
                    onclick: tool_zlecenia
                }"
            />
            <MainWindow_OptionBtn
                :options="{
                    name: 'Klienci',
                    onclick: tool_klienci
                }"
            />
            <MainWindow_OptionBtn
                :options="{
                    name: 'Części',
                    onclick: tool_czesci
                }"
            />
            <div class="spacer"></div>
        </section>
        <main class="main">
            <FWCollection :manager="fwManager" @error="handle_error" />
            <div class="bigtext" v-show="!ipc.state.db_is_open" >
                Żadna baza danych nie jest otwarta.
            </div>
        </main>
        <footer class="footer">
            <span class="appname">
                Warsztat Auto-Gold
            </span>
        </footer>

    </section>

</template>

<style scoped>

* {
    box-sizing: border-box;
}
.container{
    position: absolute;
    top: 0px;
    bottom: 0px;
    left: 0px;
    right: 0px;
    display: flex;
    flex-direction: column;
}

.container > * {
    width: 100%;
}


.toolbar {
    position: relative;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding: 2px;
    height: 28px;
    background-color: #d8d8d8;
}
.toolbar .spacer {
    flex-grow: 1;
}

.footer {
    min-height: 24px;
    font-size: 0.9em;
    background-color: #d8d8d8;
    display: flex;
    justify-content: space-between;
}
.footer .last_state_info{
    color: green;
}
.footer .last_state_info[error="1"]{
    color: red;
}

.main {
    flex-grow: 1;
    text-align: center;
    position: relative;
    background-color: #a8a8a8;
    z-index: 0;

    background-image: url('/wallpaper.png');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: bottom;
}

.main .mainWindowsContainer{
    pointer-events: none;
    position: absolute;
    overflow: hidden;
    inset: 0;
    z-index: 0;
}


.main .bigtext {
    font-size: 5em;
    background-color: rgb(126, 126, 126);
}

</style>

