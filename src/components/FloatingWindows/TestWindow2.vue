<script setup>
//@ts-check

import {watch, toRef, onMounted} from 'vue'

const props = defineProps({
    text: {
        type: String,
        default: ""
    },
    aha: {
        type: Array,
        default: [0]
    },
    parent_window: {
        /**@type {import('vue').PropType<import('./FWManager').FWWindow>} */
        type: Object,
        required: false
    }
});

function update_aha(event) {
    props.aha[0] = +event.target.value;
}

function minimize_self() {
    props.parent_window?.box.minimize();
}

function close_self(force = false) {
    props.parent_window?.box.close(force);
}

onMounted(() => {
    props.parent_window?.add_before_close(async (force) => {
        if(force) return false;
        const confirmed = await window.confirm('Czy na pewno chcesz zamknąć okno?');
        return !confirmed;
    })
});

</script>


<template>

    <h1>TEST WINDOW (TYPE II)</h1>
    <p>{{ props.text }}</p>
    <p>ZINDEX: <input type="number" step="1" :value="aha[0]" @change="update_aha($event)"></p>

    <button @click="minimize_self()">MINIMIZE</button>
    <button @click="close_self(false)">CLOSE</button>
    <button @click="close_self(true)">CLOSE FORCE</button>

</template>

<style scoped>

    h1{
        color: red;
    }

</style>