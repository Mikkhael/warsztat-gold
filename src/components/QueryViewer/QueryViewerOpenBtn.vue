<script setup>
//@ts-check

import { unref } from 'vue';
import useMainFWManager from '../FloatingWindows/FWManager';
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

    noselect: {
        type: Boolean,
        default: false
    },
    fwManager: {
        type: Object,
        required: false    
    },
    src: {
        type: QuerySource,
        required: false
    },
    rownumber_col_index: {
        type: Number,
        default: 0
    }
});

const emit = defineEmits(["select", "error"]);

const fwManager = props.fwManager ?? useMainFWManager();

function on_error(err) {
	console.error(err);
	emit('error', err);
}

// TODO identify window by more than just the title, to avoid colisions
function on_click_find() {
    fwManager.open_or_reopen_window("Znajdź", QueryViewer, {
        /**@type {import('./QueryViewer.vue').QueryViwerQueryParams} */
        query: {
            select: props.query.select,
            from:   props.query.from,
            where_conj:     props.query.where_conj ?? [],
            where_conj_opt: props.query.where_conj_opt ?? []
        },
        selectable: !props.noselect,
        src_to_change: props.src
    }, {
        /**
         * @param {string[]} columns
         * @param {(string | number | null)[]} row
         * @param {number} offset
         */
        select: async (columns, row, offset) => {
            try{
                fwManager.close_window("Znajdź");
                if(props.src) {
                    props.src.request_offset_rownum(Number(row[props.rownumber_col_index]));
                    await props.src.update_complete();
                }
                emit('select', columns, row, offset);
            } catch (err) {
                on_error(err);
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