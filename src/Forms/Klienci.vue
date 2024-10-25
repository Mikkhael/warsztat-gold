<script setup>
//@ts-check

import {FormInput, FormEnum} from '../components/Controls';

import useMainMsgManager from '../components/Msg/MsgManager';

import QueryViewerOpenBtn from '../components/QueryViewer/QueryViewerOpenBtn.vue';


import SamochodyKlientow from './SamochodyKlientow.vue';
import ZleceniaNaprawy from './ZleceniaNaprawy.vue';

import RepZlecenieNaprawy from '../Reports/RepZlecenieNaprawy.vue';

import {onMounted, onUnmounted, ref, nextTick} from 'vue';
import { init_form_parent_window, standart_form_value_routine, standard_QV_select, CREATE_FORM_QUERY_SOURCE_IN_COMPONENT } from './FormCommon';
import { datetime_now } from '../utils';
import { FormQuerySource } from '../components/Dataset';
import useWarsztatDatabase from '../DBStructure/db_warsztat_structure';
import QuerySourceOffsetScroller from '../components/Scroller/QuerySourceOffsetScroller.vue';
import useMainFWManager from '../components/FloatingWindows/FWManager';


const props = defineProps({
    parent_window: {
        /**@type {import('vue').PropType<import('../components/FloatingWindows/FWManager').FWWindow>} */
        type: Object,
        required: false
    }
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

const src  = CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, handle_err);
const sync = src.dataset.get_or_create_sync(db.TABS.klienci);

const src_car      = new FormQuerySource();
const src_zlecenia = new FormQuerySource();

// TODO automate
src.add_table_dep(db.TABS.klienci);
src.add_from('`klienci`');

// TODO
// const car_dataset  =     dataset.create_sub_dataset("car");
// const zlec_dataset = car_dataset.create_sub_dataset("zlec");




const id     = standart_form_value_routine(src, "ID",                  {sync, primary: true});
const nazwa  = standart_form_value_routine(src, "NAZWA",               {sync});
const miasto = standart_form_value_routine(src, "MIASTO",              {sync});
const ulica  = standart_form_value_routine(src, "ULICA",               {sync});
const kod    = standart_form_value_routine(src, "KOD_POCZT",           {sync});
const tele1  = standart_form_value_routine(src, "TELEFON1",            {sync});
const tele2  = standart_form_value_routine(src, "TELEFON2",            {sync});
const nip    = standart_form_value_routine(src, "NIP",                 {sync});
const odbier = standart_form_value_routine(src, "odbierający fakturę", {sync});
const kto    = standart_form_value_routine(src, "KTO",                 {sync, default: "Gold"});
const kiedy  = standart_form_value_routine(src, "KIEDY",               {sync, default: datetime_now()}); // TODO make accual current time, not start of app time
const upust  = standart_form_value_routine(src, "UPUST",               {sync, default: 0});
const list   = standart_form_value_routine(src, "list",                {sync});


// TODO
// const viewwer_query  = query.get_viewer_query(); 


// FIND

/**@typedef {import('../components/QueryViewer/QueryViewerOpenBtn.vue').QueryViwerQueryParams} QueryViewerQueryParams*/

/**@type {QueryViewerQueryParams} */
const find_query = {
    from: "`klienci`",
    select: [
        [["`ID`",                  ], "ID"],
        [["`NAZWA`",               ], "Nazwa"               ],
        [["adres", '(ULICA || ", " || MIASTO || " " || KOD_POCZT)'], "Adres"],
        [["`NIP`",                 ], "NIP"                 ],
        [["`TELEFON1`",            ], "Telefon"             ],
        [["`TELEFON2`",            ], "Telefon 2"           ],
        [["`odbierający fakturę`", ], "Odbierający Fakturę" ],
        [["`KTO`",                 ], "wpisał"              ],
        [["`KIEDY`",               ], "dnia"                ],
    ]
};
const find_query_handler = standard_QV_select([[src, 0]], handle_err);

/**@type {QueryViewerQueryParams} */
const find_query_car = {
    from: "`samochody klientów` as s JOIN `klienci` as k ON k.`ID` = s.`ID klienta`",
    select: [
        [['k.`ID`']],
        [['s.`ID`'], 'ID'],

        [['nr rej'],      'Nr Rej.'],
        [['NAZWA'],       'Klient'],
        [['marka'],       'Marka'],
        [['model'],       'Model'],
        [['nr silnika'],  'Nr Silnika'],
        [['nr nadwozia'], 'Nr Nadwozia'],
    ]
};
const find_query_car_handler = standard_QV_select([[src, 0], [src_car, 1]], handle_err);

/**@type {QueryViewerQueryParams} */
const find_query_zlec = {
    from: "`zlecenia naprawy` as z JOIN `klienci` as k ON k.`ID` = z.`ID klienta` JOIN `samochody klientów` as s ON s.`ID` = z.`ID samochodu`",
    select: [
        [['k.`ID`']],
        [['s.`ID`']],
        [['z.`ID`'],            'Nr Zlecenia'],
        [["data otwarcia"],     'Otwarcie'],
        [["data zamknięcia"],   'Zamknięcie'],
        [['NAZWA'],             'Klient'],
        [['nr rej'],            'Nr Rej.'],
        [["zgłoszone naprawy"], 'Zgłoszenie'],
        [["uwagi o naprawie"],  'Uwagi'],
    ]
};
const find_query_zlec_handler = standard_QV_select([[src, 0], [src_car, 1], [src_zlecenia, 2]], handle_err);

const show_zlecenia = ref(true); // TODO change to false in final version
function click_zlecenia(){
    show_zlecenia.value = !show_zlecenia.value;
    nextTick().then(() => {
        props.parent_window?.box.resize_to_content(true);
    });
}

const repZlecenieNaprawy_ref = ref();
function on_open_print_window_zlec() {

    /**@type {HTMLElement} */
    const page = repZlecenieNaprawy_ref.value;
    console.log('PAGE', page);
    const win  = window.open('about:blank', 'printwindow');
    if(!win) {
        throw new Error("Nie można otworzyć okna drukowania");
    }
    win.document.head.innerHTML = document.head.innerHTML;
    win.document.body.innerHTML = page.innerHTML;

    win.print();
}


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

                <fieldset class="subform_cars_field">
                    <legend>Samochody Klienta</legend>
                    <SamochodyKlientow 
                        :use_src="src_car"
                        :id_klienta="src.get('ID')"
                    />
                    <!-- <input type="text" v-model="test_ref">
                    <SamochodyKlientow 
                        :id_klienta="test_ref"
                    /> -->
                </fieldset>
                
                <div class="row flex_auto">
                    <div>
                        <QueryViewerOpenBtn :query="find_query" @select="find_query_handler" text="Znajdź Klienta" />
                    </div>
                    <div>
                        <QueryViewerOpenBtn :query="find_query_car" @select="find_query_car_handler" text="Znajdź Samochód" />
                    </div>
                    <div>
                        <QueryViewerOpenBtn :query="find_query_zlec" @select="find_query_zlec_handler" text="Znajdź Zlecenie" />
                    </div>
                    <!-- <button @click.prevent="click_zlecenia">ZLECENIA</button> -->
                </div>

                <label>Nazwa              </label>  <FormInput :value="nazwa "  nonull :len="60" class="main_input_field" pattern="[^ś]*"/>
                <label>Odbierający Fakturę</label>  <FormInput :value="odbier"         :len="50" class="main_input_field"/>
                <label>Ulica i Nr Domu    </label>  <FormInput :value="ulica "  nonull :len="30" class="main_input_field"/>
                <label>Kod i Miejscowość  </label>  
                <div class="flex_auto main_input_field" > 
                    <FormInput :value="kod   "  nonull :len="10" style="width: 7ch" class="nogrow"/> 
                    <FormInput :value="miasto"  nonull :len="20" /> 
                </div>
                <label>NIP                </label>  <FormInput :value="nip   " :len="13"         />
                <label>Telefon            </label>  <FormInput :value="tele1 " :len="17"         />
                <label>Drugi Telefon      </label>  <FormInput :value="tele2 " :len="17"         />
                <div c="2"></div>
                <label>wpisał             </label>  <FormInput :value="kto   " :len="8"                />
                <label>dnia               </label>  <FormInput :value="kiedy "          type="date"    />
                <label>stały upust        </label>  <FormInput :value="upust "          type="integer" />
                <label>ID                 </label>  <FormInput :value="id    " readonly type="integer" />

            </div>

            <fieldset class="zlecenia" :style="{display: show_zlecenia ? 'unset' : 'none'}">
                <legend>Zlecenia Naprawy</legend>
                <ZleceniaNaprawy 
                    ref="zlecenia_form"
                    :use_src="src_zlecenia"
                    :id_klienta="src.get('ID')"
                    :id_samochodu="src_car.get('ID')"

                    @open_print_window_zlec="on_open_print_window_zlec"
                />
                
            </fieldset>

        </form>

        <QuerySourceOffsetScroller
            :src="src"
            @error="handle_err"
            insertable
            saveable
        />
        
        <div class="print_render" ref="repZlecenieNaprawy_ref">
            <RepZlecenieNaprawy 
                :src_klient="src"
                :src_car="src_car"
                :src_zlec="src_zlecenia"
            />
        </div>
    </div>

</template>

<style scoped>

    .print_render {
        display: none;
    }

    .grid {
        padding: 1px 10px;
        grid: repeat(13, 1fr) / auto [fields-start] auto [cars-start] 1fr [fields-end cars-end];
        gap: 1px 2px;
        align-items: center;
        text-wrap: nowrap;
        justify-content: start;
    }

    .grid > :deep(.main_input_field){
        grid-column: fields-start / fields-end;
    }

    .grid > :deep(.subform_cars_field) {
        grid-row: 6 / -1;
        grid-column: cars-start / cars-end;
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