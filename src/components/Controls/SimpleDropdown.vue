<script setup>
//@ts-check

import { ref } from 'vue';

const props = defineProps({
    options: {
        /**@type {import('vue').PropType<([value: any, display: string][])>} */
        type: Array,
        reguired: true
    }
});
const emit = defineEmits({
    selected(option_value) {return true;}
});

const is_collapsed = ref(true);

function toggle_collapsed(/**@type {boolean | undefined} */ new_collapsed) {
    if(new_collapsed === undefined){
        is_collapsed.value = !is_collapsed.value;
    } else {
        is_collapsed.value= new_collapsed;
    }
}

function handle_select(option, index) {
    toggle_collapsed(true);
    emit('selected', option[0]);
}

</script>

<template>
    
    <div class="dropdown_root" :class="{collapsed: is_collapsed}">
        <input class="dropdotn_btn" type="button" :value="is_collapsed ? '▼' : '▲'" @click="toggle_collapsed()">
        <div class="dropdown_list">
            <div v-for="(option, idx) in props.options" @click="handle_select(option, idx)">
                {{ option[1] }}
            </div>
        </div>
    </div>

</template>

<style scoped>
    .dropdown_root {
        position: relative;
    }
    .dropdotn_btn {
        padding: 0px;
    }
    .dropdown_list {
        position: absolute;
        display: flex;
        flex-direction: column;
        top:100%;
        background-color: white;
        border: 1px solid black;
        z-index: 10;
    }
    .dropdown_list > * {
        padding: 2px;
        cursor: pointer;
        border-bottom: 1px dashed black;
        user-select: none;
    }
    .dropdown_list > *:hover {
        background-color: #dfdfdf;
    }
    
    .dropdown_root.collapsed > .dropdown_list{
        display: none;
    }

</style>