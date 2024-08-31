<script setup>
import { onMounted, readonly, ref } from "vue";
import ipc from "../ipc";
import FWCollection from "./FloatingWindows/FWCollection.vue";
import useMainFWManager from "./FloatingWindows/FWManager";
import useMainMsgManager from "./Msg/MsgManager";


import TestWindow1 from "./FloatingWindows/TestWindow1.vue"
import TestWindow2 from "./FloatingWindows/TestWindow2.vue"

import SamochodyKlientow from "../Forms/SamochodyKlientow.vue";

import SQLDebugConsole from "./SqlDebug/SqlDebugConsole.vue";


const fwManager  = useMainFWManager();
const msgManager = useMainMsgManager();

fwManager.set_viewport({top: '24px'});

function handle_error(msg) {
    msgManager.postError(msg);
}

//////////// TOOLBAR HANDLERS

function tool_open() {
    return ipc.db_open().then(path => {
        if(path === null) return;
        set_last_state_info(`Otworzono bazę "${path}"`);
    }).catch(handle_error);
}
function tool_sql() {
    fwManager.open_or_focus_window("SQL Debug", SQLDebugConsole);
}

function tool_zlecenia(){
    fwManager.open_or_focus_window("Zlecenia Otwarte", TestWindow1, {text: "sjifosfg", index: Math.round(Math.random()*10)});
}

function tool_klienci(){
    fwManager.open_or_focus_window("Klienci (temp samochody)", SamochodyKlientow);
}

</script>

<template>
  
    <section class="container">

        <section class="toolbar">
            <div class="toolgroup">
                <div class="tool" @click="tool_open();">Otwórz</div>
                <div class="tool" @click="tool_sql();" >SQL</div>
            </div>
            <div class="toolgroup"></div>
            <div class="toolgroup">
                <div class="tool" @click="tool_zlecenia();">Zlecenia</div>
                <div class="tool" @click="tool_klienci();" >Klienci</div>
            </div>
            <div class="toolgroup"></div>
        </section>
        <main class="main">
            <FWCollection :manager="fwManager" />
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
    padding: 2px;
    height: 24px;
    background-color: #d8d8d8;
    display: flex;
}

.toolgroup {
    display: flex;
    flex-grow: 1;
}
.tool{
    outline: 1px solid black;
    padding: 0px 5%;
    cursor: pointer;
    user-select: none;
    transition: 0.2s;
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

