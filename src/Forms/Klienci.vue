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
        ["`NAZWA`",               "NAZWA"               ],
        ["`odbierający fakturę`", "ODBIERAJĄCY FAKTURĘ" ],
        ["`MIASTO`",              "MIASTO"              ],
        ["`ULICA`",               "ULICA"               ],
        ["`KOD_POCZT`",           "KOD"                 ],
        ["`NIP`",                 "NIP"                 ],
        ["`TELEFON1`",            "TELEFON"             ],
        ["`TELEFON2`",            "TELEFON2"            ],
        ["`KTO`",                 "wpisał"              ],
        ["`KIEDY`",               "dnia"                ],
    ],
    query_from: "`klienci`",
}



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

        <div class="content">
            <form ref="form_elem" class="form">

                <QueryViewerOpenBtn v-bind="find_options" :scroller="scroller" /> <span c="2"></span>
                <span>NAZWA              </span>  <FormInput :value="nazwa "  nonull c="2"/>
                <span>ODBIERAJĄCY FAKTURĘ</span>  <FormInput :value="odbier"         c="2"/>
                <span>ULICA i NR DOMU    </span>  <FormInput :value="ulica "  nonull c="2"/>
                <span>KOD i MIEJSCOWOŚĆ  </span>  <div class="addr_div" c="2"> 
                    <FormInput :value="kod   "  nonull /> 
                    <FormInput :value="miasto"  nonull /> 
                </div>
                <span>NIP                </span>  <FormInput :value="nip   "         />
                <fieldset r="7">
                    <legend>Samochody Klienta</legend>
                    <SamochodyKlientow 
                    :parent_dataset="dataset"
                    :id_klienta="id_ref"
                    />
                </fieldset>
                <span>TELEFON            </span>  <FormInput :value="tele1 "         />
                <span>DRUGI TELEFON      </span>  <FormInput :value="tele2 "         />
                <span c="2">&nbsp;</span>
                <span>wpisał             </span>  <FormInput :value="kto   "         />
                <span>dnia               </span>  <FormInput :value="kiedy " type="date" />
                <span>stały upust        </span>  <FormInput :value="upust "         />

            </form>
        </div>
        <QueryFormScrollerDataset
        :query_from="scroller_query_from"
        :datasets="[dataset]"
        @error="handle_err"
        insertable
        ref="scroller"/> 
        
    </div>

</template>

<style scoped>

    .form {
        justify-self: start;
        display: grid;
        grid: auto / auto auto 1fr;
        gap: 1px 2px;
        align-items: center;
        justify-items: left;
        justify-content: left;
        /* width: 100%; */
    }

    .form > :deep(input) ,
    .form > :deep(fieldset) ,
    .form > :deep(div) {
        justify-self: stretch;
    }

    fieldset {
        padding: 0px;
    }

    .form > :deep(*[c="2"]) {
        grid-column: span 2;
    }
    .form > :deep(*[r="2"]) {
        grid-row: span 2;
    }
    .form > :deep(*[r="7"]) {
        grid-row: span 7;
    }

    .addr_div {
        display: flex;
    }
    .addr_div > :deep( *:nth-child(1) ) {
        width: 7ch; 
    }
    .addr_div > :deep( *:nth-child(2) ) {
        flex-grow: 1; 
    }

    

</style>

<style>


</style>