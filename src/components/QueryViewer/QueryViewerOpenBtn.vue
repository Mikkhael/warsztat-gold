<script setup>
//@ts-check

import { unref } from 'vue';
import {useMainFWManager, FWManager} from '../FloatingWindows/FWManager';
import QueryViewer from './QueryViewer.vue';
import { query_ordering_to_string, QuerySource } from '../Dataset';
import useMainMsgManager from '../Msg/MsgManager';


/**
 * @typedef {import('../Dataset/QueryBuilder').QuerySelectField} QuerySelectField
 * @typedef {import('../Dataset/QueryBuilder').QueryParts} QueryParts
 * @typedef {import('../Dataset/QueryBuilder').QueryOrdering} QueryOrdering
 */

 /**
  * @typedef { [QuerySelectField] | [QuerySelectField, string] } QuerySelectFieldWithDisplay
  */

 /**
  * @typedef {{
  *     select:          QuerySelectFieldWithDisplay[],
  *     from:            string,
  *     where_conj?:     QueryParts[],
  *     where_conj_opt?: QueryParts[],
  * }} QueryViwerQueryParams
  */

const props = defineProps({
    query: {
        /**@type {import('vue').PropType<QueryViwerQueryParams>} */
        type: Object,
        required: true
    },
    
    text: {
        type: String,
        default: ""
    },
    noselect: {
        type: Boolean,
        default: false
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
     * @param {any[]} row 
     * @param {number} offset 
     * @param {() => void} close 
     */
    select: (columns, row, offset, close) => true,
    error:  (any) => true
})

const fwManager = props.fwManager ?? useMainFWManager();

function on_error(err) {
	console.error(err);
	emit('error', err);
}
function close_self () {
    fwManager.close_window("Znajdź");
}

function on_click_find() {
    fwManager.open_or_reopen_window("Znajdź", QueryViewer, {
        props: {
            /**@type {import('./QueryViewer.vue').QueryViwerQueryParams} */
            query: {
                select: props.query.select,
                from:   props.query.from,
                where_conj:     props.query.where_conj ?? [],
                where_conj_opt: props.query.where_conj_opt ?? []
            },
            selectable: !props.noselect
        },
        listeners: {
            /**
             * @param {string[]} columns
             * @param {(string | number | null)[]} row
             * @param {number} offset
             */
            select: async (columns, row, offset) => {
                emit('select', columns, row, offset, close_self);
            }
        }
    });
}

</script>

<template>

<div class="button container" @click="on_click_find">
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