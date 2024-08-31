<script setup>
//@ts-check

import { escape_sql_value, query_result_to_object, query_row_to_object } from '../../utils';
import ipc from '../../ipc';

import { Dataset } from '../Dataset/Dataset';
import {FormInput, FormEnum} from '../Controls';

import {FWManager} from '../FloatingWindows/FWManager';
import FWCollection from '../FloatingWindows/FWCollection.vue';

import QueryFormScrollerDataset from '../QueryFormScrollerDataset.vue';
import QueryViewer from '../QueryViewer/QueryViewer.vue';
import {ref, reactive, watch, computed, onMounted} from 'vue';


import useMainMsgManager from "../Msg/MsgManager";
const msgManager = useMainMsgManager();


const scroller_ref = /**@type { import('vue').Ref<QueryFormScrollerDataset> } */ (ref());
const fwManager = new FWManager();


const insert_mode = ref(false);
const form_elem = ref();

const dataset1 = new Dataset();
const rowid    = dataset1.get_index_ref();
dataset1.assosiate_form(form_elem);

const src1 = dataset1.create_source_query();
const sync_pracownicy = dataset1.create_table_sync('pracownicy',);
const sync_place      = dataset1.create_table_sync('płace');
const podstawa_hints_src = dataset1.create_simple_source_query();
const kwota_hints_src    = dataset1.create_simple_source_query();

const prac_rowid     = dataset1.create_value_synced("ID pracownika",     0,  sync_pracownicy, sync_place, src1);
const prac_imie      = dataset1.create_value_synced("imię",              '', sync_pracownicy, src1);
const prac_nazwisko  = dataset1.create_value_synced("nazwisko",          '', sync_pracownicy, src1);
const prac_uro       = dataset1.create_value_synced("data urodzenia",    '', sync_pracownicy, src1);
const prac_miejsce   = dataset1.create_value_raw   ("miejsce urodzenia", '', src1);

const place_rowid    = dataset1.create_value_raw   ("max ID płac",      0,  [src1, 'max(`ID płac`)']);
const place_kwota    = dataset1.create_value_synced("kwota",            '', sync_place, src1);
const place_podstawa = dataset1.create_value_synced("podstawa",         '', sync_place, src1);
const place_miesiac  = dataset1.create_value_synced("miesiąc płacenia", '', sync_place, src1);

sync_pracownicy.add_primary("ID pracownika", prac_rowid);
sync_place.add_primary("ID płac", place_rowid)

const upper_imie = ref('');
src1.select_bind(upper_imie, 'IMIĘ CAPS', 'upper(`imię`)');
src1.select_raw('NAZWISKO CAPS', 'upper(`nazwisko`)');
src1.set_body_query_and_finalize(['FROM `pracownicy` NATURAL LEFT JOIN `płace` WHERE `ID pracownika` = ', rowid])


podstawa_hints_src.set_query(['SELECT DISTINCT podstawa FROM `płace`']);
const podstawa_hints = podstawa_hints_src.to_computed((rows) => {
    return rows.map(x => x[0]);
});

kwota_hints_src.set_query(['SELECT K - S, K, K + S FROM (SELECT max(`ID płac`), kwota as K, `ID pracownika` as S FROM płace WHERE `ID pracownika` = ', rowid, ')']);
const kwota_hints = kwota_hints_src.to_computed((rows) => {
    return rows.length > 0 ? rows[0] : [];
});


const scroller_query_name  = 'rowid';
const scroller_query_from  = '`pracownicy`';
const scroller_query_where = '';

// FIND

function handle_find(columns, row) {
    fwManager.close_window("Test - Znajdź");
    scroller_ref.value.goto(row[0]);
    // rowid.value = row[0];
}

function on_click_find() {
    fwManager.open_or_reopen_window("Test - Znajdź", QueryViewer, {
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
        step: 3,
        limit: 3,
        selectable: true,
    }, {
        select: handle_find
    });
}

// Unnesesary
const debug_update_query = ref('');
function update_debug_update_query() {
    if(insert_mode.value){
        debug_update_query.value = sync_pracownicy.get_insert_query() + '\n' + sync_place.get_insert_query();
    }else{
        debug_update_query.value = sync_pracownicy.get_update_query() + '\n' + sync_place.get_update_query();
    }
}
update_debug_update_query();

const debug_res = ref({});
const debug_res_str = computed(() => {
	let r = '';
	for(let key in debug_res.value)
		r += key + ': ' + debug_res.value[key][0] + '\n';
	return r;
});
function update_debug_res(aha) {
    console.log('UPDATE_DEBUG_RES', aha);
    const [res1] = aha;
    const parsed = query_result_to_object(res1);
    // console.log('res1', res1, parsed);
    debug_res.value = parsed;
}


async function update_all_and_refresh(bypass_validation = false){
    if(!bypass_validation && !form_elem.value.reportValidity()){
        return;
    }
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
    msgManager.postError(err);
}

defineExpose({
    dataset1
});

// console.log('QUERY PROPS', query_props);
// console.log('ROWID', rowid, rowid.value);
// console.log('VALUES', prac_rowid, prac_imie, prac_nazwisko);

function on_changed(new_index, rows) {
    update_debug_res(rows[0]);
}

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
        <button @click="update_all_and_refresh()    .then(() => scroller_ref.refresh()).catch(handle_err)" > UPDATE  </button>
        <button @click="update_all_and_refresh(true).then(() => scroller_ref.refresh()).catch(handle_err)" > UPDATE  BYPASS</button> <br>
        <button @click="dataset1.perform_query_and_refresh_all().then(update_debug_res).catch(handle_err)" > REFRESH </button>
        <button @click="dataset1.perform_query_and_replace_all().then(update_debug_res).catch(handle_err)" > REPLACE </button>
        <button @click="dataset1.perform_query_and_retcon_all() .then(update_debug_res).catch(handle_err)" > RETCON  </button>
	</div>


	<div class="container">
        ROWID:    <input type="number" v-model="prac_rowid.local.value" :class="{changed: prac_rowid.is_changed()}"> <br>
        IMIĘ:     <input type="text" v-model="prac_imie.local.value" :class="{changed: prac_imie.is_changed()}">  <br>
        NAZWISKO: <input type="text" v-model="prac_nazwisko.local.value" :class="{changed: prac_nazwisko.is_changed()}">  <br>
        <input type="button" value="ZNAJDŹ" @click="on_click_find">  <br>
    </div>
    <p>KWOTA_HINTS: {{ kwota_hints }}</p>
    <p>PODSTAWA_HINTS: {{ podstawa_hints }}</p>
    <p>CHANGED: {{ dataset1.is_changed_ref }}</p>
    <p>INSERT: {{ insert_mode }}</p>
    <fieldset class="form_fieldset">
        <legend>FORM</legend>
        <form ref="form_elem" class="form">
            <label class="label">ROWID PRAC:       </label> <FormInput type="integer"            :value="prac_rowid"   :max="30" nonull/>
            <label class="label">IMIĘ:             </label> <FormInput type="text"    :len="15"  :value="prac_imie"    pattern="[A-Z][a-z]+" nonull />
            <label class="label">NAZWISKO:         </label> <FormInput type="text"    :len="15"  :value="prac_nazwisko" :class="{wide: (prac_rowid.local.value?.toString().length ?? 0) < 5}"            />
            <label class="label">URODZINY:         </label> <FormInput type="date"               :value="prac_uro"             />
            <label class="label">KWOTA:            </label> <FormInput type="number"             :value="place_kwota"   class="wide" />
            <label class="label">KWOTA HINT:       </label> <FormInput type="number"             :value="place_kwota"  :hints="kwota_hints" class="wide" />
            <label class="label">KWOTA D:          </label> <FormInput type="decimal"            :value="place_kwota"               />
            <label class="label">ROWID PŁAC:       </label> <FormInput type="integer"            :value="place_rowid"  readonly     />
            <label class="label">MIEJSCE URODZENIA:</label> <FormInput type="text"    :len="3"   :value="prac_miejsce" readonly     />
            <label class="label">PODSTAWA normal:  </label> <FormEnum  :value="place_podstawa" :options="['nadgodziny', ['premia', 'PREMIA+++'], 123, [456, 'liczba'], ['456', 'liczba str']]"  />
            <label class="label">PODSTAWA rdonly:  </label> <FormEnum  :value="place_podstawa" :options="['nadgodziny', ['premia', 'PRIA++'], 123]"  readonly   />
            <label class="label">PODSTAWA nonull:  </label> <FormEnum  :value="place_podstawa" :options="['nadgodziny', 'premia', 'wypłata']"  nonull   />
            <label class="label">PODSTAWA UNIQUE:  </label> <FormEnum  :value="place_podstawa" :options="podstawa_hints" />
            <label class="label">PODSTAWA Hint:    </label> <FormInput type="text" :value="place_podstawa" :hints="podstawa_hints" />
            <label class="label">Date:             </label> <FormInput type="date" :value="place_miesiac"/>
            <label class="label">Datetime-local:   </label> <FormInput type="datetime-local" :value="place_miesiac"/>
        </form>
    </fieldset>
    
    <br>

	<textarea cols="30" rows="10" :value="debug_res_str"></textarea>

    <br>
    <br>

    <QueryFormScrollerDataset
        class="fixed_bottom"
        :query_value_name="scroller_query_name"
        :query_from="scroller_query_from"
        :query_where="scroller_query_where"
        :datasets="[dataset1]"
        v-model:insert_mode="insert_mode"
        @changed="on_changed"
        @error="handle_err"
        insertable
        ref="scroller_ref"/> 

    <FWCollection :manager="fwManager" />

    
    <!-- <QueryFormScroller :query_props="query_props" v-model:value="rowid" ref="scroller_ref" /> -->
     
    <!-- <QueryFormScroller 
        class="fixed_bottom"
        :query_value_name="scroller_query_name"
        :query_from="scroller_query_from"
        :query_where="scroller_query_where"
        :initial_value="rowid"
        :before_change="before_change_scroll"
        @changed="handle_changed_scroll"
        @refresh_request="handle_refresh_request_scroll"
        @error="handle_err"
        ref="scroller_ref"/> -->

</template>

<style scoped>

    .fixed_bottom {
        overflow-x: auto;
        position: fixed;
        bottom: 0px;
        left: 0px;
        right: 0px;
    }

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