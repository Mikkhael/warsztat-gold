<script setup>
//@ts-check

// import { Dataset, DVUtil } from '../components/Dataset/Dataset';

import useMainMsgManager from '../components/Msg/MsgManager';



import {onMounted, ref, toRef, watch} from 'vue';
import { format_date_str_local } from '../utils';
import { FormParamProp, FormQuerySource, param_from_prop } from '../components/Dataset';
import { standard_form_auto_column_value } from '../Forms/FormCommon';
import useWarsztatDatabase from '../DBStructure/db_warsztat_structure';
import { standard_form_auto_synced_column_value } from '../Forms/FormCommon';


const props = defineProps({
    parent_window: {
        /**@type {import('vue').PropType<import('../components/FloatingWindows/FWManager').FWWindow>} */
        type: Object,
        required: false
    },
    id_zlecenia: FormParamProp
});

const db = useWarsztatDatabase();
const TAB_Z = db.TABS.zlecenia_naprawy;
const TAB_K = db.TABS.klienci;
const TAB_S = db.TABS.samochody_klientów;
const COLS_Z = TAB_Z.cols;
const COLS_K = TAB_K.cols;
const COLS_S = TAB_S.cols;

const id_zlecenia_param = param_from_prop(props, 'id_zlecenia');


const src = new FormQuerySource(false);
src.disable_deps();
src.disable_offset();

src.set_from_with_deps(TAB_Z);
src.add_join(COLS_Z.ID_klienta,     COLS_K.ID);
src.add_join(COLS_Z.ID_samochodu,   COLS_S.ID);

const id         = standard_form_auto_column_value(src, COLS_Z.ID, {param: id_zlecenia_param}).get_cached_ref();
const data_otw   = standard_form_auto_column_value(src, COLS_Z.data_otwarcia).get_cached_ref();
const zgloszenie = standard_form_auto_column_value(src, COLS_Z.zgłoszone_naprawy).get_cached_ref();
const uwagi      = standard_form_auto_column_value(src, COLS_Z.uwagi_o_naprawie).get_cached_ref();

const car_marka  = standard_form_auto_column_value(src, COLS_S.marka).get_cached_ref();
const car_model  = standard_form_auto_column_value(src, COLS_S.model).get_cached_ref();
const car_nrrej  = standard_form_auto_column_value(src, COLS_S.nr_rej).get_cached_ref();

const kli_nazwa  = standard_form_auto_column_value(src, COLS_K.NAZWA).get_cached_ref();
const kli_miasto = standard_form_auto_column_value(src, COLS_K.MIASTO).get_cached_ref();
const kli_ulica  = standard_form_auto_column_value(src, COLS_K.ULICA).get_cached_ref();
const kli_kod    = standard_form_auto_column_value(src, COLS_K.KOD_POCZT).get_cached_ref();


// const id_klienta = props.src_zlec.get_ref("ID klienta",          );
// const id_car     = props.src_zlec.get_ref("ID samochodu",        );

// const data_zamk  = props.src_zlec.get_ref("data zamknięcia",     );
// const zysk_cz    = props.src_zlec.get_ref("zysk z części",       );
// const zysk_rob   = props.src_zlec.get_ref("zysk z robocizny",    );
// const prow       = props.src_zlec.get_ref("mechanik prowadzący", );
// const prow_p     = props.src_zlec.get_ref("% udziału",           );
// const pom1       = props.src_zlec.get_ref("pomocnik 1",          );
// const pom1_p     = props.src_zlec.get_ref("% udziału p1",        );
// const pom2       = props.src_zlec.get_ref("pomocnik 2",          );
// const pom2_p     = props.src_zlec.get_ref("% udziału p2",        );

defineExpose({
    src
});

</script>


<template>
    
    <button onclick="window.print();" class="print_fallback_button"> DRUKUJ </button>
    <select onchange="document.querySelector('.page').style.fontFamily = this.value" class="noprint">
        <option value="Times New Roman"   > Times New Roman   </option>
        <option value="Arial"             > Arial             </option>
        <option value="Verdana"           > Verdana           </option>
        <option value="Tahoma"            > Tahoma            </option>
        <option value="Trebuchet MS"      > Trebuchet MS      </option>
        <option value="Georgia"           > Georgia           </option>
        <option value="Garamond"          > Garamond          </option>
        <option value="Courier New"       > Courier New       </option>
        <option value="Brush Script MT"   > Brush Script MT   </option>
    </select>
    <div class="over_page">
    <div class="page" ref="page" contenteditable="true">

        <div class="header_right">
            <div class="data">
                Gliwice dn. : {{ format_date_str_local(data_otw?.toString() ?? '') }}
            </div>
            <div class="nr_zlec">
                <span>
                    zlecenie naprawy nr. :
                </span>
                <span class="id_zlecenia">
                    {{ id }}
                </span>
            </div>
        </div>

        <div class="header">
            <div class="bold poke">AUTO-GOLD</div>
            <div class="bold poke">Piotr Gold</div>
            <div>ul. Bł Czesława 11</div>
            <div>44-100 Gliwice</div>
            <div>kom. 501-210-604</div>
            <div>email piotr.gold@wp.pl</div>
            <div class="bold">Credit Agrikole nr 11 1111 1111 2222 3333 4444 0000 0000</div>
        </div>

        <div class="big_fields">
            <div>
                <div class="label">samochód: </div>
                <div class="value car"> 
                    <div>{{ car_marka }}</div>
                    <div>{{ car_model }}</div>
                    <div>{{ car_nrrej }}</div>
                </div>
            </div>
            <div>
                <div class="label">klient: </div>
                <div class="value klient"> 
                    <div class="klient_name">{{ kli_nazwa }}</div>
                    <div class="klient_addr">{{ kli_kod }}</div>
                    <div class="klient_addr">{{ kli_miasto }}</div>
                    <div class="klient_addr">{{ kli_ulica }}</div>
                </div>
            </div>
        </div>

        <div class="info">
            <header>zakres naprawy:</header>
            <div class="bordered">{{ zgloszenie }}</div>
        </div>
        <div class="info">
            <header>uwagi:</header>
            <div class="bordered">{{ uwagi }}</div>
        </div>

    </div>
    </div>

</template>

<style scoped>

    .bold {
        font-weight: bold;
    }

    .header_right {
        position: absolute;
        right: 0mm;
        top: 0mm;
        text-align: right;
    }
    .header_right .nr_zlec {
        font-size: 2em;
        text-decoration: underline;
    }
    .header_right .nr_zlec .id_zlecenia {
        margin-left: 4mm;
    }

    .header .poke {
        position: relative;
        left: -1mm;
    }

    .header {
        margin-bottom: 3mm;
        font-size: 1em;
    }

    .big_fields > *{
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
    }

    .big_fields .label {
        margin-right: 5mm;
    }
    .big_fields .value {
        flex-grow: 1;
        flex-direction: row;
        flex-wrap: wrap;
        display: flex;
    }
    
    .big_fields .value.car {
        font-size: 2em;
    }
    .big_fields .value.car > *{
        width: 50%;
        text-align: center;
    }

    .big_fields .value.klient{
        justify-content: start;
    }
    .big_fields .value.klient > .klient_name {
        width: 100%;
        font-size: 1.5em;
        font-weight: bold;
    }
    .big_fields .value.klient > .klient_addr {
        margin-right: 2mm;
    }

    .info header {
        text-decoration: underline;
        margin-left: 2mm;
    }
    .info .bordered {
        border: 1px solid gray;
        white-space: pre-wrap;
    }

</style>