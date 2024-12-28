<script setup>
//@ts-check
import { computed, nextTick, onMounted, ref, shallowRef } from 'vue';
import { useMainMsgManager, MsgManager } from '../Msg/MsgManager';

import { QueryViewerSource } from '../QueryViewer/QueryViewer';
import QueryViewerAdv from '../QueryViewer/QueryViewerAdv.vue';

import useWarsztatDatabase from '../../DBStructure/db_warsztat_structure';

import { useMainClosePreventionManager } from '../../ClosePrevention';
import { TableNode } from '../Dataset';

const props = defineProps({
    parent_window: {
        /**@type {import('vue').PropType<import('../FloatingWindows/FWManager').FWWindow>} */
        type: Object,
        required: false
    },
    msgManager: {
        type: MsgManager
    },
});

const emit = defineEmits(['error']);

function handle_error(err) {
    console.error(err);
    emit('error', err);
}


const msgManager = props.msgManager ?? useMainMsgManager();
const mainClosePreventionManager = useMainClosePreventionManager();

const db = useWarsztatDatabase();
const all_tables = Object.values(db.TABS).map(tab => tab.name);

const main_tables = [
    "klienci",
    "samochody klientów",
    "zlecenia naprawy",
    "nazwy części",
    "obroty magazynowe",
    "zlecenia czynności",
    "czynność",
];
const non_main_tables = all_tables.filter(name => main_tables.indexOf(name) === -1);

const sorted_tables = [
    ...main_tables,
    '•••',
    ...non_main_tables
];


const selected_table     = shallowRef(/**@type {TableNode?} */(null));
const selected_table_src = shallowRef(/**@type {QueryViewerSource?} */(null));
const changed = computed(() => selected_table_src.value?.changed.value ?? false);

/**
 * @param {TableNode} tab 
 */
function generate_table_src(tab) {
    const src = new QueryViewerSource(false);
    src.set_from_with_deps(tab);
    for(const col of Object.values(tab.cols)) {
        src.auto_add_column_synced(col, {display: col.name, readonly: false});
    }
    return src;
}



async function select_table_name(name) {
    if(selected_table_src.value !== null) {
        const confirmed = await selected_table_src.value.assure_unchanged_or_confirm();
        if(!confirmed) {
            return false;
        }
    }
    selected_table.value     = null;
    selected_table_src.value = null;
    await nextTick();
    const tab = Object.values(db.TABS).find(x => x.name === name);
    console.log("VIEWING", name, tab);
    if(!tab) {
        return false;
    }
    selected_table.value     = tab;
    selected_table_src.value = generate_table_src(tab);
    return true;
}

mainClosePreventionManager.start_in_component(changed, props.parent_window);

// console.log(reactive_categories);


</script>


<template>

    <div class="container">
        <div class="categories">
            <div v-for="table_name in sorted_tables"
             :key="table_name"
             class="category_button" 
             :class="{selected: selected_table?.name === table_name}"
             @click="select_table_name(table_name)"
            >
                {{ table_name }}
            </div>
        </div>
        <div class="table_viewer">
            <QueryViewerAdv
                v-if="selected_table_src !== null"
                :src="selected_table_src ?? undefined"
                saveable
                insertable
                deletable
            />
        </div>
    </div>

</template>

<style scoped>

    .container {
        display: grid;
        width:  100%;
        height: 100%;

        grid: 1fr auto / auto 1fr 1fr;
    }

    .categories {
        display: flex;
        flex-direction: column;
        border-right: 2px black double;
        grid-row: 1 / -1;
        min-height: 0px;
        overflow-y: auto;
        scrollbar-width: thin;
    }
    .category_button {
        border-bottom: 1px black dashed;
        text-align: center;
        padding: 3px;
        user-select: none;
        cursor: pointer;
    }
    .category_button:hover {
        background-color: #d4f7f4;
    }
    .category_button.selected {
        background-color: #b6fcf6;
    }

    .table_viewer {
        padding: 4px;
        min-height: 0px;
        overflow-y: auto;
        scrollbar-width: thin;
        grid-column: 2 / -1;
    }

</style>