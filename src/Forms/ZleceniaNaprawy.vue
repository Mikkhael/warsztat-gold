<script setup>
//@ts-check

import { Dataset, DVUtil, QueryBuilder } from '../components/Dataset/Dataset';
import {FormInput, FormEnum} from '../components/Controls';

import useMainMsgManager from '../components/Msg/MsgManager';
import useMainFWManager from '../components/FloatingWindows/FWManager';

import QueryFormScrollerDataset from '../components/QueryFormScrollerDataset.vue';

import RepZlecenieNaprawy from '../Reports/RepZlecenieNaprawy.vue';

import {onMounted, ref, toRef, readonly, watch} from 'vue';
import { init_form_parent_window } from './FormCommon';
import { date_now } from '../utils';


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
    id_klienta: {
        type: Number,
        default: null,
        required: false   
    },
    id_samochodu: {
        type: Number,
        default: null,
        required: false   
    }
});

const msgManager = useMainMsgManager();
const fwManager  = useMainFWManager();

// #	ID	ID klienta	ID samochodu	data otwarcia	        data zamknięcia	        zysk z części	zysk z robocizny	mechanik prowadzący	% udziału	pomocnik 1	  % udziału p1	pomocnik 2	% udziału p2	zgłoszone naprawy	                                    uwagi o naprawie
// 0:	1	92	        17	            1998-09-02 00:00:00	    1947-01-12 00:00:00	    0.00	        0.00	            Dąbrowski Stanisław	0	        ~NULL~	      0	            ~NULL~	    0	            PINELES Naprawa blacharska przedniej cząści samochodu	1 2 3

const prop_id_klienta = toRef(props, 'id_klienta');
const prop_id_car     = toRef(props, 'id_samochodu');


const form     = ref();
const scroller = ref();

const repZlecenieNaprawy_ref = ref();

const dataset     = props.dataset ?? new Dataset();
// const index       = dataset.get_index_ref();
const offset      = dataset.get_offset_ref();
const insert_mode = dataset.get_insert_mode_ref();
dataset.assosiate_form(form);

const src  = dataset.create_source_query();
const sync = dataset.create_table_sync('zlecenia naprawy');

const id         = dataset.create_value_raw   ("ID",                  null,             src);
const id_klienta = dataset.create_value_raw   ("ID klienta",          prop_id_klienta,  src, sync);
const id_car     = dataset.create_value_raw   ("ID samochodu",        prop_id_car,      src, sync);

const data_otw   = dataset.create_value_synced("data otwarcia",            date_now(),     src, sync);
const data_zamk  = dataset.create_value_synced("data zamknięcia",          null,           src, sync);
const zysk_cz    = dataset.create_value_synced("zysk z części",            0,              src, sync);
const zysk_rob   = dataset.create_value_synced("zysk z robocizny",         0,              src, sync);
const prow       = dataset.create_value_synced("mechanik prowadzący",      null,           src, sync);
const prow_p     = dataset.create_value_synced("% udziału",                0,              src, sync);
const pom1       = dataset.create_value_synced("pomocnik 1",               null,           src, sync);
const pom1_p     = dataset.create_value_synced("% udziału p1",             0,              src, sync);
const pom2       = dataset.create_value_synced("pomocnik 2",               null,           src, sync);
const pom2_p     = dataset.create_value_synced("% udziału p2",             0,              src, sync);
const zgloszenie = dataset.create_value_synced("zgłoszone naprawy",        null,           src, sync);
const uwagi      = dataset.create_value_synced("uwagi o naprawie",         null,           src, sync);

sync.add_primary('ID', id);

const query = new QueryBuilder(dataset);
query.set_from_table('zlecenia naprawy');
query.add_simple_condition('ID klienta', prop_id_klienta, true);
query.add_simple_condition('ID samochodu', prop_id_car, true);

query.set_source_query_offset(src);
const scroller_query = query.get_scroller_query();

// src.set_body_query_and_finalize(DVUtil.sql_parts_ref([
//     'FROM `zlecenia naprawy` WHERE ', 
//           ' `ID klienta` = ',   prop_id_klienta,
//     ' AND `ID samochodu` = ', prop_id_car,
//     ` LIMIT 1 OFFSET `, offset
// ]));
// src.set_body_query_and_finalize([
//     'FROM `zlecenia naprawy` WHERE ', 
//           ' `ID klienta` = ',   prop_id_klienta,
//     ' AND `ID samochodu` = ', prop_id_car,
//     ` LIMIT 1 OFFSET `, offset
// ]);
// const scroller_query_from  = '`zlecenia naprawy`';
// const scroller_query_where = DVUtil.sql_parts_ref([
//           ' `ID klienta` = ', prop_id_klienta,
//     ' AND `ID samochodu` = ', prop_id_car,
// ]);

// watch(props, (new_props, old_props) => {
//     console.log('ZLECENIA PORPS', new_props, old_props);
// });


onMounted(() => {
    init_form_parent_window([dataset], props);
});


function handle_err(/**@type {Error} */ err) {
    msgManager.postError(err);
}

function open_print_window() {
    // fwManager.open_or_reopen_window('Zlecenie Naprawy - Drukuj', ZlecenieNaprawy,{
    //     dataset
    // });

    /**@type {HTMLElement} */
    const page = repZlecenieNaprawy_ref.value;
    console.log('PAGE', page);
    const win  = window.open('about:blank', 'printwindow');
    win.document.head.innerHTML = document.head.innerHTML;
    win.document.body.innerHTML = page.innerHTML;

    win.print();
}


defineExpose({
    dataset
});

</script>


<template>

    <div class="form_container">

        <form ref="form" class="form form_content" :class="{disabled: dataset.disabled.value}">
            
            <div class="flex_auto vert">
                <div>
                    <label>nr zlecenia</label>
                    <FormInput :value="id" readonly style="width: 10ch" />
                </div>
                <div>
                    <label>data otwarcia</label>
                    <FormInput :value="data_otw"  type="date" />
                </div>
                <div>
                    <label>data zamknięcia</label>
                    <FormInput :value="data_zamk" type="date" readonly />
                </div>
            </div>

            <div class="subheader flex_auto">
                <div class="udzialy grid">
                    <div>Adres e-mail</div> <FormInput :value="prow"/> <FormInput type="integer" :value="prow_p" nospin min="0" max="100"/> <span>%</span>
                    <div>pomocnik 1</div>   <FormInput :value="pom1"/> <FormInput type="integer" :value="pom1_p" nospin min="0" max="100"/> <span>%</span>
                    <div>pomocnik 2</div>   <FormInput :value="pom2"/> <FormInput type="integer" :value="pom2_p" nospin min="0" max="100"/> <span>%</span>
                </div>
                <div class="buttons">
                    <img src="./../assets/icons/document.svg" class="button" @click="open_print_window"/>
                    <div>Części</div>
                    <div>Czynności</div>
                </div>
            </div>

            <label>Zgłoszenie do naprawy</label>
            <FormInput :value="zgloszenie" class="grow" textarea/>
            
            <label>Uwagi</label>
            <FormInput :value="uwagi" class="grow" textarea/>

        </form>

        <QueryFormScrollerDataset simple
        v-bind="scroller_query"
        :datasets="[dataset]"
        @error="handle_err"
        insertable
        ref="scroller"/> 
        
    </div>


    <div class="print_render" ref="repZlecenieNaprawy_ref">
        <RepZlecenieNaprawy 
            :dataset="dataset"
        />
    </div>

</template>

<style scoped>

    /* .form_container {
        width: 100%;
    } */

    .print_render {
        display: none;
    }

    img{
        height: 7ch;
        width:  7ch;
        padding: 5px;
        box-sizing: border-box;
    }

    .buttons{
        display: flex;
        flex-direction: row;
        justify-content: space-around;
    }

    :deep(textarea) {
        resize: none;
    }

    .vert > * {
        display: flex;
        flex-direction: column;
    }

    .form {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-around;
    }

    .form > :deep(.grow) {
        flex-grow: 1;
    }

    .subheader {
        align-items: center;
    }
    .udzialy {
        grid-template-columns: auto auto 4ch auto ;
    }

</style>

<style>


</style>