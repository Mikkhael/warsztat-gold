<script setup>
//@ts-check

import { Dataset, DVUtil } from '../components/Dataset/Dataset';

import useMainMsgManager from '../components/Msg/MsgManager';



import {onMounted, ref, toRef, watch} from 'vue';
import { format_date_str_local } from '../utils';


const props = defineProps({
    parent_window: {
        /**@type {import('vue').PropType<import('../components/FloatingWindows/FWManager').FWWindow>} */
        type: Object,
        required: false
    },
    dataset: {
        /**@type {import('vue').PropType<import('../components/Dataset/Dataset').Dataset>} */
        type: Object,
        required: true
    }
});

const msgManager = useMainMsgManager();

const id         = props.dataset.get("ID",                  );
const id_klienta = props.dataset.get("ID klienta",          );
const id_car     = props.dataset.get("ID samochodu",        );

const data_otw   = props.dataset.get("data otwarcia",       );
const data_zamk  = props.dataset.get("data zamknięcia",     );
const zysk_cz    = props.dataset.get("zysk z części",       );
const zysk_rob   = props.dataset.get("zysk z robocizny",    );
const prow       = props.dataset.get("mechanik prowadzący", );
const prow_p     = props.dataset.get("% udziału",           );
const pom1       = props.dataset.get("pomocnik 1",          );
const pom1_p     = props.dataset.get("% udziału p1",        );
const pom2       = props.dataset.get("pomocnik 2",          );
const pom2_p     = props.dataset.get("% udziału p2",        );
const zgloszenie = props.dataset.get("zgłoszone naprawy",   );
const uwagi      = props.dataset.get("uwagi o naprawie",    );

const kli_dataset = props.dataset.parent_dataset;

const kli_nazwa  = kli_dataset.get("NAZWA",     );
const kli_miasto = kli_dataset.get("MIASTO",    );
const kli_ulica  = kli_dataset.get("ULICA",     );
const kli_kod    = kli_dataset.get("KOD_POCZT", );

const car_dataset = kli_dataset.sub_datasets['car'];

const car_marka    = car_dataset.get("marka",  );
const car_model    = car_dataset.get("model",  );
const car_nrrej    = car_dataset.get("nr rej", );

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
    <div class="page" ref="page" contenteditable="true">

        <div class="header_right">
            <div class="data">
                Gliwice dn. : {{ format_date_str_local(data_otw) }}
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