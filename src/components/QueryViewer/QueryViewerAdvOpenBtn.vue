<script setup>
//@ts-check

import { computed, toRef } from 'vue';
import useMainFWManager, { FWManager, FWWindow } from '../FloatingWindows/FWManager';
import QueryViewerAdv from './QueryViewerAdv.vue';
import { QueryViewerSource } from './QueryViewer';
import { FormDataSetFull_LocalRow } from '../Dataset';
import IconButton from '../Controls/IconButton.vue';


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

    parent_window: {
        /**@type {import('vue').PropType<FWWindow>} */
        //@ts-ignore
        type: Object,
        required: false
    },


    text: {
        type: String,
        default: ""
    },
    title: {
        type: String,
        required: false
    },
    name: {
        type: String,
        required: false
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
const title = props.title ?? (props.text || "Znajdź");

function on_error(err) {
	console.error(err);
	emit('error', err);
}

// TODO identify window by more than just the title, to avoid colisions
function close_self () {
    fwManager.close_window(title);
}

async function on_click() {
    const prevented = await fwManager.close_window(title);
    if(prevented) {
        return null;
    }
    const src = props.src_factory();
    return fwManager.open_or_reopen_window(title, QueryViewerAdv, {
        props: {
            src,
            selectable: props.selectable,
            insertable: props.insertable,
            saveable:   props.saveable,
            deletable:  props.deletable,
            name: props.name ?? title,
        },
        listeners: {
            /**
             * @param {string[]} columns 
             * @param {FormDataSetFull_LocalRow} row 
             * @param {number} offset
             */
            select: async (columns, row, offset) => {
                emit('select', columns, row, offset, close_self);
            },
            error: on_error,
        },
        parent: props.parent_window
    });
}

</script>

<template>

<IconButton
    @click="on_click"
    :text="props.text"
/>

</template>

<style scoped>

</style>