<script setup>
//@ts-check

import {FormInput, FormEnum} from '../components/Controls';

import useMainMsgManager from '../components/Msg/MsgManager';

import QueryViewerOpenBtn from '../components/QueryViewer/QueryViewerOpenBtn.vue';


import SamochodyKlientow from './SamochodyKlientow.vue';
import ZleceniaNaprawy from './ZleceniaNaprawy.vue';

import RepZlecenieNaprawy from '../Reports/RepZlecenieNaprawy.vue';

import {onMounted, onUnmounted, ref, nextTick} from 'vue';
import { standard_QV_select, CREATE_FORM_QUERY_SOURCE_IN_COMPONENT } from './FormCommon';
import { use_datetime_now } from '../utils';
import { FormParamProp, FormQuerySource, param_from_prop } from '../components/Dataset';
import useWarsztatDatabase from '../DBStructure/db_warsztat_structure';
import QuerySourceOffsetScroller from '../components/Scroller/QuerySourceOffsetScroller.vue';
import useMainFWManager from '../components/FloatingWindows/FWManager';


const props = defineProps({
    parent_window: {
        /**@type {import('vue').PropType<import('../components/FloatingWindows/FWManager').FWWindow>} */
        type: Object,
        required: false
    },
    readonly: {
        type: Boolean,
        default: false,
    },
    use_src: {
        /**@type {import('vue').PropType<FormQuerySource>} */
        type: Object,
        required: false
    },
    no_zlec: Boolean,
    force_klient_id: FormParamProp,
    force_car_id:    FormParamProp
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

const src  = CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, handle_err);
src.set_from_with_deps(TAB);

const src_car      = new FormQuerySource();
const src_zlecenia = new FormQuerySource();

const param_force_klient_id = param_from_prop(props, 'force_klient_id');

const id     = src.auto_form_value_synced(COLS.ID,                  {param: param_force_klient_id});
const nazwa  = src.auto_form_value_synced(COLS.NAZWA                );
const miasto = src.auto_form_value_synced(COLS.MIASTO               );
const ulica  = src.auto_form_value_synced(COLS.ULICA                );
const kod    = src.auto_form_value_synced(COLS.KOD_POCZT            );
const tele1  = src.auto_form_value_synced(COLS.TELEFON1             );
const tele2  = src.auto_form_value_synced(COLS.TELEFON2             );
const nip    = src.auto_form_value_synced(COLS.NIP                  );
const odbier = src.auto_form_value_synced(COLS.odbierający_fakturę  );
const kto    = src.auto_form_value_synced(COLS.KTO,                 {default: "Gold"});
const kiedy  = src.auto_form_value_synced(COLS.KIEDY,               {default: use_datetime_now()});
const upust  = src.auto_form_value_synced(COLS.UPUST,               {default: 0});
const list   = src.auto_form_value_synced(COLS.list                 );


const param_id_klienta   = src.get(COLS.ID);
const param_id_samochodu = src_car.get(db.TABS.samochody_klientów.cols.ID);

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