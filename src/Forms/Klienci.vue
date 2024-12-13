<script setup>
//@ts-check

import {FormInput, FormEnum} from '../components/Controls';

import useMainMsgManager from '../components/Msg/MsgManager';

import { QueryViewerSource } from '../components/QueryViewer/QueryViewer';
import QueryViewerAdvOpenBtn from '../components/QueryViewer/QueryViewerAdvOpenBtn.vue';


import SamochodyKlientow from './SamochodyKlientow.vue';
import ZleceniaNaprawy from './ZleceniaNaprawy.vue';

import {onMounted, onUnmounted, ref, nextTick} from 'vue';
import { standard_QV_select, CREATE_FORM_QUERY_SOURCE_IN_COMPONENT } from './FormCommon';
import { use_datetime_now } from '../utils';
import { FormParamProp, FormDefaultProps, FormQuerySourceSingle, param_from_prop } from '../components/Dataset';
import useWarsztatDatabase from '../DBStructure/db_warsztat_structure';
import QuerySourceOffsetScroller from '../components/Scroller/QuerySourceOffsetScroller.vue';
import useMainFWManager from '../components/FloatingWindows/FWManager';


const props = defineProps({
    ...FormDefaultProps,
    force_klient_id: FormParamProp,
    force_car_id:    FormParamProp,
    no_zlec: Boolean,
    readonly: {
        type: Boolean,
        default: false,
    },
});

const msgManager = useMainMsgManager();
const fwManager  = useMainFWManager();


// #	ID	NAZWA MIASTO ULICA KOD_POCZT TELEFON1  TELEFON2	NIP KTO	KIEDY UPUST	odbierający fakturę	list
// #	ID	NAZWA	                                                    MIASTO	    ULICA	        KOD_POCZT	TELEFON1	    TELEFON2	NIP	            KTO	KIEDY	            UPUST	odbierający fakturę	list
// 0:	1	Katowickie Zakłady Chemii Gospodarczej POLENA-SAWONA sp.zoo	Katowice	Pośpiecha 7/9	40-852	    254-50-77 w 337	~NULL~	    634-019-75-42	kot	1997-03-06 00:00:00	0	    Bąk Danuta	        1
const form     = ref();
const scroller = ref();

const form_car  = ref();
const form_zlec = ref();

const db = useWarsztatDatabase();
const TAB  = db.TABS.klienci;
const COLS = TAB.cols;

const src  = CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, {on_error: handle_err});
src.set_from_with_deps(TAB);

const src_car      = new FormQuerySourceSingle();
const src_zlecenia = new FormQuerySourceSingle();

const param_force_klient_id = param_from_prop(props, 'force_klient_id');

const id     = src.auto_add_value_synced(COLS.ID,                  {param: param_force_klient_id});
const nazwa  = src.auto_add_value_synced(COLS.NAZWA                );
const miasto = src.auto_add_value_synced(COLS.MIASTO               );
const ulica  = src.auto_add_value_synced(COLS.ULICA                );
const kod    = src.auto_add_value_synced(COLS.KOD_POCZT            );
const tele1  = src.auto_add_value_synced(COLS.TELEFON1             );
const tele2  = src.auto_add_value_synced(COLS.TELEFON2             );
const nip    = src.auto_add_value_synced(COLS.NIP                  );
const odbier = src.auto_add_value_synced(COLS.odbierający_fakturę  );
const kto    = src.auto_add_value_synced(COLS.KTO,                 {default: "Gold"});
const kiedy  = src.auto_add_value_synced(COLS.KIEDY,               {default: use_datetime_now()});
const upust  = src.auto_add_value_synced(COLS.UPUST,               {default: 0});
const list   = src.auto_add_value_synced(COLS.list                 );


const param_id_klienta   = src.get(COLS.ID);
const param_id_samochodu = src_car.get(db.TABS.samochody_klientów.cols.ID);

// FIND

const QVFactory_find_client = () => {
    const src = new QueryViewerSource();
    src.set_from_with_deps(TAB);
    src.auto_add_column(COLS.ID,                  {display: 'ID'});
    src.auto_add_column(COLS.NAZWA,               {display: 'Nazwa'});
    src.auto_add_column("adres",                  {display: 'Adres', sql: "(`ULICA` || ', ' || `MIASTO` || ' ' || `KOD_POCZT`)"});
    src.auto_add_column(COLS.NIP,                 {display: 'NIP'});
    src.auto_add_column(COLS.TELEFON1,            {display: 'Telefon'});
    src.auto_add_column(COLS.TELEFON2,            {display: 'Telefon 2'});
    src.auto_add_column(COLS.odbierający_fakturę, {display: 'Odbierający Fakturę'});
    src.auto_add_column(COLS.KTO,                 {display: 'wpisał'});
    src.auto_add_column(COLS.KIEDY,               {display: 'dnia'});
    return src;
}
const QVFactory_find_client_select = QueryViewerSource.create_default_select_handler([[src, COLS.ID]], handle_err, true);


const QVFactory_find_car = () => {
    const CAR_TAB  = db.TABS.samochody_klientów;
    const CAR_COLS = db.TABS.samochody_klientów.cols;
    const src = new QueryViewerSource();
    src.set_from_with_deps(CAR_TAB);
    src.add_join(CAR_COLS.ID_klienta, COLS.ID);
    src.auto_add_column(CAR_COLS.ID_klienta);
    src.auto_add_column(CAR_COLS.ID,                  {display: 'ID'});
    src.auto_add_column(CAR_COLS.nr_rej,              {display: 'Nr Rej.'});
    src.auto_add_column(COLS.NAZWA,                   {display: 'Klient'});
    src.auto_add_column(CAR_COLS.marka,               {display: 'Marka'});
    src.auto_add_column(CAR_COLS.model,               {display: 'Model'});
    src.auto_add_column(CAR_COLS.nr_silnika,          {display: 'Nr Silnika'});
    src.auto_add_column(CAR_COLS.nr_nadwozia,         {display: 'Nr Nadwozia'});
    return src;
}
const QVFactory_find_car_select = QueryViewerSource.create_default_select_handler([[src, 0],[src_car,1]], handle_err, true);


const QVFactory_find_zlec = () => {
    const ZLEC_TAB  = db.TABS.zlecenia_naprawy;
    const ZLEC_COLS = db.TABS.zlecenia_naprawy.cols;
    const CAR_COLS  = db.TABS.samochody_klientów.cols;
    const src = new QueryViewerSource();
    src.set_from_with_deps(ZLEC_TAB);
    src.add_join(ZLEC_COLS.ID_klienta,   COLS.ID);
    src.add_join(ZLEC_COLS.ID_samochodu, CAR_COLS.ID);
    src.auto_add_column(COLS.ID),
    src.auto_add_column(CAR_COLS.ID),
    src.auto_add_column(ZLEC_COLS.ID,                 {display: 'ID'});
    src.auto_add_column(COLS.NAZWA,                   {display: 'Klient'});
    src.auto_add_column(CAR_COLS.nr_rej,              {display: 'Nr Rej.'});
    src.auto_add_column(ZLEC_COLS.data_otwarcia,      {display: 'Otwarcie'});
    src.auto_add_column(ZLEC_COLS.data_zamknięcia,    {display: 'Zamknięcie'});

    src.auto_add_column(ZLEC_COLS.zgłoszone_naprawy,  {display: 'Zgłoszenie'});
    src.auto_add_column(ZLEC_COLS.uwagi_o_naprawie,   {display: 'Uwagi'});
    return src;
}
const QVFactory_find_zlec_select = QueryViewerSource.create_default_select_handler([[src, 0],[src_car,1],[src_zlecenia,2]], handle_err, true);

const show_zlecenia = ref(true);
// function click_zlecenia(){
//     show_zlecenia.value = !show_zlecenia.value;
//     nextTick().then(() => {
//         props.parent_window?.box.resize_to_content(true);
//     });
// }

function handle_err(/**@type {Error} */ err) {
    msgManager.postError(err);
}

const test_ref = ref(88);

defineExpose({
    src
});

</script>


<template>

    <div class="form_container" :class="src.form_style.value">

        <form class="form form_content flex_auto" :ref="e => src.assoc_form(e)">
            
            <div class="grid">
                
                <div class="row flex_auto" v-if="!props.no_zlec">
                
                    <div>
                        <QueryViewerAdvOpenBtn 
                            text="Znajdź Klienta"
                            selectable
                            :src_factory="QVFactory_find_client" 
                                 @select="QVFactory_find_client_select"
                                 @error="handle_err" />
                    </div>
                    <div>
                        <QueryViewerAdvOpenBtn 
                            text="Znajdź Samochód"
                            selectable
                            :src_factory="QVFactory_find_car" 
                                 @select="QVFactory_find_car_select"
                                 @error="handle_err" />
                    </div>
                    <div>
                        <QueryViewerAdvOpenBtn 
                            text="Znajdź Zlecenie"
                            selectable
                            :src_factory="QVFactory_find_zlec" 
                                 @select="QVFactory_find_zlec_select"
                                 @error="handle_err" />
                    </div> 
               
                    <!-- <button @click.prevent="click_zlecenia">ZLECENIA</button> -->
                </div>

                <label>Nazwa              </label>  <FormInput :readonly="props.readonly" :value="nazwa " auto class="main_input_field" pattern="[^ś]*" />
                <label>Odbierający Fakturę</label>  <FormInput :readonly="props.readonly" :value="odbier" auto class="main_input_field" />
                <label>Ulica i Nr Domu    </label>  <FormInput :readonly="props.readonly" :value="ulica " auto class="main_input_field" />
                <label>Kod i Miejscowość  </label>  
                <div class="flex_auto main_input_field" > 
                    <FormInput :readonly="props.readonly" :value="kod   " auto style="width: 7ch" class="nogrow" /> 
                    <FormInput :readonly="props.readonly" :value="miasto" auto /> 
                </div>
                <label>NIP                </label>  <FormInput :readonly="props.readonly" :value="nip   " auto />
                <label>wpisał             </label>  <FormInput :readonly="props.readonly" :value="kto   " auto />
                <label>Telefon            </label>  <FormInput :readonly="props.readonly" :value="tele1 " auto />
                <label>dnia               </label>  <FormInput :readonly="props.readonly" :value="kiedy " auto />
                <label>Drugi Telefon      </label>  <FormInput :readonly="props.readonly" :value="tele2 " auto />
                <label>ID                 </label>  <FormInput readonly                   :value="id    " auto />
                <label>stały upust        </label>  <FormInput :readonly="props.readonly" :value="upust " auto />

                <fieldset class="subform_cars_field">
                    <legend>{{props.force_car_id !== undefined ? "Samochód" : "Samochody Klienta"}}</legend>
                    <SamochodyKlientow 
                        :use_src="src_car"
                        :id_klienta="props.force_car_id ? undefined : param_id_klienta"
                        :readonly="props.readonly"
                        :force_car_id="props.force_car_id"
                    />
                </fieldset>
            </div>
            

            <fieldset class="zlecenia" :style="{display: show_zlecenia ? 'unset' : 'none'}" v-if="!props.no_zlec">
                <legend>Zlecenia Naprawy</legend>
                <ZleceniaNaprawy
                    ref="zlecenia_form"
                    :use_src="src_zlecenia"
                    :id_klienta="param_id_klienta"
                    :id_samochodu="param_id_samochodu"
                />
                
            </fieldset>

        </form>


        <QuerySourceOffsetScroller
            v-if="props.force_klient_id === undefined"
            :src="src"
            @error="handle_err"
            insertable
            saveable
        />
        
    </div>

</template>

<style scoped>

    .print_render {
        display: none;
    }

    .grid {
        padding: 1px 10px;
        grid: repeat(8, auto) auto / auto [fields-start] 1fr auto 1fr  [fields-end];
        gap: 1px 2px;
        align-items: stretch;
        text-wrap: nowrap;
        justify-content: start;
    }
    .grid > :deep(label) {
        align-self: center;
    }

    .grid > :deep(.main_input_field){
        grid-column: fields-start / fields-end;
    }

    .grid > :deep(.subform_cars_field) {
        grid-column: 1 / -1;
        align-self: center;
    }

    fieldset {
        padding: 0px;
    }

    .zlecenia {
        flex-grow: 30;
    }
    

</style>

<style>


</style>