<script setup>
//@ts-check

import {FormInput, FormEnum} from '../components/Controls';

import useMainMsgManager from '../components/Msg/MsgManager';

import QueryViewerOpenBtn from '../components/QueryViewer/QueryViewerOpenBtn.vue';


import SamochodyKlientow from './SamochodyKlientow.vue';
import ZleceniaNaprawy from './ZleceniaNaprawy.vue';

import {onMounted, onUnmounted, ref, nextTick} from 'vue';
import { init_form_parent_window, standart_form_value_routine, standard_QV_select } from './FormCommon';
import { datetime_now } from '../utils';
import { FormQuerySource } from '../components/Dataset';
import useWarsztatDatabase from '../DBStructure/db_warsztat_structure';
import QuerySourceOffsetScroller from '../components/Scroller/QuerySourceOffsetScroller.vue';


const props = defineProps({
    parent_window: {
        /**@type {import('vue').PropType<import('../components/FloatingWindows/FWManager').FWWindow>} */
        type: Object,
        required: false
    }
});

const msgManager = useMainMsgManager();


// #	ID	NAZWA MIASTO ULICA KOD_POCZT TELEFON1  TELEFON2	NIP KTO	KIEDY UPUST	odbierający fakturę	list
// #	ID	NAZWA	                                                    MIASTO	    ULICA	        KOD_POCZT	TELEFON1	    TELEFON2	NIP	            KTO	KIEDY	            UPUST	odbierający fakturę	list
// 0:	1	Katowickie Zakłady Chemii Gospodarczej POLENA-SAWONA sp.zoo	Katowice	Pośpiecha 7/9	40-852	    254-50-77 w 337	~NULL~	    634-019-75-42	kot	1997-03-06 00:00:00	0	    Bąk Danuta	        1
const form     = ref();
const scroller = ref();

const form_car  = ref();
const form_zlec = ref();

const db = useWarsztatDatabase();

const src  = new FormQuerySource();
const sync = src.dataset.get_or_create_sync(db.TABS.klienci);

const src_car = new FormQuerySource();

// TODO automate
src.add_table_dep(db.TABS.klienci);
src.add_from('`klienci`');

// TODO
// const car_dataset  =     dataset.create_sub_dataset("car");
// const zlec_dataset = car_dataset.create_sub_dataset("zlec");




const id     = standart_form_value_routine(src, "ID",                  {primary: true});
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
        [["`ID`",                  ]],
        [["`NAZWA`",               ], "Nazwa"               ],
        [["`odbierający fakturę`", ], "Odbierający Fakturę" ],
        [["`MIASTO`",              ], "Miasto"              ],
        [["`ULICA`",               ], "Ulica"               ],
        [["`KOD_POCZT`",           ], "Kod"                 ],
        [["`NIP`",                 ], "NIP"                 ],
        [["`TELEFON1`",            ], "Telefon"             ],
        [["`TELEFON2`",            ], "Telefon2"            ],
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
        [['s.`ID`']],

        [['nr rej'],      'Nr Rej.'],
        [['NAZWA'],       'Klient'],
        [['marka'],       'Marka'],
        [['model'],       'Model'],
        [['nr silnika'],  'Nr Silnika'],
        [['nr nadwozia'], 'Nr Nadwozia'],
    ]
};
const find_query_car_handler = standard_QV_select([[src, 0], [src_car, 1]], handle_err);

// const find_by_car_options = {
//     query_select_fields: [
//         ["`ID klienta`"],
//         ["`ID`"],
//         // ["`ID`", 'ID samochodu'],
//         // ["row_number() OVER (PARTITION BY `ID klienta`)", 'offset'],
//         ["`nr rej`",      "Nr Rej."],
//         ["`marka`",       "Marka"],
//         ["`model`",       "Model"],
//         ["`nr silnika`",  "Nr Silnika"],
//         ["`nr nadwozia`", "Nr Nadwozia"],
//     ],
//     query_from: "`samochody klientów`",
// };
// const find_by_zlec_options = {
//     query_select_fields: [
//         ["`ID klienta`"],
//         ["`ID samochodu`"],
//         ["`ID`",                'ID zlecenia'],
//         ["`data otwarcia`",     'Otwarcie'],
//         ["`data zamknięcia`",   'Zamknięcie'],
//         ["`zgłoszone naprawy`", 'Zgłoszenie'],
//         ["`uwagi o naprawie`",  'Uwagi'],
//     ],
//     query_from: "`zlecenia naprawy`",
// };

const show_zlecenia = ref(true); // TODO change to false in final version
function click_zlecenia(){
    show_zlecenia.value = !show_zlecenia.value;
    nextTick().then(() => {
        props.parent_window?.box.resize_to_content(true);
    });
}

// async function handle_select_by_car(columns, rows, offset) {
//     // await samochody_form.value.scroller.goto(rows[1]);
//     await samochody_form.value.goto_by_id(rows[1]);
// }

// async function handle_select_by_zlec(columns, rows, offset) {
//     await samochody_form.value.goto_by_id(rows[1]);
//     await zlecenia_form.value.goto_by_id(rows[2]);
// }


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

const test_ref = ref(88);

defineExpose({
    src
});

</script>


<template>

    <div class="form_container" :class="src.form_style.value">

        <form ref="form" class="form form_content flex_auto">
            
            <div class="grid">

                <fieldset class="subform_cars_field">
                    <legend>Samochody Klienta</legend>
                    <SamochodyKlientow 
                        :use_src="src_car"
                        :id_klienta="src.result['ID']"
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
                        <!-- <QueryViewerOpenBtn v-bind="find_by_car_options" :scroller="scroller" @select="handle_select_by_car"/>
                        Znajdź Samochód -->
                    </div>
                    <div>
                        <!-- <QueryViewerOpenBtn v-bind="find_by_zlec_options" :scroller="scroller" @select="handle_select_by_zlec"/>
                        Znajdź Zlecenie -->
                    </div>
                    <button @click.prevent="click_zlecenia">ZLECENIA</button>
                </div>

                <label>Nazwa              </label>  <FormInput :value="nazwa "  nonull :len="60" class="main_input_field"/>
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
                <label>dnia               </label>  <FormInput :value="kiedy "         type="date"    />
                <label>stały upust        </label>  <FormInput :value="upust "         type="integer" />

            </div>

            <fieldset class="zlecenia" :style="{display: show_zlecenia ? 'unset' : 'none'}">
                <legend>Zlecenia Naprawy</legend>
                <!-- <ZleceniaNaprawy 
                    ref="zlecenia_form"
                    :dataset="zlec_dataset"
                    :id_klienta="id_ref"
                    :id_samochodu="id_samochodu"
                /> -->
                
            </fieldset>

        </form>

        <QuerySourceOffsetScroller
            :src="src"
            @error="handle_err"
            insertable
            saveable
        />
        
    </div>

</template>

<style scoped>

    .grid {
        padding: 1px 10px;
        grid: repeat(12, 1fr) / auto [fields-start] auto [cars-start] 1fr [fields-end cars-end];
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