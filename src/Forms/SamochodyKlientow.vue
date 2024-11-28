<script setup>
//@ts-check

// import { Dataset, DVUtil, QueryBuilder } from '../components/Dataset/Dataset';
import {FormInput, FormEnum} from '../components/Controls';

import useMainMsgManager from '../components/Msg/MsgManager';

import QueryViewerOpenBtn from '../components/QueryViewer/QueryViewerOpenBtn.vue';
// import QueryFormScrollerDataset from '../components/QueryFormScrollerDataset.vue';

import {onUnmounted, onMounted} from 'vue';
import { CREATE_FORM_QUERY_SOURCE_IN_COMPONENT } from './FormCommon';
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
    readonly: {
        type: Boolean,
        default: false
    },
    use_src: {
        /**@type {import('vue').PropType<FormQuerySource>} */
        type: Object,
        required: false
    },
    id_klienta:   FormParamProp,
    force_car_id: FormParamProp,
});


const msgManager = useMainMsgManager();
const db = useWarsztatDatabase();


// ID	kalkulacja	marka	model	nr rej	ID klienta	nr silnika	nr nadwozia

const TAB  = db.TABS.samochody_klientów;
const COLS = db.TABS.samochody_klientów.cols;
const src  = CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, handle_err);
src.set_from_with_deps(TAB);

const param_force_car_id = param_from_prop(props, 'force_car_id');
const param_id_klienta   = param_from_prop(props, 'id_klienta');

const car_id       = src.auto_form_value_synced(COLS.ID, {param: param_force_car_id});
const car_klient   = src.auto_form_value_synced(COLS.ID_klienta, {param: param_id_klienta});
const car_marka    = src.auto_form_value_synced(COLS.marka);
const car_model    = src.auto_form_value_synced(COLS.model);
const car_nrrej    = src.auto_form_value_synced(COLS.nr_rej);
const car_sinlink  = src.auto_form_value_synced(COLS.nr_silnika);
const car_nadwozie = src.auto_form_value_synced(COLS.nr_nadwozia);

// const car_id       = standard_form_value_routine(src, "ID",           {sync, primary: true}             );
// const car_klient   = standard_form_value_routine(src, "ID klienta",   {sync, param: param_id_klienta}   );
// const car_marka    = standard_form_value_routine(src, "marka",        {sync}                            );
// const car_model    = standard_form_value_routine(src, "model",        {sync}                            );
// const car_nrrej    = standard_form_value_routine(src, "nr rej",       {sync}                            );
// const car_sinlink  = standard_form_value_routine(src, "nr silnika",   {sync}                            );
// const car_nadwozie = standard_form_value_routine(src, "nr nadwozia",  {sync}                            );

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

        <form class="form_content form" :ref="e => src.assoc_form(e)">
            <label class="label">Marka      </label>   <FormInput :readonly="props.readonly" :value="car_marka"    auto pattern="[^ś]*"/>
            <label class="label">Model      </label>   <FormInput :readonly="props.readonly" :value="car_model"    auto/>
            <label class="label">Nr Rej.    </label>   <FormInput :readonly="props.readonly" :value="car_nrrej"    auto/>
            <label class="label">Nr Silnika </label>   <FormInput :readonly="props.readonly" :value="car_sinlink"  auto/>
            <label class="label">Nr Nadwozia</label>   <FormInput :readonly="props.readonly" :value="car_nadwozie" auto/>
            <label class="label">ID         </label>   <FormInput readonly                   :value="car_id"       auto />
        </form>
        <QuerySourceOffsetScroller
            v-if="props.force_car_id === undefined"
            :src="src"
            insertable
            saveable
            @error="handle_err"
        /> 
        
    </div>

</template>

<style scoped>

    .form {
        padding: 3px;
        justify-self: start;
        display: grid;
        grid: auto / auto 1fr;
        gap: 1px 2px;
        justify-items: stretch;
        align-items: stretch;
    }

</style>

<style>


</style>