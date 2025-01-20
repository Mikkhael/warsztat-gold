<script setup>
//@ts-check

import {FormInput, FormEnum} from '../components/Controls';
import IconButton from '../components/Controls/IconButton.vue';

import useMainMsgManager from '../components/Msg/MsgManager';

import { QueryViewerSource } from '../components/QueryViewer/QueryViewer';
import QueryViewerAdvOpenBtn from '../components/QueryViewer/QueryViewerAdvOpenBtn.vue';


import SamochodyKlientow from './SamochodyKlientow.vue';
import ZleceniaNaprawy from './ZleceniaNaprawy.vue';

import {onMounted, onUnmounted, ref, nextTick, computed} from 'vue';
import { standard_QV_select, CREATE_FORM_QUERY_SOURCE_IN_COMPONENT } from './FormCommon';
import { use_datetime_now } from '../utils';
import { FormParamProp, FormDefaultProps, FormQuerySourceSingle, param_from_prop } from '../components/Dataset';
import useWarsztatDatabase from '../DBStructure/db_warsztat_structure';
import QuerySourceOffsetScroller from '../components/Scroller/QuerySourceOffsetScroller.vue';
import useMainFWManager from '../components/FloatingWindows/FWManager';
import ZleceniaNaprawyAdv from './ZleceniaNaprawyAdv.vue';
import ipc from '../ipc';


const props = defineProps({
    ...FormDefaultProps,
    force_klient_id: FormParamProp,
    force_car_id:    FormParamProp,
    no_zlec: Boolean,
    readonly:Boolean,
    minimal: Boolean,
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

const aux_info = ipc.GET_DB_INFO.supports_klient_custom_info() ?
    src.auto_add_value_synced(COLS.aux_info) :
    null;


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
const QVFactory_find_client_select = QueryViewerSource.create_default_select_handler([[src, COLS.ID]], handle_err, {focus_window: props.parent_window});


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
const QVFactory_find_car_select = QueryViewerSource.create_default_select_handler([[src, 0],[src_car,1]], handle_err, {focus_window: props.parent_window});


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
    src.auto_add_column('is_zlec_open',               {display: 'Czy Otwarte?', sql: `iif(${ZLEC_COLS.data_zamknięcia.get_full_sql()} IS NULL, 'Otwarte', 'Zamknięte')`});

    src.auto_add_column(ZLEC_COLS.zgłoszone_naprawy,  {display: 'Zgłoszenie'});
    src.auto_add_column(ZLEC_COLS.uwagi_o_naprawie,   {display: 'Uwagi'});
    src.set_order('is_zlec_open', 1);
    return src;
}
const QVFactory_find_zlec_select = QueryViewerSource.create_default_select_handler([[src, 0],[src_car,1],[src_zlecenia,2]], handle_err, {focus_window: props.parent_window});

const show_zlecenia = ref(true);
// function click_zlecenia(){
//     show_zlecenia.value = !show_zlecenia.value;
//     nextTick().then(() => {
//         props.parent_window?.box.resize_to_content(true);
//     });
// }

function handle_zlec_for_kli() {
    const klient_id    = id.get_cached();
    const klient_nazwa = nazwa.get_cached();
    const title = `Zlecenia dla Klienta '${klient_nazwa}'`;
    const window = fwManager.open_or_focus_window(title, ZleceniaNaprawyAdv, {
        category: "zlecenia_filtered",
        props: {
            only_for_klient_id: klient_id,
            summary_at_start: true,
            minimal: true,
        }
    });
    if(window) {
        nextTick(() => {
            window.box.slam_left_top().streach_vertical(0.95);
        });
    }
}
function handle_zlec_for_car() {
    const car_id    = src_car.get(db.TABS.samochody_klientów.cols.ID).get_value();
    const car_nrrej = src_car.get(db.TABS.samochody_klientów.cols.nr_rej).get_value();
    const title = `Zlecenia dla Samochodu '${car_nrrej}'`;
    const window = fwManager.open_or_focus_window(title, ZleceniaNaprawyAdv, {
        category: "zlecenia_filtered",
        props: {
            only_for_car_id: car_id,
            summary_at_start: true,
            minimal: true,
        }
    });
    if(window) {
        nextTick(() => {
            window.box.slam_left_top().streach_vertical(0.95);
        });
    }
}

function handle_err(/**@type {Error} */ err) {
    msgManager.postError(err);
}

defineExpose({
    src
});


const display_compact = computed(() => props.minimal && props.no_zlec);

</script>


<template>

    <div class="form_container" :class="src.form_style.value">

        <form onsubmit="return false" class="form form_content" :ref="e => src.assoc_form(e)" :class="{compact: display_compact}">
            
            <div class="grid">
                
                <div class="flex_auto a_find" v-if="!props.no_zlec">
                
                    <div>
                        <QueryViewerAdvOpenBtn 
                            :parent_window="props.parent_window"
                            text="Znajdź Klienta"
                            selectable
                            :src_factory="QVFactory_find_client" 
                                 @select="QVFactory_find_client_select"
                                 @error="handle_err" />
                    </div>
                    <div>
                        <QueryViewerAdvOpenBtn 
                            :parent_window="props.parent_window"
                            text="Znajdź Samochód"
                            selectable
                            :src_factory="QVFactory_find_car" 
                                 @select="QVFactory_find_car_select"
                                 @error="handle_err" />
                    </div>
                    <div>
                        <QueryViewerAdvOpenBtn 
                            :parent_window="props.parent_window"
                            text="Znajdź Zlecenie"
                            selectable
                            :src_factory="QVFactory_find_zlec" 
                                 @select="QVFactory_find_zlec_select"
                                 @error="handle_err" />
                    </div> 
               
                    <!-- <button type="button" @click.prevent="click_zlecenia">ZLECENIA</button> -->
                </div>

                <label class="l1">Nazwa              </label>  <FormInput :readonly="props.readonly" :value="nazwa " auto class="v1 main_input_field" />
                <label class="l2">Odbierający Fakturę</label>  <FormInput :readonly="props.readonly" :value="odbier" auto class="v2 main_input_field" />
                <label class="l3">Ulica i Nr Domu    </label>  <FormInput :readonly="props.readonly" :value="ulica " auto class="v3 main_input_field" />
                <label class="l4">Kod i Miejscowość  </label>  
                <div class="flex_auto v4 main_input_field" > 
                    <FormInput :readonly="props.readonly" :value="kod   " auto style="width: 7ch" class="nogrow" /> 
                    <FormInput :readonly="props.readonly" :value="miasto" auto /> 
                </div>
                <label class="l5" >NIP                </label>  <FormInput class="v5"  :readonly="props.readonly" :value="nip   " auto />
                <label class="l6" >wpisał             </label>  <FormInput class="v6"  :readonly="props.readonly" :value="kto   " auto />
                <label class="l7" >Telefon            </label>  <FormInput class="v7"  :readonly="props.readonly" :value="tele1 " auto />
                <label class="l8" >dnia               </label>  <FormInput class="v8"  :readonly="props.readonly" :value="kiedy " auto />
                <label class="l9" >Drugi Telefon      </label>  <FormInput class="v9"  :readonly="props.readonly" :value="tele2 " auto />
                <label class="lid">ID                 </label>  <FormInput class="vid" readonly                   :value="id    " auto />
                <!-- <label>stały upust        </label>  <FormInput :readonly="props.readonly" :value="upust " auto /> -->

                <label v-if="aux_info !== null" class="aux_info">
                    <div>Dodatkowe notatki</div>
                    <FormInput :readonly="props.readonly" :value="aux_info" auto textarea />
                </label>

                <fieldset class="a_car">
                    <legend>{{props.force_car_id !== undefined ? "Samochód" : "Samochody Klienta"}}</legend>
                    <SamochodyKlientow 
                        :use_src="src_car"
                        :id_klienta="props.force_car_id ? undefined : param_id_klienta"
                        :readonly="props.readonly"
                        :force_car_id="props.force_car_id"
                        :minimal="display_compact"
                    />
                </fieldset>
                
                <div class="sub_buttons">
                    <div></div>
                    <IconButton text="zlecenia klienta"   icon="filter" @click="handle_zlec_for_kli"/>
                    <IconButton text="zlecenia samochodu" icon="filter" @click="handle_zlec_for_car"/>
                </div>
            </div>
            

            <fieldset class="zlecenia" v-if="!props.no_zlec">
                <legend>Zlecenia Naprawy</legend>
                <ZleceniaNaprawy
                    :window="props.parent_window"
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

.form.compact fieldset {
    border: none;
    padding: 0px 3px;
}
.form.compact fieldset legend {
    display: none;
}

.a_find {grid-area: a_find;}
.a_car  {grid-area: a_car;}
.sub_buttons {grid-area: a_sub;}
.aux_info {grid-area: a_aux;}
.l1 {grid-area: l1;}   .grid > :deep(.v1 ) {grid-area: v1;}
.l2 {grid-area: l2;}   .grid > :deep(.v2 ) {grid-area: v2;}
.l3 {grid-area: l3;}   .grid > :deep(.v3 ) {grid-area: v3;}
.l4 {grid-area: l4;}   .grid > :deep(.v4 ) {grid-area: v4;}
.l5 {grid-area: l5;}   .grid > :deep(.v5 ) {grid-area: v5;}
.l6 {grid-area: l6;}   .grid > :deep(.v6 ) {grid-area: v6;}
.l7 {grid-area: l7;}   .grid > :deep(.v7 ) {grid-area: v7;}
.l8 {grid-area: l8;}   .grid > :deep(.v8 ) {grid-area: v8;}
.l9 {grid-area: l9;}   .grid > :deep(.v9 ) {grid-area: v9;}
.l9 {grid-area: l9;}   .grid > :deep(.v9 ) {grid-area: v9;}
.lid {grid-area: lid;} .grid > :deep(.vid) {grid-area: vid;}

.form.compact > .grid > .sub_buttons,
.form.compact > .grid > label,
.form.compact > .grid > :deep(.v2),
.form.compact > .grid > :deep(.v6),
.form.compact > .grid > :deep(.v7),
.form.compact > .grid > :deep(.v8),
.form.compact > .grid > :deep(.v9),
.form.compact > .grid > :deep(.vid) {
    display: none;
}
.form.compact > .grid > label.l5 {
    display: block;
}

    .form {
        display: grid;
        grid-template: auto / auto 1fr;
        /* display: flex;
        flex-direction: row;
        align-items: stretch; */
    }
    .form.compact {
        display: block;
    }

    .form > .grid {
        flex-grow: 1;

        padding: 1px 10px;
        gap: 1px 2px;
        text-wrap: nowrap;
        justify-content: stretch;
        align-content: stretch;
        align-items: stretch;

        grid-template: repeat(8, auto) 1fr repeat(2, auto) / auto auto auto 1fr;
        grid-template-areas: 
            "a_find a_find a_find a_find"
            "l1  v1 v1 v1"
            "l2  v2 v2 v2"
            "l3  v3 v3 v3"
            "l4  v4 v4 v4"
            "l5 v5   l6 v6"
            "l7 v7   l8 v8"
            "l9 v9   lid vid"
            "a_aux a_aux a_aux a_aux"
            "a_car a_car a_car a_car"
            "a_sub a_sub a_sub a_sub"
            ;
    }
    .form > .grid > label {
        align-self: center;
    }


    .form.compact > .grid {
        align-content: start;
        grid-template: auto / 1fr auto auto;
        grid-template-areas: 
            "v1 v1 v1 v1"
            "v3 v4 l5 v5"
            "a_car a_car a_car a_car";
    }

    fieldset {
        padding: 0px;
    }

    .aux_info {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        width: 100%;
        height: 100%;
    }
    .aux_info :deep(textarea){
        resize: none;
        flex-grow: 1;
    }
    .form.compact > .aux_info {
        display: none;
    }

    .sub_buttons {
        display: flex;
        flex-direction: row;
        justify-content: end;
    }

    .zlecenia {
        flex-grow: 20;
    }
    
    .form.compact {
        flex-direction: column;
    }


</style>

<style>


</style>