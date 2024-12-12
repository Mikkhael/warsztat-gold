<script setup>
//@ts-check

import { toRef } from 'vue';
import useMainFWManager, { FWManager } from '../FloatingWindows/FWManager';
import QueryViewerAdv from './QueryViewerAdv.vue';
import { QueryViewerSource } from './QueryViewer';
import { FormDataSetFull_LocalRow } from '../Dataset';


/**
 * @typedef {import('../Dataset/QueryBuilder').QuerySelectField} QuerySelectField
 * @typedef {import('../Dataset/QueryBuilder').QueryParts} QueryParts
 * @typedef {import('../Dataset/QueryBuilder').QueryOrdering} QueryOrdering
 */


const props = defineProps({
    src_factory: {
        /**@type {import('vue').PropType<() => QueryViewerSource>} */
        //@ts-ignore
        type: Function,
        required: true
    },
    selectable: Boolean,
    insertable: Boolean,
    saveable:   Boolean,
    deletable:  Boolean,

    text: {
        type: String,
        default: ""
    },
    title: {
        type: String,
        default: "Znajdź"
    },
    fwManager: {
        /**@type {import('vue').PropType<FWManager>} */
        type: Object,
        required: false    
    },
});

// const emit = defineEmits(["select", "error"]);
const emit = defineEmits({
    /**
     * @param {string[]} columns 
     * @param {FormDataSetFull_LocalRow} row 
     * @param {number} offset
     * @param {() => void} close 
     */
    select: (columns, row, offset, close) => true,
    error:  (any) => true
})

const fwManager = props.fwManager ?? useMainFWManager();
const title = props.title;

function on_error(err) {
	console.error(err);
	emit('error', err);
}

// TODO identify window by more than just the title, to avoid colisions
function close_self () {
    fwManager.close_window(title);
}

async function on_click() {
    const prevented = await fwManager.close_window(props.title);
    if(prevented) {
        return null;
    }
    const src = props.src_factory();
    return fwManager.open_or_reopen_window(props.title, QueryViewerAdv, {
        src,
        selectable: props.selectable,
        insertable: props.insertable,
        saveable:   props.saveable,
        deletable:  props.deletable,
    }, {
        /**
         * @param {string[]} columns 
         * @param {FormDataSetFull_LocalRow} row 
         * @param {number} offset
         */
        select: async (columns, row, offset) => {
            emit('select', columns, row, offset, close_self);
        },
        error: on_error,
    });
}

</script>

<template>

<div class="button container" @click="on_click">
    <img src="./../../assets/icons/search.svg"/>
    <div class="text">
        {{ props.text }}
    </div>
</div>

</template>

<style scoped>

    .container {
        display: flex;
        flex-direction: row;
        align-items: center;
    }

    img{
        box-sizing: border-box;
        height: 3ch;
        padding: 2px;
    }

    .text {
        flex-grow: 1;
        justify-self: flex-end;
        text-wrap: nowrap;
        text-align: center;
    }


</style>