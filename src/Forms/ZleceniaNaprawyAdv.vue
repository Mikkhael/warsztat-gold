<script setup>
//@ts-check

import {FormInput, FormEnum, FormCheckbox} from '../components/Controls';

import useMainMsgManager from '../components/Msg/MsgManager';
import useMainFWManager from '../components/FloatingWindows/FWManager';

import QueryViewerAdv from '../components/QueryViewer/QueryViewerAdv.vue';

import { FormDefaultProps, FormParamProp, FormQuerySourceSingle, param_from_prop, QuerySource } from '../components/Dataset';
import IconButton from '../components/Controls/IconButton.vue';

import Klienci from './Klienci.vue';
import ZleceniaNaprawy from './ZleceniaNaprawy.vue';

import QuerySourceOffsetScroller from '../components/Scroller/QuerySourceOffsetScroller.vue';

import { ref, computed} from 'vue';
import { CREATE_FORM_QUERY_SOURCE_IN_COMPONENT } from './FormCommon';
import useWarsztatDatabase from '../DBStructure/db_warsztat_structure';
import { QueryViewerSource } from '../components/QueryViewer/QueryViewer';
import { set_from_for_summary_for_zlec_id } from './CommonSql';


const props = defineProps({
    ...FormDefaultProps,
    
    src_klient: {
        /**@type {import('vue').PropType<FormQuerySourceSingle>} */
        type: Object,
        required: false
    },
    src_zlec: {
        /**@type {import('vue').PropType<FormQuerySourceSingle>} */
        type: Object,
        required: false
    },

    show_only_open: Boolean,
    only_for_car_id:    FormParamProp,
    only_for_klient_id: FormParamProp,

    summary_at_start: Boolean,
    minimal: Boolean,
});



const msgManager = useMainMsgManager();
const fwManager  = useMainFWManager();

const db = useWarsztatDatabase();
const ZLEC_COLS = db.TABS.zlecenia_naprawy.cols;

const param_for_car_id    = param_from_prop(props, 'only_for_car_id');
const param_for_klient_id = param_from_prop(props, 'only_for_klient_id');

const src_zlec   = CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, {src: props.src_zlec});
const src_klient = CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, {src: props.src_klient});

const param_klient_klient_id = src_zlec.get(ZLEC_COLS.ID_klienta);
const param_klient_car_id    = src_zlec.get(ZLEC_COLS.ID_samochodu);
const param_zlecenie_id      = src_zlec.get(ZLEC_COLS.ID);


////////////////// SUMMARY ///////////////////////////////////

const src_list =CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, {src: new QueryViewerSource()});
src_list.add_dep(src_zlec);
set_from_for_summary_for_zlec_id(src_list, param_zlecenie_id.get_ref(), true);

src_list.auto_add_column ('part',       {display: "Numer", default: '-'});
src_list.auto_add_column ('name',       {display: "Nazwa", default: ''});
src_list.auto_add_column ('unit',       {display: "Jednostka", default: ''});
src_list.auto_add_column ('cnt',        {display: "Ilość", default:  0});
src_list.auto_add_column ('netto',      {display: "Cena Jednostkowa Netto", default: "0.00", input_props: {type: 'decimal'}});
src_list.auto_add_column ("mul_netto",  {display: "Łącznie Netto",  sql: "decimal_mul(1,    decimal_mul(`cnt`,`netto`))", input_props: {type: 'decimal'}});
src_list.auto_add_column ("mul_vat",    {display: "Łącznie VAT",    sql: "decimal_mul(0.23, decimal_mul(`cnt`,`netto`))", input_props: {type: 'decimal'}});
src_list.auto_add_column ("mul_brutto", {display: "Łącznie Brutto", sql: "decimal_mul(1.23, decimal_mul(`cnt`,`netto`))", input_props: {type: 'decimal'}});

//////////////////////////////////////////////////////////////

const show_summary = ref(props.summary_at_start);
src_list.set_self_disabled(!show_summary.value);

function handle_err(/**@type {Error} */ err) {
    msgManager.postError(err);
}

function handle_toggle_summary() {
    show_summary.value = !show_summary.value;
    src_list.set_self_disabled(!show_summary.value);
    if(show_summary.value) {
        src_list.request_refresh();
        src_list.update_complete();
    } else {
        setTimeout(() => {
            props.parent_window?.box.resize_to_content();
        }, 100);
    }
}

const display_compact = computed(() => show_summary.value);

defineExpose({
    src_klient,
    src_zlec
});

</script>


<template>

    <div class="form_container" :class="src_zlec.form_style.value">

        <form onsubmit="return false" class="form form_content" :class="{compact: display_compact}" :ref="e => src_zlec.assoc_form(e)"
        >
            
            <fieldset class="klients_container">
                <legend>Klient</legend>
                <Klienci 
                    no_zlec
                    :use_src="src_klient"
                    :force_klient_id="param_klient_klient_id"
                    :force_car_id="param_klient_car_id"
                    :minimal="display_compact"
                />
            </fieldset>

            <fieldset class="zlecenia_container">
                <legend>Zlecenie</legend>
                <ZleceniaNaprawy 
                    :window="props.parent_window"
                    :use_src="src_zlec"
                    show_find_button
                    hide_scroller
                    :show_only_open="props.show_only_open"
                    :id_klienta="props.only_for_klient_id"
                    :id_samochodu="props.only_for_car_id"
                    :minimal="display_compact"
                    :aux_button_1="show_summary ? 'Ukryj podsumowanie' : 'Pokaż podsumowanie'"
                    @clicked_aux_1="handle_toggle_summary"
                />
            </fieldset>

            <div class="summary" v-if="show_summary">
                <QueryViewerAdv
                    inbeded
                    :src="src_list"
                    name="zlec_summary"
                />
            </div>

        </form>
        
        <QuerySourceOffsetScroller
            :src="src_zlec"
            saveable
            @error="handle_err"
        />
        
    </div>

</template>

<style scoped>

.form.compact fieldset {
    border: none;
    padding: 0px 3px;
}
.form.compact fieldset legend {
    display: none;
}



form {
    display: grid;
    grid-template: auto / auto 1fr;
}
.form.compact {
    /* grid-template-rows: auto auto 1fr;
    grid-template-columns: auto; */
    display: flex;
    flex-direction: column;
    align-items: stretch;
    overflow-x: hidden;
}
.summary {
    grid-column: 1 / -1;
    margin: 0px 10px;
    min-height: 100px;
    overflow-y: hidden;
    flex-grow: 1;
}
.summary > * {
    border: 1px dotted black;
}

</style>

<style>


</style>