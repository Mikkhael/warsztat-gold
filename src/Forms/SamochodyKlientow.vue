<script setup>
//@ts-check

// import { Dataset, DVUtil, QueryBuilder } from '../components/Dataset/Dataset';
import {FormInput, FormEnum} from '../components/Controls';

import useMainMsgManager from '../components/Msg/MsgManager';

import QueryViewerOpenBtn from '../components/QueryViewer/QueryViewerOpenBtn.vue';
// import QueryFormScrollerDataset from '../components/QueryFormScrollerDataset.vue';

import {onUnmounted, onMounted} from 'vue';
import { CREATE_FORM_QUERY_SOURCE_IN_COMPONENT } from './FormCommon';
import { FormDefaultProps, FormParamProp, param_from_prop } from '../components/Dataset';
import { FormQuerySourceSingle } from '../components/Dataset';
import useWarsztatDatabase from '../DBStructure/db_warsztat_structure';
import QuerySourceOffsetScroller from '../components/Scroller/QuerySourceOffsetScroller.vue';


const props = defineProps({
    ...FormDefaultProps,
    id_klienta:   FormParamProp,
    force_car_id: FormParamProp,
    readonly: {
        type: Boolean,
        default: false
    },
});


const msgManager = useMainMsgManager();
const db = useWarsztatDatabase();


// ID	kalkulacja	marka	model	nr rej	ID klienta	nr silnika	nr nadwozia

const TAB  = db.TABS.samochody_klientów;
const COLS = db.TABS.samochody_klientów.cols;
const src  = CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, {on_error: handle_err});
src.set_from_with_deps(TAB);

const param_force_car_id = param_from_prop(props, 'force_car_id');
const param_id_klienta   = param_from_prop(props, 'id_klienta');

const car_id       = src.auto_add_value_synced(COLS.ID,         {param: param_force_car_id});
const car_klient   = src.auto_add_value_synced(COLS.ID_klienta, {param: param_id_klienta});
const car_marka    = src.auto_add_value_synced(COLS.marka);
const car_model    = src.auto_add_value_synced(COLS.model);
const car_nrrej    = src.auto_add_value_synced(COLS.nr_rej);
const car_sinlink  = src.auto_add_value_synced(COLS.nr_silnika);
const car_nadwozie = src.auto_add_value_synced(COLS.nr_nadwozia);

function handle_err(/**@type {Error} */ err) {
    msgManager.postError(err);
}

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