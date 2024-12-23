<script setup>
//@ts-check



import { date_now, format_date_str_local, format_decimal as format_decimal_utils, number_to_polish_words, parse_decimal_adv } from '../utils';
import { FormParamProp, param_from_prop, qparts_db, query_parts_to_string, QueryBuilder, RefChangableValue } from '../components/Dataset';
import { RepQuerySourceSingle, RepQuerySourceFull } from './RepCommon';
import useWarsztatDatabase from '../DBStructure/db_warsztat_structure';
import { useMainSettings } from '../components/Settings/Settings';
import { computed, ref } from 'vue';

const props = defineProps({
    parent_window: {
        /**@type {import('vue').PropType<import('../components/FloatingWindows/FWManager').FWWindow>} */
        type: Object,
        required: false
    },
    id_zlecenia: FormParamProp
});

const db = useWarsztatDatabase();
const TAB_ZLEC = db.TABS.zlecenia_naprawy;
const TAB_KLIE = db.TABS.klienci;
const TAB_SAMO = db.TABS.samochody_klientów;
const TAB_OBRO = db.TABS.obroty_magazynowe;
const TAB_CZES = db.TABS.nazwy_części;
const TAB_CZYN = db.TABS.czynność;
const TAB_ROBO = db.TABS.zlecenia_czynności;
const COLS_ZLEC = TAB_ZLEC.cols;
const COLS_KLIE = TAB_KLIE.cols;
const COLS_SAMO = TAB_SAMO.cols;
const COLS_OBRO = TAB_OBRO.cols;
const COLS_CZES = TAB_CZES.cols;
const COLS_CZYN = TAB_CZYN.cols;
const COLS_ROBO = TAB_ROBO.cols;

const id_zlecenia_param = param_from_prop(props, 'id_zlecenia');
const id_zlecenia = RefChangableValue.from_sqlvalue(id_zlecenia_param);

const mainSettings = useMainSettings();
const settings_data = mainSettings.get_reactive_settings_raw('data');

////////////// Main Source ///////////////
const src_main = new RepQuerySourceSingle();
src_main.set_from_with_deps(TAB_ZLEC);
src_main.add_join(COLS_ZLEC.ID_klienta,     COLS_KLIE.ID, 'LEFT');
src_main.add_join(COLS_ZLEC.ID_samochodu,   COLS_SAMO.ID, 'LEFT');

const zlec_id         = src_main.auto_rep_value(COLS_ZLEC.ID, {param: id_zlecenia_param});
// const zlec_data_otw   = src_main.auto_rep_value(COLS_ZLEC.data_otwarcia);
// const zlec_zgloszenie = src_main.auto_rep_value(COLS_ZLEC.zgłoszone_naprawy);
// const zlec_uwagi      = src_main.auto_rep_value(COLS_ZLEC.uwagi_o_naprawie);

const samo_marka       = src_main.auto_rep_value(COLS_SAMO.marka);
const samo_model       = src_main.auto_rep_value(COLS_SAMO.model);
const samo_nrrej       = src_main.auto_rep_value(COLS_SAMO.nr_rej);

const klie_nazwa       = src_main.auto_rep_value(COLS_KLIE.NAZWA);
const klie_miasto      = src_main.auto_rep_value(COLS_KLIE.MIASTO);
const klie_ulica       = src_main.auto_rep_value(COLS_KLIE.ULICA);
const klie_kod         = src_main.auto_rep_value(COLS_KLIE.KOD_POCZT);
const klie_nip         = src_main.auto_rep_value(COLS_KLIE.NIP);
const klie_odbiorca    = src_main.auto_rep_value(COLS_KLIE.odbierający_fakturę);

////////////// List Source /////////////

const LIST_CZESCI_SQL = qparts_db(
    "SELECT",   "ifnull(",  COLS_CZES.nazwa_części,      ", '')",  "AS name,", 
                "ifnull(",  COLS_CZES.jednostka,         ", '')",  "AS unit,",
                "ifnull(",  COLS_OBRO.ilość,        "* (-1), 0)",  "AS cnt,",
                            COLS_OBRO.cena_netto_sprzedaży,        "AS netto",
    "FROM",     TAB_OBRO, "LEFT JOIN", TAB_CZES, "ON", COLS_OBRO.numer_cz, "=", COLS_CZES.numer_części,
    "WHERE",    COLS_OBRO.rodzaj_dokumentu, "IS 'zlec'", "AND", COLS_OBRO.numer_dokumentu, "IS", [id_zlecenia.get_local_ref()]);
    
const LIST_ROBOCIZNA_SQL = qparts_db(
    "SELECT",   "ifnull(",  COLS_CZYN.czynność,          ", '')",  "AS name,", 
                "''",                                              "AS unit,",
                "ifnull(",  COLS_ROBO.krotność_wykonania,",  0)",  "AS cnt,",
                            COLS_ROBO.cena_netto,                  "AS netto",
    "FROM",     TAB_ROBO, "LEFT JOIN", TAB_CZYN, "ON", COLS_ROBO.ID_czynności, "=", COLS_CZYN.ID_cynności,
    "WHERE",    COLS_ROBO.ID_zlecenia, "IS", [id_zlecenia.get_local_ref()]);

    
const LIST_SQL = computed(() => `(${query_parts_to_string(LIST_CZESCI_SQL)} UNION ALL ${query_parts_to_string(LIST_ROBOCIZNA_SQL)})`);
// const LIST_SQL = computed(() => `( (${query_parts_to_string(LIST_ROBOCIZNA_SQL)}))`);

const src_list = new RepQuerySourceFull();
src_list.query.from.reas(LIST_SQL);

src_list.auto_rep_column ('name', {default: ''});
src_list.auto_rep_column ('unit', {default: ''});
src_list.auto_rep_column ('cnt',  {default:  0});
src_list.auto_rep_column ('netto',{default: "0.00"});
src_list.auto_rep_column ("mul_netto",  {sql: "decimal_mul(1,    decimal_mul(`cnt`,`netto`))"});
src_list.auto_rep_column ("mul_vat",    {sql: "decimal_mul(0.23, decimal_mul(`cnt`,`netto`))"});
src_list.auto_rep_column ("mul_brutto", {sql: "decimal_mul(1.23, decimal_mul(`cnt`,`netto`))"});


const src_total = new RepQuerySourceSingle();
src_total.query.from.reas(LIST_SQL);
const src_total_netto  = src_total.auto_rep_value ("total_netto",  {sql: "decimal_mul(1,    decimal_sum(decimal_mul(`cnt`,`netto`)))", default: '0.00'});
const src_total_vat    = src_total.auto_rep_value ("total_vat",    {sql: "decimal_mul(0.23, decimal_sum(decimal_mul(`cnt`,`netto`)))", default: '0.00'});
const src_total_brutto = src_total.auto_rep_value ("total_brutto", {sql: "decimal_mul(1.23, decimal_sum(decimal_mul(`cnt`,`netto`)))", default: '0.00'});

const total_brutto_parts = computed(() => {
    const formated = format_decimal(src_total_brutto.value ?? '0', false);
    const [whole, frac, full, sign] = parse_decimal_adv(formated) ?? ['0', '00', '0.00', ''];
    return [sign + whole, frac];
});

////////////////// OTHER /////////////////////////////

const CONST_VAT = 0.23;

const CONST_VAT_PROC = (CONST_VAT*100) + '%';

/**
 * @param {any} string 
 */
function format_decimal(string, with_zl = false) {
    console.log("FORMATTING", string);
    string = string?.toString();
    if(typeof string != 'string') return '';
    return format_decimal_utils(string, 2, with_zl ? ' zł' : '', ',') ?? '';
}

const date_now_ref = ref('');
async function perform_update() {
    await Promise.all([
        src_main.update_complete(true),
        src_list.update_complete(true),
        src_total.update_complete(true),
    ]);
    date_now_ref.value = format_date_str_local(date_now());
}

defineExpose({
    perform_update,
});

</script>


<template>
    
    <div class="over_page">
    <div class="page" ref="page" contenteditable="true">

        <div class="faktura_header">
            <div class="left">
                <div class="bold vbig">Faktura VAT nr {{ 1234 }}</div>
                <div> ORYGINAŁ / KOPIA </div>
            </div>
            <div class="right">
                <div>Gliwice dnia:   {{ date_now_ref }}</div>
                <div>Data sprzedaży: {{ date_now_ref }}</div>
            </div>
        </div>

        <div class="sprzedajacy_header">
            <div class="left">
                <div class="small">Sprzedający:</div>
                <div class="center bold italic underline big">{{settings_data.Nazwa}}</div>
                <div class="center bold italic">{{ settings_data['Imię i Nazwisko'] }}</div>
                <div class="center">{{ settings_data.Adres }}</div>
                <div class="center small">kom. {{ settings_data.Telefon }}</div>
                <div class="center bold small">e-mail {{ settings_data.Email }}</div>
            </div>
            <div class="right">
                <div class="small">Konto bankowe:</div>
                <div>{{ settings_data['Nazwa Banku'] }}</div>
                <div>{{ settings_data['Nr Konta'] }}</div>
            </div>
        </div>
        

        <div class="klient_header">
            <div class="small wide">Kupujący: </div>
            <div class="poke bold big wide"> {{ klie_nazwa }} </div>
            <div class="sub_left big">
                <div class="poke">ul. {{ klie_ulica }} </div>
                <div class="poke">{{ klie_kod }} {{ klie_miasto }} </div>
                <div class="poke">NIP: {{ klie_nip }} </div>
                <div class="poke bold">{{ samo_marka }} {{ samo_model }} {{ samo_nrrej }}</div>
            </div>
            <div class="sub_right">
                <div> ujęto rabat  </div>
                <div> autoryzacja  </div>
                <div> zlecenia     </div>
                <div class="spacer"></div>
                <div> Przebieg: &nbsp;&nbsp;&nbsp; km </div>
            </div>
        </div>

        <div class="list small">

            <table>
                <tr class="theader">
                    <th>Lp.</th>
                    <th>nazwa części zamiennej lub czynności</th>
                    <th></th>
                    <th>ilość</th>
                    <th>cena netto</th>
                    <th>wartość netto</th>
                    <th></th>
                    <th>wartość VAT</th>
                    <th>wartość brutto</th>
                </tr>
                <tr
                    v-for="(row, row_i) in src_list.local_rows.value"
                    class="tdata"
                >
                    <td class="r">{{ row_i + 1 }}</td>
                    <td class="l">{{ row.get('name') }}</td>
                    <td class="r">{{ row.get('unit') }}</td>
                    <td class="r">{{ row.get('cnt') }}</td>
                    <td class="r">{{ format_decimal( row.get('netto') ) }}</td>
                    <td class="r">{{ format_decimal( row.get('mul_netto') ) }}</td>
                    <td class="c">{{ CONST_VAT_PROC }} </td>
                    <td class="r">{{ format_decimal( row.get('mul_vat') ) }}</td>
                    <td class="r">{{ format_decimal( row.get('mul_brutto') ) }}</td>
                </tr>

            </table>

        </div>
        
        <div class="list_summary">

            <div class="spacer_left"></div>
            <table>
                <tr class="theader">
                    <th>wartość netto:</th>
                    <th>stawka<br>VAT</th>
                    <th>VAT</th>
                    <th>wartość brutto:</th>
                </tr>
                <tr
                    class="tdata"
                >
                    <td class="r">{{ format_decimal( src_total_netto, true ) }}</td>
                    <td class="c">{{ CONST_VAT_PROC }} </td>
                    <td class="r">{{ format_decimal( src_total_vat, true ) }}</td>
                    <td class="r">{{ format_decimal( src_total_brutto, true ) }}</td>
                </tr>
            </table>
            <div class="spacer_right"></div>

        </div>

        <div class="summary_footer nobreak">
            <label>sposób zapłaty:</label> <div class="bold big" >{{ 'gotówka' }}</div>
            <label>do zapłaty:</label>     <div class="bold vbig">{{ format_decimal( src_total_brutto, true ) }}</div>
            <label>słownie:</label>        <div></div>
            <div class="bold big slownie" >{{ number_to_polish_words( total_brutto_parts[0] ) }}</div>
            <label>groszy:</label>         <div class="bold big" >{{ total_brutto_parts[1] }} / 100</div>
        </div>

        <div class="signature_footer nobreak">
            <div class="signature_section">
                <div class="name">{{ klie_odbiorca }}</div>
                <div class="info">podpis osoby uprawnionej<br>do odbioru faktury VAT</div>
            </div>
            <div class="signature_section">
                <div class="name">{{ settings_data[`Imię i Nazwisko`] }}</div>
                <div class="info">podpis osoby uprawnionej<br>do wystawienia faktury VAT</div>
            </div>
        </div>

    </div>
    </div>

</template>

<style scoped>

    .bold    { font-weight: bold; }
    .italics { font-style: italic; }
    .center  { text-align: center; }
    .small   { font-size: 0.8em; }
    .big     { font-size: 1.2em; }
    .vbig    { font-size: 2em; }
    
    .faktura_header {
        text-wrap: nowrap;
        padding: 1ch;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        border-bottom: 1px solid black;
    }
    .faktura_header .right{
        text-align: right;
    }
    .sprzedajacy_header {
        text-wrap: nowrap;
        padding: 1ch;
        display: grid;
        grid-template: auto / 3fr 2fr;
        border-bottom: 1px solid black;
    }

    .klient_header {
        text-wrap: nowrap;
        padding: 1ch;
        display: grid;
        grid-template: auto auto 1fr / 4fr 3fr;
        border-bottom: 1px solid black;
        justify-content: stretch;
        justify-items: stretch;
    }
    .klient_header .wide {
        grid-column: 1 / -1;
    }
    .klient_header .poke {
        margin-left: 2ch;
    }
    .klient_header .sub_right {
        text-wrap: wrap;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: stretch;
    }
    .klient_header .sub_right .spacer {
        flex-grow: 1;
    }

    .list {
        border-bottom: 1px solid black;
    }
    .list table {
        width: 100%;
    }

    .list_summary {
        display: flex;
        flex-direction: row;
    }
    .list_summary .spacer_left{
        flex-grow: 3;
    }
    .list_summary .spacer_right{
        flex-grow: 1;
    }
    .list_summary table {
        border-bottom: 1px solid black;
    }
    .summary_footer {
        display: grid;
        grid-template: auto / auto 1fr;
        align-items: center;
        gap: 4px;
    }
    .summary_footer label {
        justify-self: right;
    }
    .summary_footer .slownie {
        grid-column: 1 / -1;
        border: 1px solid black;
        border-bottom: none;
    }

    .signature_footer {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        margin-top: 1cm;
    }
    .signature_footer .signature_section .name{
        font-weight: bold;
        font-size: 1.2em;
        border-bottom: 2px dotted black;
        min-width: 7cm;
    }
    .signature_footer .signature_section .info{
        font-size: 0.8em;
    }

    table td {
        padding: 0px 4px;
    }

    table {
        border-collapse: collapse;
    }


    .list .theader  {border-bottom: 1px solid black;}
    .tdata .l {text-align: left;}
    .tdata .c {text-align: center;}
    .tdata .r {text-align: right;}

</style>