<script setup>
//@ts-check

import { unref } from 'vue';
import useMainFWManager from '../FloatingWindows/FWManager';
import QueryViewer from './QueryViewer.vue';

const props = defineProps({
    query_select_fields: {
        /**@type {import('vue').PropType<string | [string, string | undefined][]>} */
        type: Array,
        required: true
    },
    query_from: {
        type: String,
        required: true
    },
    query_where: {
        type: String,
        default: ""
    },
    noselect: {
        type: Boolean,
        default: false
    },

    fwManager: {
        type: Object,
        required: false    
    },
    scroller: {
        type: Object,
        required: false
    },
    simple: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(["select"]);

const fwManager = props.fwManager ?? useMainFWManager();


function on_click_find() {
    fwManager.open_or_reopen_window("Znajdź", QueryViewer, {
        query_select_fields: props.query_select_fields,
        query_from: props.query_from,
        query_where: props.query_where,
        selectable: !props.noselect,
    }, {
        select: async (columns, row, offset) => {
            fwManager.close_window("Znajdź");
            // console.log('SCROLLER', props.scroller);
            if(props.scroller) {
                if(props.simple){
                    await props.scroller.goto_complete(offset);
                } else {
                    await props.scroller.goto_complete(row[0]);
                }
            }
            emit('select', columns, row, offset);
        }
    });
}

</script>

<template>

<img class="button" src="./../../assets/icons/search.svg" @click="on_click_find"/>

</template>

<style scoped>

    img{
        box-sizing: border-box;
        height: 3ch;
        padding: 2px;
    }


</style>