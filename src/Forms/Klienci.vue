<script setup>
//@ts-check

import { Dataset } from '../components/Dataset/Dataset';
import {FormInput, FormEnum} from '../components/Controls';

import useMainFWManager from '../components/FloatingWindows/FWManager';
import useMainMsgManager from '../components/Msg/MsgManager';

import QueryViewerOpenBtn from '../components/QueryViewer/QueryViewerOpenBtn.vue';
import QueryFormScrollerDataset from '../components/QueryFormScrollerDataset.vue';


import SamochodyKlientow from './SamochodyKlientow.vue';

import {onMounted, ref} from 'vue';


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

const root_container = ref();

const dataset = new Dataset();
const index   = dataset.get_index_ref();
dataset.assosiate_form(form);

const src  = dataset.create_source_query();
const sync = dataset.create_table_sync('samochody klientów');

const id     = dataset.create_value_raw   ("ID",                      null,         src);
const nazwa  = dataset.create_value_synced("NAZWA",                   null,         src, sync);
const miasto = dataset.create_value_synced("MIASTO",                  null,         src, sync);
const ulica  = dataset.create_value_synced("ULICA",                   null,         src, sync);
const kod    = dataset.create_value_synced("KOD_POCZT",               null,         src, sync);
const tele1  = dataset.create_value_synced("TELEFON1",                null,         src, sync);
const tele2  = dataset.create_value_synced("TELEFON2",                null,         src, sync);
const nip    = dataset.create_value_synced("NIP",                     null,         src, sync);
const odbier = dataset.create_value_synced("odbierający fakturę",     null,         src, sync);
const kto    = dataset.create_value_synced("KTO",                     "Gold",       src, sync);
const kiedy  = dataset.create_value_synced("KIEDY",                   new Date(),   src, sync);
const upust  = dataset.create_value_synced("UPUST",                   0,            src, sync);
const list   = dataset.create_value_synced("list",                    null,         src, sync);

const id_ref = id.as_ref_local();

sync.add_primary('ID', id);
src.set_body_query_and_finalize(['FROM `klienci` WHERE `ID` = ', index]);
const scroller_query_from = '`klienci`';

// FIND

const find_options = {
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
    query_from: "`klienci`",
}

const find_by_car_options = {
    query_select_fields: [
        // ["`ID`"],
        ["`ID klienta`"],
        ["`marka`",       "Marka"],
        ["`model`",       "Model"],
        ["`nr rej`",      "Nr Rej."],
        ["`nr silnika`",  "Nr Silnika"],
        ["`nr nadwozia`", "Nr Nadwozia"],
    ],
    query_from: "`samochody klientów`",
};



onMounted(() => {
    props.parent_window?.add_before_close(async (force) => {
        if(force) return false;
        if(dataset.is_changed()){
            const confirmed = await window.confirm('Posiadasz niezapisane zmiany. Czy chesz zamnknąć okno?');
            return !confirmed;
        }
        return false;
    });
    props.parent_window?.box.resize(undefined, root_container.value.clientHeight);
});


function handle_err(/**@type {Error} */ err) {
    msgManager.postError(err);
}

</script>


<template>

    <div ref="root_container">

        <form ref="form_elem" class="grid">
            

            <fieldset class="subform_cars_field">
                <legend>Samochody Klienta</legend>
                <SamochodyKlientow 
                    :parent_dataset="dataset"
                    :id_klienta="id_ref"
                />
            </fieldset>
            
            <div class="row flex_auto">
                <div>
                    <QueryViewerOpenBtn v-bind="find_options" :scroller="scroller" />
                    Znajdź Klienta
                </div>
                <div>
                    <QueryViewerOpenBtn v-bind="find_by_car_options" :scroller="scroller" />
                    Znajdź Klienta po Samochodzie
                </div>
            </div>

            <label>Nazwa              </label>  <FormInput :value="nazwa "  nonull class="main_input_field"/>
            <label>Odbierający Fakturę</label>  <FormInput :value="odbier"         class="main_input_field"/>
            <label>Ulica i Nr Domu    </label>  <FormInput :value="ulica "  nonull class="main_input_field"/>
            <label>Kod i Miejscowość  </label>  
            <div class="flex_auto main_input_field" > 
                <FormInput :value="kod   "  nonull style="width: 7ch" class="nogrow"/> 
                <FormInput :value="miasto"  nonull /> 
            </div>
            <label>NIP                </label>  <FormInput :value="nip   "         />
            <label>Telefon            </label>  <FormInput :value="tele1 "         />
            <label>Drugi Telefon      </label>  <FormInput :value="tele2 "         />
            <div c="2"></div>
            <label>wpisał             </label>  <FormInput :value="kto   "         />
            <label>dnia               </label>  <FormInput :value="kiedy " type="date" />
            <label>stały upust        </label>  <FormInput :value="upust "         />


        </form>
        <QueryFormScrollerDataset
        :query_from="scroller_query_from"
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
    

</style>

<style>


</style>