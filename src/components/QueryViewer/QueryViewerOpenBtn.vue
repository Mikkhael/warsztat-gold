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
        select: (columns, row) => {
            fwManager.close_window("Znajdź");
            emit('select', columns, row);
            if(props.scroller) {
                props.scroller.goto(row[0]);
            }
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