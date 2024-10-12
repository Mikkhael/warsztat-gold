<script setup>
//@ts-check

// import { Dataset, DVUtil, QueryBuilder } from '../components/Dataset/Dataset';
import {FormInput, FormEnum} from '../components/Controls';

import useMainFWManager from '../components/FloatingWindows/FWManager';
import useMainMsgManager from '../components/Msg/MsgManager';

import QueryViewerOpenBtn from '../components/QueryViewer/QueryViewerOpenBtn.vue';
// import QueryFormScrollerDataset from '../components/QueryFormScrollerDataset.vue';


import SamochodyKlientow from './SamochodyKlientow.vue';
import ZleceniaNaprawy from './ZleceniaNaprawy.vue';

import {onMounted, ref, watch, computed, readonly, nextTick} from 'vue';
import { init_form_parent_window } from './FormCommon';
import { datetime_now } from '../utils';


const props = defineProps({
    parent_window: {
        /**@type {import('vue').PropType<import('../components/FloatingWindows/FWManager').FWWindow>} */
        type: Object,
        required: false
    },
    dataset: {
        /**@type {import('vue').PropType<import('../components/Dataset/Dataset').Dataset>} */
        type: Object,
        required: false
    },
});

const msgManager = useMainMsgManager();


// #	ID	NAZWA MIASTO ULICA KOD_POCZT TELEFON1  TELEFON2	NIP KTO	KIEDY UPUST	odbierający fakturę	list
// #	ID	NAZWA	                                                    MIASTO	    ULICA	        KOD_POCZT	TELEFON1	    TELEFON2	NIP	            KTO	KIEDY	            UPUST	odbierający fakturę	list
// 0:	1	Katowickie Zakłady Chemii Gospodarczej POLENA-SAWONA sp.zoo	Katowice	Pośpiecha 7/9	40-852	    254-50-77 w 337	~NULL~	    634-019-75-42	kot	1997-03-06 00:00:00	0	    Bąk Danuta	        1
const form     = ref();
const scroller = ref();

const samochody_form = ref();
const zlecenia_form  = ref();

const dataset     = new Dataset();
const index       = dataset.get_index_ref();
const insert_mode = dataset.get_insert_mode_ref();

const car_dataset  =     dataset.create_sub_dataset("car");
const zlec_dataset = car_dataset.create_sub_dataset("zlec");

const src  = dataset.create_source_query();
const sync = dataset.create_table_sync('klienci');

const id     = dataset.create_value_raw   ("ID",                      null,           src);
const nazwa  = dataset.create_value_synced("NAZWA",                   null,           src, sync);
const miasto = dataset.create_value_synced("MIASTO",                  null,           src, sync);
const ulica  = dataset.create_value_synced("ULICA",                   null,           src, sync);
const kod    = dataset.create_value_synced("KOD_POCZT",               null,           src, sync);
const tele1  = dataset.create_value_synced("TELEFON1",                null,           src, sync);
const tele2  = dataset.create_value_synced("TELEFON2",                null,           src, sync);
const nip    = dataset.create_value_synced("NIP",                     null,           src, sync);
const odbier = dataset.create_value_synced("odbierający fakturę",     null,           src, sync);
const kto    = dataset.create_value_synced("KTO",                     "Gold",         src, sync);
const kiedy  = dataset.create_value_synced("KIEDY",                   datetime_now(), src, sync); // TODO make accual current time, not start of app time
const upust  = dataset.create_value_synced("UPUST",                   0,              src, sync);
const list   = dataset.create_value_synced("list",                    null,           src, sync);

const id_ref = id.as_ref_local();
const id_samochodu = car_dataset.get('ID');

// watch(id_samochodu, x => {
//     console.log('ID SAM', x);
// })

console.log(datetime_now());


sync.add_primary('ID', id);

const query = new QueryBuilder(dataset, 'ID');
query.set_from_table('klienci');

query.set_source_query_index(src);
const scroller_query = query.get_scroller_query();
const viewwer_query  = query.get_viewer_query();


// src.set_body_query_and_finalize(['FROM `klienci` WHERE `ID` = ', index]);
// src.set_body_query_and_finalize(DVUtil.sql_parts_ref(['FROM `klienci` WHERE `ID` = ', index]));
// const scroller_query_from = '`klienci`';


// FIND

const find_options = readonly({
    query_select_fields: [
        ["`ID`",],
        ["`NAZWA`",               "Nazwa"               ],
        ["`odbierający fakturę`", "Odbierający Fakturę" ],
        ["`MIASTO`",              "Miasto"              ],
        ["`ULICA`",               "Ulica"               ],
        ["`KOD_POCZT`",           "Kod"                 ],
        ["`NIP`",                 "NIP"                 ],
        ["`TELEFON1`",            "Telefon"             ],
        ["`TELEFON2`",            "Telefon2"            ],
        ["`KTO`",                 "wpisał"              ],
        ["`KIEDY`",               "dnia"                ],
    ],
    ...viewwer_query
});

const find_by_car_options = {
    query_select_fields: [
        ["`ID klienta`"],
        ["`ID`"],
        // ["`ID`", 'ID samochodu'],
        // ["row_number() OVER (PARTITION BY `ID klienta`)", 'offset'],
        ["`nr rej`",      "Nr Rej."],
        ["`marka`",       "Marka"],
        ["`model`",       "Model"],
        ["`nr silnika`",  "Nr Silnika"],
        ["`nr nadwozia`", "Nr Nadwozia"],
    ],
    query_from: "`samochody klientów`",
};
const find_by_zlec_options = {
    query_select_fields: [
        ["`ID klienta`"],
        ["`ID samochodu`"],
        ["`ID`",                'ID zlecenia'],
        ["`data otwarcia`",     'Otwarcie'],
        ["`data zamknięcia`",   'Zamknięcie'],
        ["`zgłoszone naprawy`", 'Zgłoszenie'],
        ["`uwagi o naprawie`",  'Uwagi'],
    ],
    query_from: "`zlecenia naprawy`",
};

const show_zlecenia = ref(true); // TODO change to false in final version
function click_zlecenia(){
    show_zlecenia.value = !show_zlecenia.value;
    nextTick().then(() => {
        props.parent_window?.box.resize_to_content(true);
    });
}

async function handle_select_by_car(columns, rows, offset) {
    // await samochody_form.value.scroller.goto(rows[1]);
    await samochody_form.value.goto_by_id(rows[1]);
}

async function handle_select_by_zlec(columns, rows, offset) {
    await samochody_form.value.goto_by_id(rows[1]);
    await zlecenia_form.value.goto_by_id(rows[2]);
}


onMounted(() => {
    init_form_parent_window([dataset], props);
});


function handle_err(/**@type {Error} */ err) {
    msgManager.postError(err);
}

defineExpose({
    dataset
});

</script>


<template>

    <div class="form_container" :class="dataset.form_container_classes">

        <form ref="form" class="form form_content flex_auto">
            
            <div class="grid">

                <fieldset class="subform_cars_field">
                    <legend>Samochody Klienta</legend>
                    <SamochodyKlientow 
                        ref="samochody_form"
                        :dataset="car_dataset"
                        :id_klienta="id_ref"
                    />
                </fieldset>
                
                <div class="row flex_auto">
                    <div>
                        <QueryViewerOpenBtn v-bind="find_options" :scroller="scroller" />
                        Znajdź Klienta
                    </div>
                    <div>
                        <QueryViewerOpenBtn v-bind="find_by_car_options" :scroller="scroller" @select="handle_select_by_car"/>
                        Znajdź Samochód
                    </div>
                    <div>
                        <QueryViewerOpenBtn v-bind="find_by_zlec_options" :scroller="scroller" @select="handle_select_by_zlec"/>
                        Znajdź Zlecenie
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
                <ZleceniaNaprawy 
                    ref="zlecenia_form"
                    :dataset="zlec_dataset"
                    :id_klienta="id_ref"
                    :id_samochodu="id_samochodu"
                />
                
            </fieldset>

        </form>

        <QueryFormScrollerDataset
        v-bind="scroller_query"
        :datasets="[dataset]"
        @error="handle_err"
        insertable
        ref="scroller"/> 
        
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