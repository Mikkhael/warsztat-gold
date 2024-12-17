<script setup>
//@ts-check
import { onMounted, readonly, ref } from "vue";
import ipc from "../ipc";
import FWCollection from "./FloatingWindows/FWCollection.vue";
import useMainFWManager from "./FloatingWindows/FWManager";
import useMainMsgManager from "./Msg/MsgManager";

import { useMainBackupManager } from "./Backup";
import { useMainClosePreventionManager } from "../ClosePrevention";


import TestWindow1 from "./FloatingWindows/TestWindow1.vue"
import TestWindow2 from "./FloatingWindows/TestWindow2.vue"


import SettingsWindow from "./Settings/SettingsWindow.vue";


import Klienci from "../Forms/Klienci.vue";
import SamochodyKlientow from "../Forms/SamochodyKlientow.vue";
import ZleceniaNaprawy from "../Forms/ZleceniaNaprawy.vue";
import NazwyCzesci from "../Forms/NazwyCzesci.vue";
import ZleceniaNaprawy_Czesci from "../Forms/ZleceniaNaprawy_Czesci.vue";

import SQLDebugConsole from "./SqlDebug/SqlDebugConsole.vue";


const fwManager  = useMainFWManager();
const msgManager = useMainMsgManager();

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

//////////// TOOLBAR HANDLERS

function tool_open() {
    return ipc.db_open().then(path => {
        if(path === null) return;
    }).catch(handle_error);
}
function tool_sql() {
    fwManager.open_or_focus_window("SQL Debug", SQLDebugConsole);
}
function tool_settings() {
    fwManager.open_or_focus_window("Ustawienia", SettingsWindow);
}

function tool_zlecenia(){
    fwManager.open_or_focus_window("Zlecenia Otwarte", ZleceniaNaprawy, {show_clients: true});
}

function tool_klienci(){
    fwManager.open_or_focus_window("Klienci", Klienci);
}

function tool_czesci(){
    fwManager.open_or_focus_window("Części", NazwyCzesci);
}

function tool_obroty_zlec(){
    fwManager.open_or_focus_window("Test Obroty Zlec", ZleceniaNaprawy_Czesci);
}

</script>

<template>
  
    <section class="container">

        <section class="toolbar">
            <div class="toolgroup">
                <div class="tool" @click="tool_open();">Otwórz</div>
                <div class="tool" @click="tool_sql();" >SQL</div>
                <div class="tool" @click="tool_settings();" >Ustawienia</div>
            </div>
            <div class="toolgroup grow"></div>
            <div class="toolgroup">
                <div class="tool" @click="tool_zlecenia();">Zlecenia Otwarte</div>
                <div class="tool" @click="tool_klienci();" >Klienci</div>
                <div class="tool" @click="tool_czesci();" >Części</div>
                <div class="tool" @click="tool_obroty_zlec();" >Test Obroty Zlec</div>
            </div>
            <div class="toolgroup grow"></div>
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
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding: 2px;
    height: 28px;
    background-color: #d8d8d8;
}
.toolgroup {
    display: flex;
    flex-direction: row;
}
.tool{
    border: 2px solid black;
    display: flex;
    align-items: center;
    padding: 0ch 1ch;
    cursor: pointer;
    transition: 0.2s;
    user-select: none;
}
.tool:hover {
    background-color: #fff;
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

