<script setup>
//@ts-check
import { onMounted, readonly, ref, computed } from "vue";
import { listen } from "@tauri-apps/api/event";
import ipc from "../ipc";
import FWCollection from "./FloatingWindows/FWCollection.vue";
import useMainFWManager from "./FloatingWindows/FWManager";
import useMainMsgManager from "./Msg/MsgManager";

import { useMainBackupManager } from "./Backup";
import { useMainClosePreventionManager } from "../ClosePrevention";

import MainWindow_OptionBtn from "./MainWindow_OptionBtn.vue";

import TestWindow1 from "./FloatingWindows/TestWindow1.vue"
import TestWindow2 from "./FloatingWindows/TestWindow2.vue"


import SettingsWindow from "./Settings/SettingsWindow.vue";


import Klienci from "../Forms/Klienci.vue";
// import SamochodyKlientow from "../Forms/SamochodyKlientow.vue";
import ZleceniaNaprawy from "../Forms/ZleceniaNaprawy.vue";
import NazwyCzesci from "../Forms/NazwyCzesci.vue";
// import ZleceniaNaprawy_Czesci from "../Forms/ZleceniaNaprawy_Czesci.vue";

import SQLDebugConsole from "./SqlDebug/SqlDebugConsole.vue";


const fwManager  = useMainFWManager();
const msgManager = useMainMsgManager();

listen('open_sql_console_window', () => {
    fwManager.open_or_focus_window("Konsola SQL", SQLDebugConsole);
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
// function tool_sql() {
//     fwManager.open_or_focus_window("SQL Debug", SQLDebugConsole);
// }
function tool_import() {
    return ipc.db_import_csv().catch(handle_error);
}
function tool_export() {
    return ipc.db_export_csv().catch(handle_error);
}
function tool_settings() {
    fwManager.open_or_focus_window("Ustawienia", SettingsWindow);
}

function tool_zlecenia(){
    fwManager.open_or_focus_window("Zlecenia Otwarte", ZleceniaNaprawy, {props: {show_clients: true}});
}

function tool_klienci(){
    fwManager.open_or_focus_window("Klienci", Klienci);
}

function tool_czesci(){
    fwManager.open_or_focus_window("Części", NazwyCzesci);
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
                        {name: 'Nowa Baza', onclick: tool_create_new},
                        {name: 'Importuj',  onclick: tool_import},
                        {name: 'Eksportuj', onclick: tool_export},
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
                    name: 'Ustawienia',
                    onclick: tool_settings
                }"
            />
            <div class="spacer"></div>
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
    background-color: rgb(231, 231, 231);
    z-index: 0;
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

