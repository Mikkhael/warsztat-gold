<script setup>
//@ts-check

import {FormInput, FormEnum, FormCheckbox} from '../components/Controls';

import useMainMsgManager from '../components/Msg/MsgManager';
import useMainFWManager from '../components/FloatingWindows/FWManager';

import { FormDefaultProps, FormQuerySourceSingle } from '../components/Dataset';
import QuerySourceOffsetScroller from '../components/Scroller/QuerySourceOffsetScroller.vue';
import QueryViewerAdvOpenBtn from '../components/QueryViewer/QueryViewerAdvOpenBtn.vue';
import IconButton from '../components/Controls/IconButton.vue';

import Klienci from './Klienci.vue';

import ReportPreparer from '../Reports/ReportPreparer.vue';
import RepZlecenieNaprawy from '../Reports/RepZlecenieNaprawy.vue';
import RepZlecenieNaprawyFaktura from '../Reports/RepZlecenieNaprawyFaktura.vue';

import ZleceniaNaprawy_Czesci from './ZleceniaNaprawy_Czesci.vue';
import ZleceniaNaprawy_Robocizna from './ZleceniaNaprawy_Robocizna.vue';

import { ref, computed} from 'vue';
import { CREATE_FORM_QUERY_SOURCE_IN_COMPONENT } from './FormCommon';
import { date_now, use_datetime_now } from '../utils';
import { FormParamProp, param_from_prop } from '../components/Dataset';
import useWarsztatDatabase from '../DBStructure/db_warsztat_structure';
import { QueryViewerSource } from '../components/QueryViewer/QueryViewer';
import { set_from_for_summary_for_zlec_id } from './CommonSql';
import { toRef } from 'vue';


const props = defineProps({
    ...FormDefaultProps,
    window: {
        /**@type {import('vue').PropType<import('../components/FloatingWindows/FWManager').FWWindow>} */
        type: Object,
        required: false
    },

    id_klienta:   FormParamProp,
    id_samochodu: FormParamProp,
    show_find_button: Boolean,
    show_only_open:   Boolean,
    hide_scroller:    Boolean,

    aux_button_1: {type: String, required: false},

    minimal:          Boolean,
    readonly_dates:   Boolean,
});

const emit = defineEmits({
    clicked_aux_1() {return true;}
});

// console.log("START_PROPS",typeof props.id_klienta, typeof props.id_samochodu,  props.id_klienta, props.id_samochodu, props);


const msgManager = useMainMsgManager();
const fwManager  = useMainFWManager();

const db = useWarsztatDatabase();
const TAB  = db.TABS.zlecenia_naprawy;
const COLS = TAB.cols;

// #	ID	ID klienta	ID samochodu	data otwarcia	        data zamknięcia	        zysk z części	zysk z robocizny	mechanik prowadzący	% udziału	pomocnik 1	  % udziału p1	pomocnik 2	% udziału p2	zgłoszone naprawy	                                    uwagi o naprawie
// 0:	1	92	        17	            1998-09-02 00:00:00	    1947-01-12 00:00:00	    0.00	        0.00	            Dąbrowski Stanisław	0	        ~NULL~	      0	            ~NULL~	    0	            PINELES Naprawa blacharska przedniej cząści samochodu	1 2 3


const src  = CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, {on_error: handle_err});
src.set_from_with_deps(TAB);

const show_only_open_ref = toRef(props, 'show_only_open');
// const show_only_open_quard = computed(() => props.show_only_open ? 0 : 1);

const param_in_id_klienta = param_from_prop(props, 'id_klienta');
const param_in_id_car     = param_from_prop(props, 'id_samochodu');

const id         = src.auto_add_value_synced(COLS.ID,                                             );
const id_klienta = src.auto_add_value_synced(COLS.ID_klienta,           {param: param_in_id_klienta} );
const id_car     = src.auto_add_value_synced(COLS.ID_samochodu,         {param: param_in_id_car}     );

const data_otw   = src.auto_add_value_synced(COLS.data_otwarcia,        {default: use_datetime_now()} );
const data_zamk  = src.auto_add_value_synced(COLS.data_zamknięcia,                            );
const zgloszenie = src.auto_add_value_synced(COLS.zgłoszone_naprawy,                          );
const uwagi      = src.auto_add_value_synced(COLS.uwagi_o_naprawie,                           );

const prow       = src.auto_add_value_synced(COLS.mechanik_prowadzący,                        );
const pom1       = src.auto_add_value_synced(COLS.pomocnik_1,                                 );
const pom2       = src.auto_add_value_synced(COLS.pomocnik_2,                                 );
const prow_p     = src.auto_add_value_synced(COLS['%_udziału'],         {default: 0}          );
const pom1_p     = src.auto_add_value_synced(COLS['%_udziału_p1'],      {default: 0}          );
const pom2_p     = src.auto_add_value_synced(COLS['%_udziału_p2'],      {default: 0}          );
const zysk_rob   = src.auto_add_value_synced(COLS.zysk_z_robocizny,     {default: 0}          );
const zysk_cz    = src.auto_add_value_synced(COLS.zysk_z_części,        {default: 0}          );

src.add_where_eq_dynamic(show_only_open_ref, COLS.data_zamknięcia.get_full_sql(), null);

const param_out_klient_id   = src.get(COLS.ID_klienta);
const param_out_car_id      = src.get(COLS.ID_samochodu);
const param_out_zlecenie_id = src.get(COLS.ID);

////////////////// TOTALS ///////////////////////////////////

const src_total = CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, {src: new FormQuerySourceSingle()});
src_total.add_dep(src);
set_from_for_summary_for_zlec_id(src_total, param_out_zlecenie_id.get_ref());
const total_netto  = src_total.auto_add_value ("total_netto",  {sql: "decimal_mul(1,    decimal_sum(decimal_mul(`cnt`,`netto`)))", default: '0.00'});
const total_vat    = src_total.auto_add_value ("total_vat",    {sql: "decimal_mul(0.23, decimal_sum(decimal_mul(`cnt`,`netto`)))", default: '0.00'});
const total_brutto = src_total.auto_add_value ("total_brutto", {sql: "decimal_mul(1.23, decimal_sum(decimal_mul(`cnt`,`netto`)))", default: '0.00'});

//////////////////////////////////////////////////////////////


// const readonly = computed(() => data_zamk.get_cached() !== null);
const readonly = false;

/// FIND /////

const QVFactory_find_zlec_open = () => {
    const KLIE_TAB  = db.TABS.klienci;
    const KLIE_COLS = db.TABS.klienci.cols;
    const ZLEC_TAB  = db.TABS.zlecenia_naprawy;
    const ZLEC_COLS = db.TABS.zlecenia_naprawy.cols;
    const CAR_TAB   = db.TABS.samochody_klientów;
    const CAR_COLS  = db.TABS.samochody_klientów.cols;
    const src = new QueryViewerSource();
    src.set_from_with_deps(ZLEC_TAB);
    src.add_join(ZLEC_COLS.ID_klienta,   KLIE_COLS.ID, 'LEFT');
    src.add_join(ZLEC_COLS.ID_samochodu, CAR_COLS.ID,  'LEFT');
    // src.auto_add_column(ZLEC_COLS.ID),
    // src.auto_add_column(CAR_COLS.ID),
    src.auto_add_column(ZLEC_COLS.ID,                 {display: 'ID'});
    src.auto_add_column(KLIE_COLS.NAZWA,              {display: 'Klient'});
    src.auto_add_column(CAR_COLS.nr_rej,              {display: 'Nr Rej.'});
    src.auto_add_column(ZLEC_COLS.data_otwarcia,      {display: 'Otwarcie'});
    
    if(!show_only_open_ref.value) {
        src.auto_add_column(ZLEC_COLS.data_zamknięcia,    {display: 'Zamknięcie'});
        src.auto_add_column('is_zlec_open',               {display: 'Czy Otwarte?', sql: `iif(${ZLEC_COLS.data_zamknięcia.get_full_sql()} IS NULL, 'Otwarte', 'Zamknięte')`});
    }

    src.auto_add_column(ZLEC_COLS.zgłoszone_naprawy,  {display: 'Zgłoszenie'});
    src.auto_add_column(ZLEC_COLS.uwagi_o_naprawie,   {display: 'Uwagi'});

    src.add_where_eq_dynamic(show_only_open_ref, ZLEC_COLS.data_zamknięcia.get_full_sql(), null);
    src.add_where_eq(ZLEC_COLS.ID_klienta.get_full_sql(),   param_in_id_klienta ?? null, true);
    src.add_where_eq(ZLEC_COLS.ID_samochodu.get_full_sql(), param_in_id_car     ?? null, true);
    return src;
}
const QVFactory_find_zlec_open_select = QueryViewerSource.create_default_select_handler([[src, 0]], handle_err, {focus_window: props.window});


//////////////

const show_summary = ref(false);

function handle_err(/**@type {Error} */ err) {
    msgManager.postError(err);
}

function close_current_zlecenie() {
    data_zamk.set_local(date_now());
}

const RepZlecenieNaprawy_ref = ref(/**@type {ReportPreparer?} */ (null));
function open_print_window() {
    RepZlecenieNaprawy_ref.value?.update_and_open(false).catch(handle_err);
}
const RepZlecenieNaprawyFaktura_ref = ref(/**@type {ReportPreparer?} */ (null));
function open_print_window_faktura() {
    RepZlecenieNaprawyFaktura_ref.value?.update_and_open(false).catch(handle_err);
}

function open_czesci_window() {
    const title = "Części - Zlecenie nr " + param_out_zlecenie_id.get_value();
    return fwManager.open_or_focus_window(title, ZleceniaNaprawy_Czesci, {
        category: 'czesci',
        props: {
            id_zlecenia: param_out_zlecenie_id.get_value(),
            id_samochodu: param_out_car_id.get_value(),
        },
        // parent: props.parent_window
    });
}
function open_robocizna_window() {
    const title = "Robocizna - Zlecenie nr " + param_out_zlecenie_id.get_value();
    return fwManager.open_or_focus_window(title, ZleceniaNaprawy_Robocizna, {
        category: 'czesci',
        props: {id_zlecenia: param_out_zlecenie_id.get_value()},
        // parent: props.parent_window
    });
}

function handle_aux_button_1() {
    emit('clicked_aux_1');
}

const display_compact = computed(() => props.minimal);
const editable_dates  = computed(() => !props.readonly_dates);

defineExpose({
    src
});

</script>


<template>

    <div class="form_container" :class="src.form_style.value">

        <form onsubmit="return false" class="form form_content" :ref="e => src.assoc_form(e)" :class="{compact: display_compact}">

            <div class="header auto_labels">
                <label>
                    <div>nr zlecenia</div>
                    <FormInput :value="id"        auto readonly style="width: 10ch" />
                </label>
                <label>
                    <div>data otwarcia</div>
                    <FormInput :value="data_otw"  auto :readonly="readonly || !editable_dates" />
                </label>
                <label v-if="data_zamk.get_local() !== null">
                    <div>data zamknięcia</div>
                    <FormInput :value="data_zamk" auto :readonly="readonly || !editable_dates" />
                </label>
                <label v-else :class="{changed: data_zamk.changed.value}">
                    <div class="emph" >OTWARTE</div>
                    <IconButton text="Zamknij" noicon @click="close_current_zlecenie()" v-if="editable_dates"/>
                </label>
                <div v-if="props.show_find_button">
                    <QueryViewerAdvOpenBtn 
                        :parent_window="props.window"
                        text="Znajdź"
                        :title="'Znajdź ' + (props.window?.box.title ?? 'Zlecenie')"
                        selectable
                        :src_factory="QVFactory_find_zlec_open" 
                            @select="QVFactory_find_zlec_open_select"
                            @error="handle_err" />
                </div>
            </div>

            <div class="subheader flex_auto" :class="{hidden: display_compact}">
                <div class="udzialy grid">
                    <div>Adres e-mail</div> <FormInput :value="prow" auto :readonly="readonly"/> <FormInput auto :value="prow_p" :readonly="readonly" nospin min="0" max="100"/> <span>%</span>
                    <div>pomocnik 1</div>   <FormInput :value="pom1" auto :readonly="readonly"/> <FormInput auto :value="pom1_p" :readonly="readonly" nospin min="0" max="100"/> <span>%</span>
                    <div>pomocnik 2</div>   <FormInput :value="pom2" auto :readonly="readonly"/> <FormInput auto :value="pom2_p" :readonly="readonly" nospin min="0" max="100"/> <span>%</span>
                </div>
                <div class="buttons">
                    <!-- <img src="/assets/icons/document.svg" class="button" @click="open_print_window"/> -->
                    <!-- <img src="/assets/icons/document.svg" class="button" @click="open_print_window_faktura"/> -->
                    <!-- <div class="button" @click="open_czesci_window">CZĘŚCI</div> -->
                    <!-- <div class="button" @click="open_robocizna_window">ROBOCIZNA</div> -->
                    <IconButton icon="document" text="Faktura"   @click="open_print_window_faktura" />
                    <IconButton icon="document" text="Zlecenie"  @click="open_print_window" />
                    <IconButton icon="edit"     text="CZĘŚCI"    @click="open_czesci_window" />
                    <IconButton icon="edit"     text="ROBOCIZNA" @click="open_robocizna_window" />
                </div>
            </div>

            <div class="textarea_section auto_labels">
                <label>
                    <div>Zgłoszenie do naprawy</div>
                    <FormInput :value="zgloszenie" :readonly="readonly" auto class="grow" textarea rows="2"/>
                </label>
            </div>
            
            <div class="textarea_section auto_labels">
                <label>
                    <div>Uwagi</div>
                    <FormInput :value="uwagi" :readonly="readonly" auto class="grow" textarea rows="2"/>
                </label>
            </div>
            
            
            <div class="totals auto_labels">
                <label>
                    <div>Netto</div>
                    <FormInput type="decimal" :value="total_netto"  readonly />
                </label>
                <label>
                    <div>VAT</div>
                    <FormInput type="decimal" :value="total_vat"    readonly />
                </label>
                <label>
                    <div>Brutto</div>
                    <FormInput type="decimal" :value="total_brutto" readonly />
                </label>
            </div>

            <div class="totals auto_labels">
                <label>
                    <div>Zysk Części</div>
                    <FormInput auto :value="zysk_cz" />
                </label>
                <label>
                    <div>Zysk Robocizna</div>
                    <FormInput auto :value="zysk_rob" />
                </label>
                <label v-if="props.aux_button_1 !== undefined">
                    <IconButton 
                        :text="props.aux_button_1"
                        noicon
                        @click="handle_aux_button_1"
                    />
                </label>
            </div>
            
        </form>
        
        <QuerySourceOffsetScroller
            v-if="!props.hide_scroller"
            :src="src"
            insertable
            saveable
            @error="handle_err"
        />

        
        <ReportPreparer
            ref="RepZlecenieNaprawy_ref"
            :rep="RepZlecenieNaprawy"
            :id_zlecenia="param_out_zlecenie_id"
        />
        <ReportPreparer
            ref="RepZlecenieNaprawyFaktura_ref"
            :rep="RepZlecenieNaprawyFaktura"
            :id_zlecenia="param_out_zlecenie_id"
        />
        
    </div>

</template>

<style scoped>

    .hidden {display: none;}
    .emph {font-weight: bold; text-align: center;}

    /* .form_container {
        width: 100%;
    } */

    .form {
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
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
    .form.compact > .auto_labels > label {
        flex-direction: row;
        align-items: center;
        word-wrap: normal;
    }

    .buttons{
        display: grid;
        justify-content: start;
        grid-template-rows: auto auto;
        grid-auto-flow: column;
    }

    .textarea_section {
        flex-grow: 1;
    }
    .textarea_section :deep(textarea) {
        flex-grow: 1;
        align-self: stretch;
        resize: none;
    }
    /* .form.compact > .textarea_section {
        flex-grow: 0;
    } */

    .udzialy {
        grid-template-columns: auto auto 4ch auto ;
    }

    .totals > label :deep(input) {
        margin-right: 1%;
        flex-grow: 1;
    }

</style>

<style>


</style>