<script setup>
//@ts-check

import {toRef, watch} from "vue"

const props = defineProps({
    type: String,     // info, succ, warn, error, critical
    content: String
});

const emit = defineEmits(['click', 'close'])

function perform_click() {
    emit('click');
}

function perform_close() {
    emit('close');
}

</script>

<template>

    <div class="CornerMsg" :class="props.type">
        <span class="content" @click="perform_click">
            {{ props.content }}
        </span>
        <img class="close_btn" src="/assets/icons/close.svg" @click="perform_close">
    </div>

</template>

<style scoped>


.CornerMsg {
    border-radius: 10px;
    padding: 10px;
    display: inline-flex;
    max-width: fit-content;
    flex-wrap: nowrap;
    flex-direction: row;
    color: white;
    justify-content: flex-end;
    text-align: justify;
    transition: 1s;
}

.CornerMsg .content {
    cursor: pointer;
    align-self: center;
}

.CornerMsg.info     { background-color: #008cff; }
.CornerMsg.succ     { background-color: #2fa500; }
.CornerMsg.warn     { background-color: #ffae00; }
.CornerMsg.error    { background-color: #ff0400; }
.CornerMsg.critical { background-color: #a80303; }

.CornerMsg .close_btn {
    user-select: none;
    cursor: pointer;
    height: 1em;
    margin-left: 4px;
    align-self: self-start;
}


</style>