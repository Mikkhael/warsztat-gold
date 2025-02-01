<script setup>
//@ts-check

// import { Dataset, DVUtil } from '../components/Dataset/Dataset';

import useMainMsgManager from '../components/Msg/MsgManager';



import { date_now, format_date_str_local, format_first_line, format_decimal2 as format_decimal } from '../utils';
import { FormParamProp, param_from_prop, RefChangableValue } from '../components/Dataset';
import { create_print_param_button, RepQuerySourceFull, RepQuerySourceSingle } from './RepCommon';
import useWarsztatDatabase from '../DBStructure/db_warsztat_structure';
import { useMainSettings } from '../components/Settings/Settings';
import { computed, ref } from 'vue';
import { set_from_for_summary_for_zlec_id } from '../Forms/CommonSql';

const props = defineProps({
    parent_window: {
        /**@type {import('vue').PropType<import('../components/FloatingWindows/FWManager').FWWindow>} */
        type: Object,
        required: false
    },
    id_zlecenia: FormParamProp
});

const page = ref();

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
const id_zlecenia = RefChangableValue.from_sqlvalue(id_zlecenia_param);


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


////////////// List Source /////////////

const src_list = new RepQuerySourceFull();
set_from_for_summary_for_zlec_id(src_list, id_zlecenia.get_local_ref());

src_list.auto_rep_column ('name', {default: ''});
src_list.auto_rep_column ('unit', {default: ''});
src_list.auto_rep_column ('cnt',  {default:  0});
src_list.auto_rep_column ('netto',{default: "0.00"});
src_list.auto_rep_column ('is_part');
src_list.auto_rep_column ("brutto",     {sql: "decimal_mul(1.23, `netto`)"});
src_list.auto_rep_column ("mul_brutto", {sql: "decimal_mul(1.23, decimal_mul(`cnt`,`netto`))"});

const src_list_rows_parts = computed(() => src_list.local_rows.value.filter(x =>  x.get('is_part')));
const src_list_rows_robos = computed(() => src_list.local_rows.value.filter(x => !x.get('is_part')));

const src_list_has_parts = computed(() => src_list_rows_parts.value.length > 0);
const src_list_has_robos = computed(() => src_list_rows_robos.value.length > 0);

const src_total = new RepQuerySourceSingle();
set_from_for_summary_for_zlec_id(src_total, id_zlecenia.get_local_ref());
const src_total_brutto_p = src_total.auto_rep_value ("total_brutto_p", {sql: "decimal_mul(1.23, decimal_sum(decimal_mul(iif(`is_part`,`cnt`,0),`netto`)))", default: '0.00'});
const src_total_brutto   = src_total.auto_rep_value ("total_brutto",   {sql: "decimal_mul(1.23, decimal_sum(decimal_mul(`cnt`,`netto`)))", default: '0.00'});

////

const initial_is_zlec_manual = computed(() => src_list.local_rows.value.length <= 0);

const date_now_ref = ref('');
async function perform_update() {
    await src.update_complete(true);
    await src_list.update_complete(true);
    await src_total.update_complete(true);
    date_now_ref.value = format_date_str_local(date_now());
}

function create_options() {
    const btn_type_zlec_auto   = create_print_param_button('Ustaw listę Automatycznie', {
        actions: [
            {name: 'page', val: 'is_zlec_manual', type: 'class_remove'},
        ]
    });
    const btn_type_zlec_manual = create_print_param_button('Ustaw listę Ręcznie', {
        actions: [
            {name: 'page', val: 'is_zlec_manual', type: 'class_set'},
        ]
    });
    return btn_type_zlec_auto + btn_type_zlec_manual;
}

// const title_getter = "Zlecenie nr {{zlecenie_id}}";
const title_getter = 'zlecenie';

defineExpose({
    perform_update,
    create_options,
    title_getter
});

</script>


<template>
    
    <div class="over_page">
    <div class="page" name="page" ref="page" contenteditable="true" :class="{is_zlec_manual: initial_is_zlec_manual}">

        
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

        <div class="info" contenteditable="false">
            <header contenteditable="true">zakres naprawy:</header>
            <div class="pre bordered" contenteditable="true">{{ zgloszenie }}</div>
        </div>
        <div class="info" contenteditable="false">
            <header contenteditable="true">uwagi:</header>
            <div class="pre bordered" contenteditable="true">{{ uwagi }}</div>
        </div>

        <div class="zlec_list fake_list only_in_zlec_manual" contenteditable="false">
            <!-- <div contenteditable="true"><div>&nbsp;</div><div>&nbsp;</div></div> -->
            <div contenteditable="true" class="h"><div>Nazwa części lub prace wykonane</div><div>&nbsp;</div></div>
            <div contenteditable="true" class="h"><div>ilość</div><div>&nbsp;</div></div>
            <div contenteditable="true" class="h"><div>cena jednostkowa</div><div>&nbsp;</div></div>
            <div contenteditable="true" class="h nbr"><div>razem do zapłaty</div><div>&nbsp;</div></div>
        </div>
        <div class="zlec_list not_in_zlec_manual">
            <!-- <div contenteditable="true"><div>&nbsp;</div><div>&nbsp;</div></div> -->
            <div class="h">Nazwa części lub prace wykonane</div>
            <div class="h">ilość</div>
            <div class="h">cena jednostkowa</div>
            <div class="h nbr">razem do zapłaty</div>
            <template
                v-for="(row, row_i) in src_list_rows_parts"
            >
                <div class="d">{{ format_first_line( row.get('name') ) }}</div>
                <div class="d c">{{ [row.get('cnt'), row.get('unit')].join(' ') }}</div>
                <div class="d r">{{ format_decimal(row.get('brutto')) }}</div>
                <div class="d r nbr">{{ format_decimal(row.get('mul_brutto')) }}</div>
            </template>
            <div class="sum" v-if="src_list_has_parts && src_list_has_robos">
                <div>
                    {{ format_decimal(src_total_brutto_p, true) }}
                </div>
            </div>
            <div class="wide">&nbsp;</div>
            <div class="wide">&nbsp;</div>
            <div class="wide">&nbsp;</div>
            <template
                v-for="(row, row_i) in src_list_rows_robos"
            >
                <div class="d">{{ format_first_line( row.get('name') ) }}</div>
                <div class="d c">{{ [row.get('cnt'), row.get('unit')].join(' ') }}</div>
                <div class="d r">{{ format_decimal(row.get('brutto')) }}</div>
                <div class="d r nbr">{{ format_decimal(row.get('mul_brutto')) }}</div>
            </template>
            <div class="sum">
                <div>
                    {{ format_decimal(src_total_brutto, true) }}
                </div>
            </div>
        </div>

    </div>
    </div>

</template>
