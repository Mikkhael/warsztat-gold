<script setup>
//@ts-check

// import { Dataset, DVUtil, QueryBuilder } from '../components/Dataset/Dataset';
import {FormInput, FormEnum} from '../components/Controls';

import useMainMsgManager from '../components/Msg/MsgManager';

// import QueryViewerOpenBtn from '../components/QueryViewer/QueryViewerOpenBtn.vue';
// import QueryFormScrollerDataset from '../components/QueryFormScrollerDataset.vue';

import { unref, computed } from 'vue';
import { CREATE_FORM_QUERY_SOURCE_IN_COMPONENT } from './FormCommon';
import { DataGraphDependable, FormDefaultProps, FormParamProp, param_from_prop, qparts_db } from '../components/Dataset';
import { FormQuerySourceSingle } from '../components/Dataset';
// import QueryViewerAdvOpenBtn from '../components/QueryViewer/QueryViewerAdvOpenBtn.vue';
import useWarsztatDatabase from '../DBStructure/db_warsztat_structure';
import QuerySourceOffsetScroller from '../components/Scroller/QuerySourceOffsetScroller.vue';


const props = defineProps({
    ...FormDefaultProps,
    id_klienta:   FormParamProp,
    force_car_id: FormParamProp,
    with_old: Boolean,
    allow_car_reasign: Boolean,
    readonly: Boolean,
    minimal: Boolean,
});


const msgManager = useMainMsgManager();
const db = useWarsztatDatabase();


// ID	kalkulacja	marka	model	nr rej	ID klienta	nr silnika	nr nadwozia

const TAB  = db.TABS.samochody_klientów;
const TAB_ZL = db.TABS.zlecenia_naprawy;
const COLS = db.TABS.samochody_klientów.cols;
const COLS_ZL = db.TABS.zlecenia_naprawy.cols;
const src  = CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, {on_error: handle_err});
src.set_from_with_deps(TAB);

const param_force_car_id = param_from_prop(props, 'force_car_id');
const param_id_klienta   = param_from_prop(props, 'id_klienta');
const param_with_old     = param_from_prop(props, 'with_old');

const ref_id_klienta = src.add_dependable(param_id_klienta) ?? null;
const ref_with_old   = src.add_dependable(param_with_old)   ?? null;

const car_id       = src.auto_add_value_synced(COLS.ID,         {param: param_force_car_id});
const car_klient   = src.auto_add_value_synced(COLS.ID_klienta, {default: param_id_klienta});
// const car_klient   = src.auto_add_value_synced(COLS.ID_klienta, {param: param_id_klienta});
// const car_klient   = src.auto_add_value_synced(COLS.ID_klienta); // removed param
const car_marka    = src.auto_add_value_synced(COLS.marka);
const car_model    = src.auto_add_value_synced(COLS.model);
const car_nrrej    = src.auto_add_value_synced(COLS.nr_rej);
const car_sinlink  = src.auto_add_value_synced(COLS.nr_silnika);
const car_nadwozie = src.auto_add_value_synced(COLS.nr_nadwozia);
const is_old       = computed(() => !!unref(ref_with_old) && car_klient.get_cached() !== unref(ref_id_klienta) );

src.add_where_opt( ...qparts_db('(', COLS.ID_klienta, ' IS ', [ref_id_klienta], ') OR ( ', [ref_with_old], ' AND (', COLS.ID, ' IN ( SELECT ', COLS_ZL.ID_samochodu, ' FROM ', TAB_ZL, ' WHERE ', COLS_ZL.ID_klienta, ' IS ', [ref_id_klienta], ')))' ) );
// src.add_where_opt( ...qparts_db( '(', COLS.ID_klienta, ' IS ', [ref_id_klienta], ')' ));
// src.add_where_opt( '(', COLS.ID_klienta.get_full_sql(), ' IS ', [ref_id_klienta ?? null], ')' );
// src.add_where_eq(COLS.ID_klienta.get_full_sql(), param_id_klienta ?? null, true);


function handle_err(/**@type {Error} */ err) {
    msgManager.postError(err);
}

defineExpose({
    src,
});

const display_compact = computed(() => props.minimal);

</script>


<template>

    <div class="form_container" :class="src.form_style.value">


        <form onsubmit="return false" class="form_content form" :ref="e => src.assoc_form(e)" :class="{compact: display_compact, is_old}">
            <label class="label l1">Marka      </label>   <FormInput class="v1" :readonly="props.readonly" :value="car_marka"    auto/>
            <label class="label l2">Model      </label>   <FormInput class="v2" :readonly="props.readonly" :value="car_model"    auto/>
            <label class="label l3">Nr Rej.    </label>   <FormInput class="v3" :readonly="props.readonly" :value="car_nrrej"    auto/>
            <label class="label l4">Nr Silnika </label>   <FormInput class="v4" :readonly="props.readonly" :value="car_sinlink"  auto/>
            <label class="label l5">Nr Nadwozia</label>   <FormInput class="v5" :readonly="props.readonly" :value="car_nadwozie" auto/>
            <label class="label l6">ID         </label>   <FormInput class="v6 id" readonly  :value="car_id"  auto/> 
                                                                <div class="v6_1 old"> {{ is_old ? "(stary)" : "" }} </div>
            <label class="clabel l123">Rej/Marka/Model</label> 
            <label class="clabel l45">Silnik/Nadwozie</label> 
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

    .l1 {grid-area: l1;} .form > :deep(.v1) {grid-area: v1;}
    .l2 {grid-area: l2;} .form > :deep(.v2) {grid-area: v2;}
    .l3 {grid-area: l3;} .form > :deep(.v3) {grid-area: v3;}
    .l4 {grid-area: l4;} .form > :deep(.v4) {grid-area: v4;}
    .l5 {grid-area: l5;} .form > :deep(.v5) {grid-area: v5;}
    .l6 {grid-area: l6;} .form > :deep(.v6) {grid-area: v6;}
                         .form > :deep(.v6_1) {grid-area: v6_1;}

    .l123 {grid-area: l123;}
    .l45  {grid-area: l45;}

    .form {
        padding: 3px;
        justify-self: start;
        display: grid;
        grid: auto / auto 1fr 1fr;
        grid-template-areas: 
            "l1 v1 v1  "
            "l2 v2 v2  "
            "l3 v3 v3  "
            "l4 v4 v4  "
            "l5 v5 v5  "
            "l6 v6 v6_1";

        gap: 1px 2px;
        justify-items: stretch;
        align-items: stretch;
    }
    .clabel {
        display: none;
    }
    
    .form.compact {
        grid: auto / auto 1fr 1fr 1fr 1fr;
        grid-template-areas: 
            "l123 v3 v3 v1 v1 v2 v2"
            "l45  v4 v4 v4 v5 v5 v5";
    }
    

    .form.compact > :deep(.id),
    .form.compact > .label {
        display: none;
    }
    .form.compact > .clabel {
        display: block;
    }

    .old{
        opacity: 0;
        text-align: center;
    }
    .is_old > .old {
        opacity: 1;
        transition: 0.1s;
        background-color: #71fae8;
    }


</style>

<style>


</style>