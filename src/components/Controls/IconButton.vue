<script setup>
//@ts-check

import { computed } from 'vue';

const props = defineProps({
    text: {
        type: String,
        default: ""
    },
    icon: {
        type: String,
        default: 'search',
    },
    noicon: Boolean
});


const icon_src = computed(() => `/assets/icons/${props.icon}.svg`);

const emit = defineEmits({
    click: (/**@type {MouseEvent} */ event) => true,
});


</script>

<template>

<div class="button" @click="e => emit('click', e)">
    <img v-if="!props.noicon" :src="icon_src"/>
    <div class="text">
        {{ props.text }}
    </div>
</div>

</template>

<style scoped>
    .button {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 0.2ch 1ch;
    }
    img{
        box-sizing: border-box;
        height: 3ch;
        padding: 0.2ch;
    }
    .text {
        flex-grow: 1;
        justify-self: flex-end;
        text-wrap: nowrap;
        text-align: center;
    }
</style>