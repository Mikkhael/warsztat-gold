<script setup>
//@ts-check

import { Dataset } from '../components/Dataset/Dataset';
import {FormInput, FormEnum} from '../components/Controls';

import useMainFWManager from '../components/FloatingWindows/FWManager';
import useMainMsgManager from '../components/Msg/MsgManager';

import QueryFormScrollerDataset from '../components/QueryFormScrollerDataset.vue';
import QueryViewer from '../components/QueryViewer/QueryViewer.vue';

import {onMounted, ref} from 'vue';


const props = defineProps({
    parent_window: {
        /**@type {import('vue').PropType<import('../components/FloatingWindows/FWManager').FWWindow>} */
        type: Object,
        required: false
    }
});

const fwManager  = useMainFWManager();
const msgManager = useMainMsgManager();



// ID	kalkulacja	marka	model	nr rej	ID klienta	nr silnika	nr nadwozia
const car_form = ref();
const car_scroller = ref();

const car_dataset = new Dataset();
const index   = car_dataset.get_index_ref();
car_dataset.assosiate_form(car_form);

const car_src  = car_dataset.create_source_query();
const car_sync = car_dataset.create_table_sync('samochody klientów');

const car_id       = car_dataset.create_value_raw   ("ID",            null, car_src);
const car_marka    = car_dataset.create_value_synced("marka",         null, car_src, car_sync);
const car_model    = car_dataset.create_value_synced("model",         null, car_src, car_sync);
const car_nrrej    = car_dataset.create_value_synced("nr rej",        null, car_src, car_sync);
const car_klient   = car_dataset.create_value_synced("ID klienta",    null, car_src, car_sync);
const car_sinlink  = car_dataset.create_value_synced("nr silnika",    null, car_src, car_sync);
const car_nadwozie = car_dataset.create_value_synced("nr nadwozia",   null, car_src, car_sync);

car_sync.add_primary('ID', car_id);

car_src.set_body_query_and_finalize(['FROM `samochody klientów` WHERE `ID` = ', index]);

const car_scroller_query_name  = 'rowid';
const car_scroller_query_from  = '`samochody klientów`';
const car_scroller_query_where = '';


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

function handle_find(columns, row) {
    fwManager.close_window("Test - Znajdź");
    car_scroller.value.goto(row[0]);
    // rowid.value = row[0];
}

function on_click_find() {
    fwManager.open_or_reopen_window("Test - Znajdź", QueryViewer, {
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
        selectable: true,
    }, {
        select: handle_find
    });
}

</script>


<template>

    <div>

        <input type="button" value="ZNAJDŹ" @click="on_click_find">  <br>
        <form ref="form_elem" class="form">
            <label class="label">Marka      </label>   <FormInput type="text" :value="car_marka"    nonull/>
            <label class="label">Model      </label>   <FormInput type="text" :value="car_model"    nonull/>
            <label class="label">Nr Rej.    </label>   <FormInput type="text" :value="car_nrrej"    nonull/>
            <label class="label">Nr Silnika </label>   <FormInput type="text" :value="car_sinlink"  nonull/>
            <label class="label">Nr Nadwozia</label>   <FormInput type="text" :value="car_nadwozie" nonull/>
        </form>
                
        <br>
        <br>
        
        <QueryFormScrollerDataset
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

    .fixed_bottom {
        overflow-x: auto;
        position: fixed;
        bottom: 0px;
        left: 0px;
        right: 0px;
    }

    .form {
        display: grid;
        grid: auto / auto auto;
        gap: 5px 10px;
        justify-items: start;
        justify-content: start;
    }
    .form > * {
        border-bottom: solid 2px black;
    }

</style>

<style>


</style>