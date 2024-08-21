<script setup>
//@ts-check

import { escape_sql_value, query_result_to_object, query_row_to_object } from '../../utils';
import ipc from '../../ipc';

import { Dataset } from '../Dataset/Dataset';
import {FormInput, FormEnum} from '../Controls';

import {useMainFWManager} from '../FloatingWindows/FWManager';
import FWCollection from '../FloatingWindows/FWCollection.vue';

import QueryFormScroller from '../QueryFormScroller.vue';
import QueryViewer from '../QueryViewer/QueryViewer.vue';
import {ref, reactive, watch, computed, onMounted} from 'vue';


import useMainMsgManager from "../Msg/MsgManager";
const msgManager = useMainMsgManager();


const form_scroller = /**@type { import('vue').Ref<QueryFormScroller> } */ (ref());
const fwManager = useMainFWManager();


const query_props = reactive({
	value_name: "`rowid`",
	where: "",
	from: "`pracownicy`",
});

const form_elem = ref();
const rowid = ref(0);

const dataset1 = new Dataset();
const src1 = dataset1.create_source_query();
const sync_pracownicy = dataset1.create_table_sync('pracownicy');
const sync_place      = dataset1.create_table_sync('płace');

const prac_rowid     = dataset1.create_value_synced("ID pracownika",     0,  sync_pracownicy);
const prac_imie      = dataset1.create_value_synced("imię",              '', sync_pracownicy);
const prac_nazwisko  = dataset1.create_value_synced("nazwisko",          '', sync_pracownicy);
const prac_miejsce   = dataset1.create_value_raw   ("miejsce urodzenia", '');

const place_rowid    = dataset1.create_value_raw   ("max ID płac",    0);
const place_kwota    = dataset1.create_value_synced("kwota",            '', sync_place);
const place_podstawa = dataset1.create_value_synced("podstawa",         '', sync_place);
const place_miesiac  = dataset1.create_value_synced("miesiąc płacenia", '', sync_place);

sync_pracownicy.add_primary("ID pracownika", prac_rowid);
sync_place.add_primary("ID płac", place_rowid)

const upper_imie = ref('');

src1.select_auto(prac_rowid);
src1.select_auto(prac_imie);
src1.select_auto(prac_nazwisko);
src1.select_auto(prac_miejsce);
src1.select_auto(place_rowid, 'max(`ID płac`)');
src1.select_auto(place_kwota);
src1.select_auto(place_podstawa);
src1.select_auto(place_miesiac);
src1.select_bind(upper_imie, 'IMIĘ CAPS', 'upper(`imię`)');
src1.select_raw('NAZWISKO CAPS', 'upper(`nazwisko`)');
src1.set_body_query_and_finalize(['FROM `pracownicy` NATURAL LEFT JOIN `płace` WHERE `ID pracownika` = ', rowid])


// const podstawa_hints = form1.add_aux_query(`SELECT DISTINCT podstawa FROM \`płace\``);
// const podstawa_hints_flat = computed(() => podstawa_hints.value[0].flat() );

// const kwota_test_bnd = form1.add_aux_query(computed(() => 
//     `SELECT K - S, K, K + S FROM (SELECT max(\`ID płac\`), kwota as K, \`ID pracownika\` as S FROM płace WHERE \`ID pracownika\` = ${rowid.as_sql()});`
// ));
// const kwota_test_bnd_procesed = computed(() => {
//     return kwota_test_bnd.value[0][0];
// })

watch(rowid, async (newValue) => {
    let row = await dataset1.perform_query_and_replace_all().catch(err => {
        console.error(err);
        return {"Błąd": "Składni"};
    });
    update_debug_res(row);
});

// FIND

function handle_find(columns, row) {
    fwManager.close_window("Test - Znajdź");
    rowid.value = row[0];
}

function on_click_find() {
    fwManager.open_or_reopen_window("Test - Znajdź", QueryViewer, {
        // query_select: `
        //     p1.rowid as __rowid,
        //     p1.\`ID pracownika\` as ID_prac   ,
        //     \`imię\`                ,
        //     \`nazwisko\`            ,
        //     \`miejsce urodzenia\`   ,
        //     \`ID płac\` as \`płace_ID płac\`,
        //     \`kwota\`               ,
        //     \`podstawa\`            ,
        //     \`miesiąc płacenia\`    `,
        query_select_fields: [
            ["p1.rowid"],
            ["p1.`ID pracownika`", "ID pracownika"],
            ["`imię`", "Imię"],
            ["`nazwisko`", "Nazwisko"],
            ["`miejsce urodzenia`", "Miejce Urodzenia"],
            ["`ID płac`", "ID płac"],
            ["`kwota`", "Kwota"],
            ["`podstawa`", "Podstawa"],
            ["`miesiąc płacenia`", "Miesiąc Płacenia"],
        ],
        query_from: "`pracownicy` as p1 LEFT JOIN (SELECT *, max(`ID płac`) FROM `płace` GROUP BY `ID pracownika` ) as p2 ON p1.rowid=p2.`ID pracownika`",
        selectable: true,
    }, {
        select: handle_find
    });
}

// Unnesesary
const debug_update_query = ref('');
function update_debug_update_query() {
    debug_update_query.value = sync_pracownicy.get_update_query() + '\n' + sync_place.get_update_query();
}
update_debug_update_query();

const debug_res = ref({});
const debug_res_str = computed(() => {
	let r = '';
	for(let key in debug_res.value)
		r += key + ': ' + debug_res.value[key][0] + '\n';
	return r;
});
function update_debug_res([res1]) {
    const parsed = query_result_to_object(res1);
    console.log('res1', res1, parsed);
    debug_res.value = parsed;
}

// TODO validate form
async function update_all_and_refresh(){
    const [updated_rows] = await dataset1.perform_update_all();
    const [result]       = await dataset1.perform_query_and_refresh_all();
    console.log("Updated rows: ", updated_rows);
    if(result) update_debug_res([result]);
}

function handle_err(/**@type {Error} */ err) {
    if(err.message ==  'Form Invalid') {
        console.log('Form Invalid');
        return;
    }
    console.error(err);
    msgManager.post("error", err);
}

defineExpose({
    dataset1
});

// console.log('QUERY PROPS', query_props);
// console.log('ROWID', rowid, rowid.value);
// console.log('VALUES', prac_rowid, prac_imie, prac_nazwisko);

</script>


<template>

	<div class="container">
		<button @click="ipc.db_open()">OPEN</button>
		<!-- <div>Query Value Name: <input type="text" v-model.lazy="query_props.value_name"></div>
		<div>Query From: <input type="text" v-model.lazy="query_props.from"></div>
		<div>Query Where: <input type="text" v-model.lazy="query_props.where"></div> -->
		<div>Curr Value: <input type="text" v-model.lazy="rowid"></div>
        <button @click="update_debug_update_query">Update Query Refresh</button> <br>
        <textarea>{{ debug_update_query }}</textarea> <br>
        <button @click="update_all_and_refresh()    .then(() => form_scroller.refresh()).catch(handle_err)" > UPDATE  </button>
        <button @click="update_all_and_refresh(true).then(() => form_scroller.refresh()).catch(handle_err)" > UPDATE  BYPASS</button> <br>
        <button @click="dataset1.perform_query_and_refresh_all().then(update_res).catch(handle_err)" > REFRESH </button>
        <button @click="dataset1.perform_query_and_replace_all().then(update_res).catch(handle_err)" > REPLACE </button>
        <button @click="dataset1.perform_query_and_retcon_all() .then(update_res).catch(handle_err)" > RETCON  </button>
	</div>


	<div class="container">
        ROWID:    <input type="number" v-model="prac_rowid.local.value" :class="{changed: prac_rowid.is_changed()}"> <br>
        IMIĘ:     <input type="text" v-model="prac_imie.local.value" :class="{changed: prac_imie.is_changed()}">  <br>
        NAZWISKO: <input type="text" v-model="prac_nazwisko.local.value" :class="{changed: prac_nazwisko.is_changed()}">  <br>
        <input type="button" value="ZNAJDŹ" @click="on_click_find">  <br>
    </div>
    <!-- <p>{{ kwota_test_bnd_procesed }}</p> -->
    <!-- <p>{{ place_miesiac }}</p> -->
    <fieldset class="form_fieldset">
        <legend>FORM</legend>
        <form ref="form_elem" class="form">
            <label class="label">ROWID PRAC:       </label> <FormInput type="integer"            :value="prac_rowid"   :max="30" nonull/>
            <label class="label">IMIĘ:             </label> <FormInput type="text"    :len="15"  :value="prac_imie"    pattern="[A-Z][a-z]+" nonull />
            <label class="label">NAZWISKO:         </label> <FormInput type="text"    :len="15"  :value="prac_nazwisko" :class="{wide: prac_rowid.local < 5}"            />
            <label class="label">KWOTA:            </label> <FormInput type="number"             :value="place_kwota"   class="wide" />
            <!-- <label class="label">KWOTA HINT:       </label> <FormInput type="number"             :value="place_kwota"  :hints="kwota_test_bnd_procesed" class="wide" /> -->
            <label class="label">KWOTA D:          </label> <FormInput type="decimal"            :value="place_kwota"               />
            <label class="label">ROWID PŁAC:       </label> <FormInput type="integer"            :value="place_rowid"  readonly     />
            <label class="label">MIEJSCE URODZENIA:</label> <FormInput type="text"    :len="3"   :value="prac_miejsce" readonly     />
            <label class="label">PODSTAWA normal:  </label> <FormEnum  :value="place_podstawa" :options="['nadgodziny', ['premia', 'PREMIA+++'], 123, [456, 'liczba'], ['456', 'liczba str']]"  />
            <label class="label">PODSTAWA rdonly:  </label> <FormEnum  :value="place_podstawa" :options="['nadgodziny', ['premia', 'PRIA++'], 123]"  readonly   />
            <label class="label">PODSTAWA nonull:  </label> <FormEnum  :value="place_podstawa" :options="['nadgodziny', 'premia', 'wypłata']"  nonull   />
            <!-- <label class="label">PODSTAWA Query:   </label> <FormEnum  :value="place_podstawa" :options="podstawa_hints_flat" /> -->
            <!-- <label class="label">PODSTAWA Hint:    </label> <FormInput type="text" :value="place_podstawa" :hints="podstawa_hints_flat" /> -->
            <label class="label">Date:             </label> <FormInput type="date" :value="place_miesiac"/>
            <label class="label">Datetime-local:   </label> <FormInput type="datetime-local" :value="place_miesiac"/>
        </form>
    </fieldset>
    
    <br>

	<textarea cols="30" rows="10" :value="debug_res_str"></textarea>



    <QueryFormScroller :query_props="query_props" v-model:value="rowid" ref="form_scroller" />

    
    <FWCollection :manager="fwManager" />

</template>

<style scoped>

    .form {
        display: grid;
        grid: auto / auto auto;
        gap: 5px 10px;
        justify-items: start;
        justify-content: start;
    }
    .form > * {
        border-bottom: solid 2px black;
    }

    .wide{
        width: 40ch;
    }

    .container .changed {
        background-color: #f1c4c4;
    }

</style>

<style>


</style>