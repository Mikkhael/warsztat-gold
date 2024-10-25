<script setup>
//@ts-check

// import { Dataset, DVUtil, QueryBuilder } from '../components/Dataset/Dataset';
import {FormInput, FormEnum} from '../components/Controls';

import useMainMsgManager from '../components/Msg/MsgManager';
import useMainFWManager from '../components/FloatingWindows/FWManager';

import { FormQuerySource } from '../components/Dataset';
import QuerySourceOffsetScroller from '../components/Scroller/QuerySourceOffsetScroller.vue';

// import QueryFormScrollerDataset from '../components/QueryFormScrollerDataset.vue';

import RepZlecenieNaprawy from '../Reports/RepZlecenieNaprawy.vue';

import {onMounted, ref, toRef, readonly, watch} from 'vue';
import { CREATE_FORM_QUERY_SOURCE_IN_COMPONENT, init_form_parent_window, standart_form_value_routine } from './FormCommon';
import { date_now } from '../utils';
import { FormParamProp, param_from_prop } from '../components/Dataset';
import useWarsztatDatabase from '../DBStructure/db_warsztat_structure';


const props = defineProps({
    parent_window: {
        /**@type {import('vue').PropType<import('../components/FloatingWindows/FWManager').FWWindow>} */
        type: Object,
        required: false
    },
    use_src: {
        /**@type {import('vue').PropType<FormQuerySource>} */
        type: Object,
        required: false
    },
    id_klienta:   FormParamProp,
    id_samochodu: FormParamProp,
});
const emit = defineEmits(['open_print_window_zlec']);

console.log("START_PROPS",typeof props.id_klienta, typeof props.id_samochodu,  props.id_klienta, props.id_samochodu, props);


const msgManager = useMainMsgManager();
const fwManager  = useMainFWManager();

const db = useWarsztatDatabase();

// #	ID	ID klienta	ID samochodu	data otwarcia	        data zamknięcia	        zysk z części	zysk z robocizny	mechanik prowadzący	% udziału	pomocnik 1	  % udziału p1	pomocnik 2	% udziału p2	zgłoszone naprawy	                                    uwagi o naprawie
// 0:	1	92	        17	            1998-09-02 00:00:00	    1947-01-12 00:00:00	    0.00	        0.00	            Dąbrowski Stanisław	0	        ~NULL~	      0	            ~NULL~	    0	            PINELES Naprawa blacharska przedniej cząści samochodu	1 2 3

const param_id_klienta = param_from_prop(props, 'id_klienta');
const param_id_car     = param_from_prop(props, 'id_samochodu');

const repZlecenieNaprawy_ref = ref();

const src  = CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, handle_err);
const sync = src.dataset.get_or_create_sync(db.TABS.zleceniaNaprawy);

src.add_table_dep(db.TABS.zleceniaNaprawy);
src.add_from('`zlecenia naprawy`');

// watch(props, (new_props) => {
//     console.log("NEW PROPS", new_props, param_id_klienta, param_id_car);
// })


const id         = standart_form_value_routine(src, "ID",                   {sync, primary: true} );
const id_klienta = standart_form_value_routine(src, "ID klienta",           {sync, param: param_id_klienta} );
const id_car     = standart_form_value_routine(src, "ID samochodu",         {sync, param: param_id_car}     );

const data_otw   = standart_form_value_routine(src, "data otwarcia",        {sync, default: date_now()} );
const data_zamk  = standart_form_value_routine(src, "data zamknięcia",      {sync}                      );
const zgloszenie = standart_form_value_routine(src, "zgłoszone naprawy",    {sync}                      );
const uwagi      = standart_form_value_routine(src, "uwagi o naprawie",     {sync}                      );

const prow       = standart_form_value_routine(src, "mechanik prowadzący",  {sync}                      );
const pom1       = standart_form_value_routine(src, "pomocnik 1",           {sync}                      );
const pom2       = standart_form_value_routine(src, "pomocnik 2",           {sync}                      );
const prow_p     = standart_form_value_routine(src, "% udziału",            {sync, default: 0}          );
const pom1_p     = standart_form_value_routine(src, "% udziału p1",         {sync, default: 0}          );
const pom2_p     = standart_form_value_routine(src, "% udziału p2",         {sync, default: 0}          );
const zysk_rob   = standart_form_value_routine(src, "zysk z robocizny",     {sync, default: 0}          );
const zysk_cz    = standart_form_value_routine(src, "zysk z części",        {sync, default: 0}          );


function handle_err(/**@type {Error} */ err) {
    msgManager.postError(err);
}

// TODO automate printing
function open_print_window() {

    emit('open_print_window_zlec');

    // fwManager.open_or_reopen_window('Zlecenie Naprawy - Drukuj', ZlecenieNaprawy,{
    //     dataset
    // });

    // /**@type {HTMLElement} */
    // const page = repZlecenieNaprawy_ref.value;
    // console.log('PAGE', page);
    // const win  = window.open('about:blank', 'printwindow');
    // win.document.head.innerHTML = document.head.innerHTML;
    // win.document.body.innerHTML = page.innerHTML;

    // win.print();
}


defineExpose({
    src
});

</script>


<template>

    <div class="form_container" :class="src.form_style.value">

        <form class="form form_content" :ref="e => src.assoc_form(e)">
            
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
                    <!-- <div>Części</div>
                    <div>Czynności</div> -->
                </div>
            </div>

            <label>Zgłoszenie do naprawy</label>
            <FormInput :value="zgloszenie" class="grow" textarea/>
            
            <label>Uwagi</label>
            <FormInput :value="uwagi" class="grow" textarea/>

        </form>

        <QuerySourceOffsetScroller
            :src="src"
            insertable
            saveable
            @error="handle_err"
        />
        
    </div>


    <!-- <div class="print_render" ref="repZlecenieNaprawy_ref">
        <RepZlecenieNaprawy 
            :dataset="src"
        />
    </div> -->

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