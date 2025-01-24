<script setup>
//@ts-check

import {FormInput, FormEnum, FormCheckbox} from '../components/Controls';

import useMainMsgManager from '../components/Msg/MsgManager';
import useMainFWManager from '../components/FloatingWindows/FWManager';

import { FormDefaultProps, FormQuerySourceSingle, RefChangableValue } from '../components/Dataset';
import QueryViewerAdv from '../components/QueryViewer/QueryViewerAdv.vue';


import { ref, computed, watch} from 'vue';
import { CREATE_FORM_QUERY_SOURCE_IN_COMPONENT } from './FormCommon';
import { date_now, datetime, datetime_now, use_datetime_now } from '../utils';
import { FormParamProp, param_from_prop } from '../components/Dataset';
import useWarsztatDatabase from '../DBStructure/db_warsztat_structure';
import { QueryViewerSource } from '../components/QueryViewer/QueryViewer';
import { set_from_for_summary_for_zlec_id } from './CommonSql';
import { toRef } from 'vue';


const props = defineProps({
    ...FormDefaultProps,
    
    src_list: {
        /**@type {import('vue').PropType<QueryViewerSource>} */
        type: Object,
        required: false
    },
    src_total: {
        /**@type {import('vue').PropType<FormQuerySourceSingle>} */
        type: Object,
        required: false
    },

});

const msgManager = useMainMsgManager();
const fwManager  = useMainFWManager();

const now       = new Date();
const month_ago = new Date();
month_ago.setMonth(now.getMonth() - 1);

const date_interval_from = new RefChangableValue(ref(datetime(month_ago)), false);
const date_interval_to   = new RefChangableValue(ref(datetime(now)),       false);

const db = useWarsztatDatabase();
const ZLEC_TAB  = db.TABS.zlecenia_naprawy
const ZLEC_COLS = db.TABS.zlecenia_naprawy.cols;
const KLIE_TAB  = db.TABS.klienci
const KLIE_COLS = db.TABS.klienci.cols;
const SAMO_TAB  = db.TABS.samochody_klientów
const SAMO_COLS = db.TABS.samochody_klientów.cols;

const src_list  = CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, {src: props.src_list ?? new QueryViewerSource(), on_error: handle_err});
// src_list.set_no_disable_on_empty();

src_list.set_from_with_deps(ZLEC_TAB);
src_list.add_join(ZLEC_COLS.ID_klienta,   KLIE_COLS.ID, 'LEFT');
src_list.add_join(ZLEC_COLS.ID_samochodu, SAMO_COLS.ID, 'LEFT');


src_list.auto_add_column(ZLEC_COLS.data_zamknięcia, {display: 'Data Zamknięcia'});

src_list.auto_add_column('zysk_sum', {display: 'Zysk Łącznie',   format: 'decimal', input_props:{type: 'decimal'}, sql: `decimal_add(${ZLEC_COLS.zysk_z_części.get_full_sql()},${ZLEC_COLS.zysk_z_robocizny.get_full_sql()})`});
src_list.auto_add_column(`zysk_cze`, {display: 'Zysk Części',    format: 'decimal', input_props:{type: 'decimal'}, sql: `${ZLEC_COLS.zysk_z_części.get_full_sql()}`});
src_list.auto_add_column('zysk_rob', {display: 'Zysk Robocizna', format: 'decimal', input_props:{type: 'decimal'}, sql: `${ZLEC_COLS.zysk_z_robocizny.get_full_sql()}`});

src_list.auto_add_column(KLIE_COLS.NAZWA,           {display: 'Klient'});
src_list.auto_add_column(SAMO_COLS.nr_rej,          {display: 'Nr Rej.'});
src_list.auto_add_column(SAMO_COLS.marka,           {display: 'Marka'});
src_list.auto_add_column(SAMO_COLS.model,           {display: 'Model'});

// src_list.auto_add_column('is_zlec_open',            {display: 'Czy Otwarte?', sql: `iif(${ZLEC_COLS.data_zamknięcia.get_full_sql()} IS NULL, 'Otwarte', 'Zamknięte')`});
// src_list.auto_add_column(ZLEC_COLS.data_otwarcia,   {display: 'Otwarcie'});
src_list.auto_add_column(ZLEC_COLS.ID,                 {display: 'Nr. Zlecenia'});
src_list.auto_add_column(ZLEC_COLS.zgłoszone_naprawy,  {display: 'Zgłoszenie'});
src_list.auto_add_column(ZLEC_COLS.uwagi_o_naprawie,   {display: 'Uwagi'});

src_list.query.add_where([ZLEC_COLS.data_zamknięcia.get_full_sql(), 'NOTNULL'], false);


watch([date_interval_from.get_local_ref(), date_interval_to.get_local_ref()], ([new_date_from, new_date_to]) => {
    // console.log("NEW DATES INTERVALS", new_date_from, new_date_to);
    src_list.set_interval(ZLEC_COLS.data_zamknięcia, new_date_from, new_date_to);
}, {immediate: true});

////////////////// TOTALS ///////////////////////////////////

const SRC_TOTAL_FROM = computed(() => {
    return '(' + src_list.query.full_sql_summary.value + ')';
});

const src_total = CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, {src: props.src_total, implicit_order_rowid: false, on_error: handle_err});
src_list.add_aux_query(src_total);
src_total.disable_offset();
src_total.query.from.reas(SRC_TOTAL_FROM);
// const total_netto  = src_total.auto_add_value ("total_netto",  {sql: "decimal_mul(1,    decimal_sum(decimal_mul(`cnt`,`netto`)))", default: '0.00'});
// const total_vat    = src_total.auto_add_value ("total_vat",    {sql: "decimal_mul(0.23, decimal_sum(decimal_mul(`cnt`,`netto`)))", default: '0.00'});
// const total_brutto = src_total.auto_add_value ("total_brutto", {sql: "decimal_mul(1.23, decimal_sum(decimal_mul(`cnt`,`netto`)))", default: '0.00'});
const total_cnt      = src_total.auto_add_value('total_cnt',      {sql: "count(*)"});
const total_zysk_sum = src_total.auto_add_value('total_zysk_sum', {sql: "decimal_sum(`zysk_sum`)"});
const total_zysk_cze = src_total.auto_add_value('total_zysk_cze', {sql: "decimal_sum(`zysk_cze`)"});
const total_zysk_rob = src_total.auto_add_value('total_zysk_rob', {sql: "decimal_sum(`zysk_rob`)"});

//////////////////////////////////////////////////////////////

function handle_err(/**@type {Error} */ err) {
    msgManager.postError(err);
}

defineExpose({
    src_list,
    src_total
});

</script>


<template>

    <div class="zysk_summary_container">

        <div class="list_container">
            <QueryViewerAdv 
                :src="src_list"
                name="list_zysk_summary"
                inbeded
                @error="handle_err"
            />
        </div>
        
        <fieldset class="config_container auto_labels">
            <legend>Przediał czasu</legend>
            <label>
                <div>Data początkowa</div>
                <FormInput type="date" :value="date_interval_from"/>
            </label>
            <label>
                <div>Data końcowa</div>
                <FormInput type="date" :value="date_interval_to"/>
            </label>
        </fieldset>

        <fieldset class="total_continer auto_labels">
            <legend>Podsumowanie</legend>
            <label>
                <div>Liczba zleceń</div>
                <FormInput type="number" :value="total_cnt" readonly/>
            </label>
            <label>
                <div>Zysk Łącznie</div>
                <FormInput type="decimal" :value="total_zysk_sum" readonly/>
            </label>
            <label>
                <div>Części</div>
                <FormInput type="decimal" :value="total_zysk_cze" readonly/>
            </label>
            <label>
                <div>Robocizna</div>
                <FormInput type="decimal" :value="total_zysk_rob" readonly/>
            </label>
        </fieldset>

    </div>

</template>

<style scoped>

    .zysk_summary_container {
        display: grid;
        grid-template: 1fr auto / auto auto;
        height: 100%;
    }

    .list_container {
        grid-column: 1 / -1;
        overflow-x: auto;
    }
    .auto_labels {
        display: flex;
        flex-direction: row;
    }
    .auto_labels > label {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        justify-content: center;
    }

</style>

<style>


</style>