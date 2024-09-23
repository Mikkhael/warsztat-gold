<script setup>
//@ts-check

import { Dataset, DVUtil } from '../components/Dataset/Dataset';
import {FormInput, FormEnum} from '../components/Controls';

import useMainMsgManager from '../components/Msg/MsgManager';

import QueryViewerOpenBtn from '../components/QueryViewer/QueryViewerOpenBtn.vue';
import QueryFormScrollerDataset from '../components/QueryFormScrollerDataset.vue';

import {computed, onMounted, reactive, ref, toRef, watch} from 'vue';


const props = defineProps({
    parent_window: {
        /**@type {import('vue').PropType<import('../components/FloatingWindows/FWManager').FWWindow>} */
        type: Object,
        required: false
    },
    parent_dataset: {
        /**@type {import('vue').PropType<import('../components/Dataset/Dataset').Dataset>} */
        type: Object,
        required: false
    },
    id_klienta: {
        type: Number,
        default: null,
        required: false   
    }
});

const msgManager = useMainMsgManager();



// ID	kalkulacja	marka	model	nr rej	ID klienta	nr silnika	nr nadwozia
const car_form = ref();
const car_scroller = ref();

/**@type {import('vue').Ref<Number?>*/
const prop_id_klienta = toRef(props, 'id_klienta');

console.log('prop_id_klienta', prop_id_klienta);

const car_dataset = props.parent_dataset?.create_sub_dataset() ?? new Dataset();
const offset = car_dataset.get_offset_ref();
car_dataset.assosiate_form(car_form);

const car_src  = car_dataset.create_source_query();
const car_sync = car_dataset.create_table_sync('samochody klientów');

const car_id       = car_dataset.create_value_raw   ("ID",            null,            car_src);
const car_marka    = car_dataset.create_value_synced("marka",         null,            car_src, car_sync);
const car_model    = car_dataset.create_value_synced("model",         null,            car_src, car_sync);
const car_nrrej    = car_dataset.create_value_synced("nr rej",        null,            car_src, car_sync);
const car_klient   = car_dataset.create_value_raw   ("ID klienta",    prop_id_klienta, car_src, car_sync);
const car_sinlink  = car_dataset.create_value_synced("nr silnika",    null,            car_src, car_sync);
const car_nadwozie = car_dataset.create_value_synced("nr nadwozia",   null,            car_src, car_sync);

// TODO allow for form to work without providing prop_id_klienta
car_sync.add_primary('ID', car_id);
car_src.set_body_query_and_finalize(['FROM `samochody klientów` WHERE `ID klienta` = ', prop_id_klienta , ' LIMIT 1 OFFSET ', offset]);
// car_src.set_body_query_and_finalize(['FROM `samochody klientów` WHERE `ID` = ', index]);

const car_scroller_query_name  = 'rowid';
const car_scroller_query_from  = '`samochody klientów`';
const car_scroller_query_where = computed(() => {
    return props.id_klienta === null ? '' :
        DVUtil.sql_parts(['`ID klienta` = ', prop_id_klienta]);
});

// console.log('PROPS', props);
// console.log('WHERE', car_scroller_query_where);
// watch(car_scroller_query_where, (new_where) => {
//     console.log("new where: ", new_where);
// })


onMounted(() => {
    props.parent_window?.add_before_close(async (force) => {
        if(force) return false;
        if(car_dataset.is_changed()){
            const confirmed = await window.confirm('Posiadasz niezapisane zmiany. Czy chesz zamnknąć okno?');
            return !confirmed;
        }
        return false;
    });
});


function handle_err(/**@type {Error} */ err) {
    msgManager.postError(err);
}


// FIND

const find_options = reactive({
    query_select_fields: [
        ["`ID`"],
        ["`marka`",       "Marka"],
        ["`model`",       "Model"],
        ["`nr rej`",      "Nr Rej."],
        // ["ID klienta",  "ID klienta"],
        ["`nr silnika`",  "Nr Silnika"],
        ["`nr nadwozia`", "Nr Nadwozia"],
    ],
    query_from: "`samochody klientów`",
    query_where: car_scroller_query_where
});

defineExpose({
    dataset: car_dataset
});

</script>


<template>

    <div>

        <form ref="car_form" class="form" :class="{disabled: car_dataset.disabled.value}">
            <div>
                <label class="label">Marka      </label>   <FormInput :value="car_marka"    nonull :len="15"/>
                <label class="label">Model      </label>   <FormInput :value="car_model"    nonull :len="15"/>
                <label class="label">Nr Rej.    </label>   <FormInput :value="car_nrrej"    nonull :len="15"/>
                <label class="label">Nr Silnika </label>   <FormInput :value="car_sinlink"  nonull :len="20"/>
                <label class="label">Nr Nadwozia</label>   <FormInput :value="car_nadwozie" nonull :len="25"/>
            </div>
            <QueryViewerOpenBtn v-bind="find_options" :scroller="car_scroller" simple/>
        </form>
        <QueryFormScrollerDataset simple
        :query_value_name="car_scroller_query_name"
        :query_from="car_scroller_query_from"
        :query_where="car_scroller_query_where"
        :datasets="[car_dataset]"
        @error="handle_err"
        insertable
        ref="car_scroller"/> 
        
    </div>

</template>

<style scoped>

    .form {
        display: flex;
        flex-direction: row;
        justify-content: space-evenly;
        align-items: center;
    }

    .form > *:nth-child(1) {
        justify-self: start;
        display: grid;
        grid: auto / auto auto;
        gap: 1px 2px;
        justify-items: start;
        justify-content: start;
    }

</style>

<style>


</style>