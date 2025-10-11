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
    inline: Boolean,
    notext: Boolean,
    noicon: Boolean
});


const icon_src = computed(() => `/assets/icons/${props.icon}.svg`);

const emit = defineEmits({
    click: (/**@type {MouseEvent} */ event) => true,
});


</script>

<template>

<div class="button" :class="{inline:props.inline}" @click="e => emit('click', e)">
    <img v-if="!props.noicon" :src="icon_src"/>
    <div v-if="!props.notext" class="text">
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
        width:  3ch;
        padding: 0.2ch;
    }
    .text {
        flex-grow: 1;
        justify-self: flex-end;
        text-wrap: nowrap;
        text-align: center;
    }
    .inline.button {
        display: inline-flex;
        padding: 0;
        margin: 0px;
    }
    .inline.button > img {
        height: 2ch;
        width:  2ch;
        margin: 0px;
    }
</style>