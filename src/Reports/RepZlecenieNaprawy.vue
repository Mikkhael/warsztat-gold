<script setup>
//@ts-check

// import { Dataset, DVUtil } from '../components/Dataset/Dataset';

import useMainMsgManager from '../components/Msg/MsgManager';



import { date_now, format_date_str_local } from '../utils';
import { FormParamProp, param_from_prop } from '../components/Dataset';
import { RepQuerySourceSingle } from './RepCommon';
import useWarsztatDatabase from '../DBStructure/db_warsztat_structure';
import { useMainSettings } from '../components/Settings/Settings';
import { ref } from 'vue';

const props = defineProps({
    parent_window: {
        /**@type {import('vue').PropType<import('../components/FloatingWindows/FWManager').FWWindow>} */
        type: Object,
        required: false
    },
    id_zlecenia: FormParamProp
});

const mainSettings = useMainSettings();
const settings_data = mainSettings.get_reactive_settings_raw('data');

const db = useWarsztatDatabase();
const TAB_Z = db.TABS.zlecenia_naprawy;
const TAB_K = db.TABS.klienci;
const TAB_S = db.TABS.samochody_klientów;
const COLS_Z = TAB_Z.cols;
const COLS_K = TAB_K.cols;
const COLS_S = TAB_S.cols;

const id_zlecenia_param = param_from_prop(props, 'id_zlecenia');


const src = new RepQuerySourceSingle();

src.set_from_with_deps(TAB_Z);
src.add_join(COLS_Z.ID_klienta,     COLS_K.ID);
src.add_join(COLS_Z.ID_samochodu,   COLS_S.ID);

const id         = src.auto_rep_value(COLS_Z.ID, {param: id_zlecenia_param});
const data_otw   = src.auto_rep_value(COLS_Z.data_otwarcia);
const zgloszenie = src.auto_rep_value(COLS_Z.zgłoszone_naprawy);
const uwagi      = src.auto_rep_value(COLS_Z.uwagi_o_naprawie);

const samo_marka  = src.auto_rep_value(COLS_S.marka);
const samo_model  = src.auto_rep_value(COLS_S.model);
const samo_nrrej  = src.auto_rep_value(COLS_S.nr_rej);
const samo_nrsil  = src.auto_rep_value(COLS_S.nr_silnika);
const samo_nrnad  = src.auto_rep_value(COLS_S.nr_nadwozia);

const klie_nazwa  = src.auto_rep_value(COLS_K.NAZWA);
const klie_miasto = src.auto_rep_value(COLS_K.MIASTO);
const klie_ulica  = src.auto_rep_value(COLS_K.ULICA);
const klie_kod    = src.auto_rep_value(COLS_K.KOD_POCZT);
const klie_nip    = src.auto_rep_value(COLS_K.NIP);
const klie_tele1  = src.auto_rep_value(COLS_K.TELEFON1);
const klie_tele2  = src.auto_rep_value(COLS_K.TELEFON2);


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

const date_now_ref = ref('');
async function perform_update() {
    await src.update_complete(true);
    date_now_ref.value = format_date_str_local(date_now());
}
// const title_getter = "Zlecenie nr {{zlecenie_id}}";
const title_getter = 'zlecenie';

defineExpose({
    perform_update,
    title_getter
});

</script>


<template>
    
    <div class="over_page">
    <div class="page" ref="page" contenteditable="true">

        
        <div class="faktura_header">
            <div class="left">
                <div class="bold vbig">Zlecenie nr <span name="zlecenie_id">{{ id }}</span></div>
                <!-- <div> ORYGINAŁ / KOPIA </div> -->
            </div>
            <div class="right">
                <div>Gliwice dnia:   {{ date_now_ref }}</div>
            </div>
        </div>

        <div class="sprzedajacy_header">
            <div class="left">
                <!-- <div class="small">Sprzedający:</div> -->
                <div class="center bold italic underline big">{{settings_data.Nazwa}}</div>
                <div class="center bold italic">{{ settings_data['Imię i Nazwisko'] }}</div>
                <div class="center">{{ settings_data.Adres }}</div>
                <div class="center small">kom. {{ settings_data.Telefon }}</div>
                <div class="center small">NIP: {{ settings_data.NIP }}</div>
                <div class="center bold small">e-mail {{ settings_data.Email }}</div>
            </div>
            <div class="right">
                <div class="small">Konto bankowe:</div>
                <div>{{ settings_data['Nazwa Banku'] }}</div>
                <div>{{ settings_data['Nr Konta'] }}</div>
            </div>
        </div>
        

        <div class="klient_header">
            <div class="small wide">Klient: </div>
            <div class="poke bold big wide"> {{ klie_nazwa }} </div>
            <div class="sub_left big">
                <div class="poke">ul. {{ klie_ulica }} </div>
                <div class="poke">{{ klie_kod }} {{ klie_miasto }} </div>
                <!-- <div class="poke">{{ !klie_nip ? '\xa0' : ('NIP: ' + klie_nip) }} </div> -->
                <div class="poke bold">{{ samo_marka }} {{ samo_model }} {{ samo_nrrej }}</div>
                <div class="poke bold small">Silnik:   {{ samo_nrsil }}</div>
                <div class="poke bold small">Nadwozie: {{ samo_nrnad }}</div>
            </div>
            <div class="sub_right">
                <div> Telefon 1: {{ klie_tele1 }} </div>
                <div> Telefon 2: {{ klie_tele2 }} </div>
                <div class="spacer"></div>
            </div>
        </div>

        <div class="rodo">
             {{ settings_data.RODO }}
        </div>

        <div class="info">
            <header>zakres naprawy:</header>
            <div class="pre bordered">{{ zgloszenie }}</div>
        </div>
        <div class="info">
            <header>uwagi:</header>
            <div class="pre bordered">{{ uwagi }}</div>
        </div>

        <div class="fake_list" contenteditable="false">
            <!-- <div contenteditable="true"><div>&nbsp;</div><div>&nbsp;</div></div> -->
            <div contenteditable="true"><div>Nazwa części lub prace wykonane</div><div>&nbsp;</div></div>
            <div contenteditable="true"><div>ilość</div><div>&nbsp;</div></div>
            <div contenteditable="true"><div>cena jednostkowa</div><div>&nbsp;</div></div>
            <div contenteditable="true"><div>razem do zapłaty</div><div>&nbsp;</div></div>
        </div>

    </div>
    </div>

</template>
