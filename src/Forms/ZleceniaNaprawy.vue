<script setup>
//@ts-check

import {FormInput, FormEnum, FormCheckbox} from '../components/Controls';

import useMainMsgManager from '../components/Msg/MsgManager';
import useMainFWManager from '../components/FloatingWindows/FWManager';

import { FormDefaultProps, FormQuerySourceSingle } from '../components/Dataset';
import QuerySourceOffsetScroller from '../components/Scroller/QuerySourceOffsetScroller.vue';

import Klienci from './Klienci.vue';

import ReportPreparer from '../Reports/ReportPreparer.vue';
import RepZlecenieNaprawy from '../Reports/RepZlecenieNaprawy.vue';

import ZleceniaNaprawy_Czesci from './ZleceniaNaprawy_Czesci.vue';

import { ref, computed} from 'vue';
import { CREATE_FORM_QUERY_SOURCE_IN_COMPONENT } from './FormCommon';
import { date_now, use_datetime_now } from '../utils';
import { FormParamProp, param_from_prop } from '../components/Dataset';
import useWarsztatDatabase from '../DBStructure/db_warsztat_structure';


const props = defineProps({
    ...FormDefaultProps,
    id_klienta:   FormParamProp,
    id_samochodu: FormParamProp,
    show_clients: Boolean
});

// console.log("START_PROPS",typeof props.id_klienta, typeof props.id_samochodu,  props.id_klienta, props.id_samochodu, props);


const msgManager = useMainMsgManager();
const fwManager  = useMainFWManager();

const db = useWarsztatDatabase();
const TAB  = db.TABS.zlecenia_naprawy;
const COLS = TAB.cols;

// #	ID	ID klienta	ID samochodu	data otwarcia	        data zamknięcia	        zysk z części	zysk z robocizny	mechanik prowadzący	% udziału	pomocnik 1	  % udziału p1	pomocnik 2	% udziału p2	zgłoszone naprawy	                                    uwagi o naprawie
// 0:	1	92	        17	            1998-09-02 00:00:00	    1947-01-12 00:00:00	    0.00	        0.00	            Dąbrowski Stanisław	0	        ~NULL~	      0	            ~NULL~	    0	            PINELES Naprawa blacharska przedniej cząści samochodu	1 2 3


const src  = CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, {on_error: handle_err});
src.set_from_with_deps(TAB);

const show_only_open = ref(props.show_clients);
const show_only_open_quard = computed(() => show_only_open.value ? 0 : 1);

const param_id_klienta = param_from_prop(props, 'id_klienta');
const param_id_car     = param_from_prop(props, 'id_samochodu');

const id         = src.auto_add_value_synced(COLS.ID,                                             );
const id_klienta = src.auto_add_value_synced(COLS.ID_klienta,           {param: param_id_klienta} );
const id_car     = src.auto_add_value_synced(COLS.ID_samochodu,         {param: param_id_car}     );

const data_otw   = src.auto_add_value_synced(COLS.data_otwarcia,        {default: use_datetime_now()} );
const data_zamk  = src.auto_add_value_synced(COLS.data_zamknięcia,                            );
const zgloszenie = src.auto_add_value_synced(COLS.zgłoszone_naprawy,                          );
const uwagi      = src.auto_add_value_synced(COLS.uwagi_o_naprawie,                           );

const prow       = src.auto_add_value_synced(COLS.mechanik_prowadzący,                        );
const pom1       = src.auto_add_value_synced(COLS.pomocnik_1,                                 );
const pom2       = src.auto_add_value_synced(COLS.pomocnik_2,                                 );
const prow_p     = src.auto_add_value_synced(COLS['%_udziału'],         {default: 0}          );
const pom1_p     = src.auto_add_value_synced(COLS['%_udziału_p1'],      {default: 0}          );
const pom2_p     = src.auto_add_value_synced(COLS['%_udziału_p2'],      {default: 0}          );
const zysk_rob   = src.auto_add_value_synced(COLS.zysk_z_robocizny,     {default: 0}          );
const zysk_cz    = src.auto_add_value_synced(COLS.zysk_z_części,        {default: 0}          );

src.add_where([show_only_open_quard] ,`OR`, COLS.data_zamknięcia.get_full_sql(), 'IS NULL');

const param_id_zlec = src.get(COLS.ID);

const param_force_klient_id = src.get(COLS.ID_klienta);
const param_force_car_id    = src.get(COLS.ID_samochodu);


function handle_err(/**@type {Error} */ err) {
    msgManager.postError(err);
}

const RepZlecenieNaprawy_ref = ref(/**@type {ReportPreparer?} */ (null));
function open_print_window() {
    RepZlecenieNaprawy_ref.value?.update_and_open(true).catch(handle_err);
}

function open_czesci_window() {
    const title = "Części - Zlecenie nr " + param_id_zlec.get_value();
    return fwManager.open_or_focus_window(title, ZleceniaNaprawy_Czesci, {
        id_zlecenia: param_id_zlec
    });
}

defineExpose({
    src
});

</script>


<template>

    <div class="form_container" :class="src.form_style.value">

        <form class="form form_content" :ref="e => src.assoc_form(e)">
            
            <div class="sidebar" v-if="props.show_clients">
                <div>
                    <div
                        class="button"
                        @click="e => {
                            src.try_perform_and_update_confirmed(() => show_only_open = !show_only_open);
                        }"
                    >
                        {{ show_only_open ? "Pokarz wszystkie zlecenia" : "Pokarz tylko otwarte zlecenia" }}
                    </div>
                </div>
                <fieldset>
                    <legend>Klient</legend>
                    <Klienci 
                        no_zlec
                        :force_klient_id="param_force_klient_id"
                        :force_car_id="param_force_car_id"
                        readonly
                    />
                </fieldset>
            </div>

            <div class="zlecenia_container">

                <div class="flex_auto vert">
                    <div>
                        <label>nr zlecenia</label>
                        <FormInput :value="id"        auto readonly style="width: 10ch" />
                    </div>
                    <div>
                        <label>data otwarcia</label>
                        <FormInput :value="data_otw"  auto />
                    </div>
                    <div v-if="data_zamk.get_local() !== null">
                        <label>data zamknięcia</label>
                        <FormInput :value="data_zamk" auto readonly />
                    </div>
                    <div class="big" v-else>
                        OTWARTE
                    </div>
                </div>

                <div class="subheader flex_auto">
                    <div class="udzialy grid">
                        <div>Adres e-mail</div> <FormInput :value="prow" auto/> <FormInput auto :value="prow_p" nospin min="0" max="100"/> <span>%</span>
                        <div>pomocnik 1</div>   <FormInput :value="pom1" auto/> <FormInput auto :value="pom1_p" nospin min="0" max="100"/> <span>%</span>
                        <div>pomocnik 2</div>   <FormInput :value="pom2" auto/> <FormInput auto :value="pom2_p" nospin min="0" max="100"/> <span>%</span>
                    </div>
                    <div class="buttons">
                        <img src="./../assets/icons/document.svg" class="button" @click="open_print_window"/>
                        <div class="button" @click="open_czesci_window">CZĘŚCI</div>
                        <!-- <div>Części</div>
                        <div>Czynności</div> -->
                    </div>
                </div>

                <label>Zgłoszenie do naprawy</label>
                <FormInput :value="zgloszenie" auto class="grow" textarea/>
                
                <label>Uwagi</label>
                <FormInput :value="uwagi" auto class="grow" textarea/>
            </div>
        </form>

        <QuerySourceOffsetScroller
            :src="src"
            :insertable="!props.show_clients"
            saveable
            @error="handle_err"
        />

        
        <ReportPreparer
            ref="RepZlecenieNaprawy_ref"
            :rep="RepZlecenieNaprawy"
            :id_zlecenia="param_id_zlec"
        />
        
    </div>

</template>

<style scoped>

    /* .form_container {
        width: 100%;
    } */

    .form {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: stretch;
    }

    .sidebar {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }
    .button {
        padding: 3px;
        margin: 0px 3px;
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
    .vert .big {
        display: block;
        text-align: center;
    }

    .big {
        font-size: 2em;

    }

    .zlecenia_container {
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-around;
    }

    .zlecenia_container > :deep(.grow) {
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