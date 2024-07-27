<script setup>
//@ts-check

import { reactive, computed, ref, watch } from "vue";
import ipc from "../../ipc";
import { escape_backtick } from "../../utils";
// import { invoke } from "@tauri-apps/api/tauri";
import QueryFormScrollerSimple from "../QueryFormScrollerSimple.vue";
import QueryOrderingBtn from "./QueryOrderingBtn.vue";


const props = defineProps({
    query_select: {
        type: String,
        required: true
    },
    query_from: {
        type: String,
        required: true
    },
    limit: {
        type: Number,
        required: true
    },
    step:  {
        type: Number,
        default: 1
    }
});



const offset = ref(0n);
const orderings = reactive(/**@type {number[]}*/ ([]));

const orderings_list = reactive(new Map());
function set_orderings_list(column_index, ordering_value) {
    // console.log('set', arguments);
    if(ordering_value === undefined) {
        orderings_list.delete(column_index);
        return;
    }
    if(orderings_list.has(column_index)) {
        orderings_list.delete(column_index);
    }
    if(ordering_value != 0){
        orderings_list.set(column_index, ordering_value);
    }
}
// watch(orderings, (new_value, old_value) => {
//     console.log(new_value);
//     for(let i = 0; i < Math.max(new_value.length, old_value.length); i++) {
//         const o = old_value[i];
//         const n = new_value[i];
//         console.log(i, o, n);
//         if(o === n) continue;
//         set_orderings_list(i, n);
//     }
// });


const query_result   = ref( /**@type {import('../../ipc').IPCQueryResult?} */ (null));
const query_columns = computed(() => {
    if(query_result.value === null) {
        return [];
    }
    return query_result.value[1];
});
watch( query_columns, (new_value, old_value) => {
    if(new_value.length !== old_value.length)
        orderings_list.clear();
});
const query_rows = computed(() => {
    if(query_result.value === null) {
        return [];
    }
    return query_result.value[0];
});

const orderings_sql = ref('');
watch( [orderings_list, query_columns], ([new_orderings_list, new_query_columns]) => {
    const res = Array.from(new_orderings_list.entries())
                // .reverse()
                .map(([col_i, ordering]) => 
                    escape_backtick(new_query_columns[col_i]) +
                    (ordering > 0 ? " ASC" : " DESC"))
                .join(', ');
    // console.log('debug_list', res);
    orderings_sql.value = res;
});
const query_sql_full = computed(() => {
    const orderby_sql = orderings_sql.value ? " ORDER BY " + orderings_sql.value : "";
    // console.log('orderby', orderby_sql, orderings_sql.value);
    return 'SELECT ' + props.query_select + ' FROM ' + props.query_from + orderby_sql + ' LIMIT ' + props.limit + ' OFFSET ' + (offset.value - 1n);
});
async function refresh() {
    const result = await ipc.db_query(query_sql_full.value);
    query_result.value = result;
    return result;
}

function handle_err(err){
    console.error(err);
}

async function refresh_routine() {return refresh().catch(handle_err);}

watch(query_sql_full, refresh_routine);

</script>

<template>

    <QueryFormScrollerSimple v-model:index="offset" :query="props.query_from" :step="props.step" :limit="props.limit"/>
    <div class="container">
        <table class="result">
            <tr>
                <th>#</th>
                <th v-for="(col_name, col_i) in query_columns">
                    <span class="col_name">
                        {{ col_name }}
                    </span>
                    <QueryOrderingBtn class="ordering_btns" v-model:value="orderings[col_i]" @update:value="event => set_orderings_list(col_i, event)"/>
                </th>
            </tr>
            <tr v-for="(row, row_i) in query_rows">
                <td class="cell_index" >{{ offset + BigInt(row_i) }}:</td>
                <td v-for="cell in row" :class="{cell_number: typeof(cell) == 'number', cell_text: typeof(cell) == 'string'}">{{cell === null ? '~' : cell}}</td>
            </tr>
        </table>
    </div>

</template>

<style scoped>

    .container {
        /* width: 100%; */
        overflow-x: scroll;
    }
    .ordering_btns {
        margin-left: 1ch;
    }

    table{
        border-collapse: collapse;
    }

    td, th{
        /* padding: 2px 5px; */
        padding: 2px 5px;
        text-wrap: nowrap;
        border: 1px solid black;
    }

    .cell_index {
        color: green;
    }
    .cell_number {
        color: darkblue;
    }
    .cell_text {
        font-style: italic;
    }

</style>