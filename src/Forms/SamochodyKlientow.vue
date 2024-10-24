<script setup>
//@ts-check

// import { Dataset, DVUtil, QueryBuilder } from '../components/Dataset/Dataset';
import {FormInput, FormEnum} from '../components/Controls';

import useMainMsgManager from '../components/Msg/MsgManager';

import QueryViewerOpenBtn from '../components/QueryViewer/QueryViewerOpenBtn.vue';
// import QueryFormScrollerDataset from '../components/QueryFormScrollerDataset.vue';

import {onUnmounted, onMounted, } from 'vue';
import { init_form_parent_window, standart_form_value_routine } from './FormCommon';
import { FormParamProp, param_from_prop } from '../components/Dataset';
import { FormQuerySource } from '../components/Dataset';
import useWarsztatDatabase from '../DBStructure/db_warsztat_structure';
import QuerySourceOffsetScroller from '../components/Scroller/QuerySourceOffsetScroller.vue';


const props = defineProps({
    parent_window: {
        /**@type {import('vue').PropType<import('../components/FloatingWindows/FWManager').FWWindow>} */
        type: Object,
        required: false
    },
    use_src: {
        /**@type {import('vue').PropType<FormQuerySource>} */
        type: Object,
        required: false
    },
    id_klienta: FormParamProp
});


const msgManager = useMainMsgManager();
const db = useWarsztatDatabase();


// ID	kalkulacja	marka	model	nr rej	ID klienta	nr silnika	nr nadwozia

const param_id_klienta = param_from_prop(props, 'id_klienta');
console.log('param_id_klienta', param_id_klienta);



const src  = props.use_src ?? new FormQuerySource();
const sync = src.dataset.get_or_create_sync(db.TABS.samochody);

src.add_table_dep(db.TABS.samochody);
src.add_from('`samochody klientów`');

const car_id       = standart_form_value_routine(src, "ID",           {primary: true}                   );
const car_marka    = standart_form_value_routine(src, "marka",        {sync}                            );
const car_model    = standart_form_value_routine(src, "model",        {sync}                            );
const car_nrrej    = standart_form_value_routine(src, "nr rej",       {sync}                            );
const car_klient   = standart_form_value_routine(src, "ID klienta",   {sync, param: param_id_klienta}   );
const car_sinlink  = standart_form_value_routine(src, "nr silnika",   {sync}                            );
const car_nadwozie = standart_form_value_routine(src, "nr nadwozia",  {sync}                            );

// TODO automate

const db_opened_listener = () => {
	src.request_refresh();
    src.update_complete();
}

onMounted(() => {
    init_form_parent_window([src.dataset], props);
    window.addEventListener   ('db_opened', db_opened_listener);
    src.update_complete();
});
onUnmounted(() => {
    // TODO add auto disconnect for instanciated QuerySources
    src.disconnect();
    window.removeEventListener('db_opened', db_opened_listener); 
})

function handle_err(/**@type {Error} */ err) {
    msgManager.postError(err);
}


// FIND

// const find_options = readonly({
//     query_select_fields: [
//         ["`ID`"],
//         ["`marka`",       "Marka"],
//         ["`model`",       "Model"],
//         ["`nr rej`",      "Nr Rej."],
//         ["`nr silnika`",  "Nr Silnika"],
//         ["`nr nadwozia`", "Nr Nadwozia"],
//     ],
//     // query_from: "`samochody klientów`",
//     // query_where: car_scroller_query_where
// });

defineExpose({
    src,
});

</script>


<template>

    <div class="form_container" :class="src.form_style.value">

        <form ref="car_form" class="form_content form">
            <div>
                <label class="label">Marka      </label>   <FormInput :value="car_marka"    nonull :len="15"/>
                <label class="label">Model      </label>   <FormInput :value="car_model"    nonull :len="15"/>
                <label class="label">Nr Rej.    </label>   <FormInput :value="car_nrrej"    nonull :len="15"/>
                <label class="label">Nr Silnika </label>   <FormInput :value="car_sinlink"  nonull :len="20"/>
                <label class="label">Nr Nadwozia</label>   <FormInput :value="car_nadwozie" nonull :len="25"/>
            </div>
            <!-- <QueryViewerOpenBtn v-bind="find_options" :scroller="car_scroller" simple/> -->
        </form>
        <QuerySourceOffsetScroller
            :src="src"
            insertable
            saveable
            @error="handle_err"
        /> 
        
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