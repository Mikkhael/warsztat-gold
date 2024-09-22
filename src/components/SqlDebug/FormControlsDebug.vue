<script setup>
//@ts-check

import { escape_sql_value, query_result_to_object, query_row_to_object } from '../../utils';
import ipc from '../../ipc';

import { Dataset, DVUtil } from '../Dataset/Dataset';
import {FormInput, FormEnum} from '../Controls';

import {FWManager} from '../FloatingWindows/FWManager';
import FWCollection from '../FloatingWindows/FWCollection.vue';

import QueryViewerOpenBtn from '../QueryViewer/QueryViewerOpenBtn.vue';
import QueryFormScrollerDataset from '../QueryFormScrollerDataset.vue';
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
src1.set_body_query_and_finalize(['FROM `pracownicy` NATURAL LEFT JOIN `płace` WHERE `ID pracownika` = ', rowid]);


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


// dataset2

// ID płac	ID pracownika	data	kwota	podstawa	miesiąc płacenia

const insert_mode2 = ref(false);
const form_elem2   = ref();

const dataset2 = dataset1.create_sub_dataset();
const index2   = dataset2.get_index_ref();
dataset2.assosiate_form(form_elem2);

// const p2_sync = dataset2.create_table_sync('płace');
const p2_src  = dataset2.create_source_query();

const p2_id       = dataset2.create_value_raw   ("ID płac",          null, p2_src);
const p2_data     = dataset2.create_value_synced("data",             null, p2_src, /*p2_sync*/);
const p2_kwota    = dataset2.create_value_synced("kwota",            null, p2_src, /*p2_sync*/);
const p2_podstawa = dataset2.create_value_synced("podstawa",         null, p2_src, /*p2_sync*/);
const p2_miesiac  = dataset2.create_value_synced("miesiąc płacenia", null, p2_src, /*p2_sync*/);

// p2_sync.add_primary('ID płac', p2_id);

p2_src.set_body_query_and_finalize(['FROM `płace` WHERE `ID pracownika` = ', rowid, ' AND `ID płac` = ', index2]);

const p2_scroller_query_name  = 'rowid';
const p2_scroller_query_from  = '`płace`';
const p2_scroller_query_where = DVUtil.sql_parts_ref(['`ID pracownika` = ', rowid]);

// dataset3 Simple

// ID płac	ID pracownika	data	kwota	podstawa	miesiąc płacenia

const form_elem3   = ref();

const dataset3 = dataset1.create_sub_dataset();
const index3   = dataset3.get_index_ref();
const offset3  = computed(() => index3.value - 1);
dataset3.assosiate_form(form_elem3);

const p3_src  = dataset3.create_source_query();
const p3_sync = dataset3.create_table_sync('płace');

const p3_id       = dataset3.create_value_raw   ("ID płac",          null, p3_src);
const p3_data     = dataset3.create_value_synced("data",             null, p3_src, p3_sync);
const p3_kwota    = dataset3.create_value_synced("kwota",            null, p3_src, p3_sync);
const p3_podstawa = dataset3.create_value_synced("podstawa",         null, p3_src, p3_sync);
const p3_miesiac  = dataset3.create_value_synced("miesiąc płacenia", null, p3_src, p3_sync);

p3_sync.add_primary('ID płac', p3_id);
p3_src.set_body_query_and_finalize(['FROM `płace` WHERE `ID pracownika` = ', rowid, ' LIMIT 1 OFFSET ', offset3]);

const p3_scroller_query_from  = DVUtil.sql_parts_ref(['`płace` WHERE `ID pracownika` = ', rowid]);
// const p3_scroller_query_from  = computed(() => `\`płace\` WHERE \`ID pracownika\` = ${rowid.value}`);


// FIND

const find_options = {
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
};

// Unnesesary
const debug_update_query = ref('');
function update_debug_update_query() {
    if(insert_mode.value){
        debug_update_query.value = sync_pracownicy.get_insert_query() + '\n' + sync_place.get_insert_query() + '\n' + p3_sync.get_insert_query();
    }else{
        debug_update_query.value = sync_pracownicy.get_update_query() + '\n' + sync_place.get_update_query() + '\n' + p3_sync.get_update_query();
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
    msgManager.postError(err);
}

defineExpose({
    dataset1,
    dataset2,
    dataset3
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
        <!-- <input type="button" value="ZNAJDŹ" @click="on_click_find">  <br> -->
        <QueryViewerOpenBtn v-bind="find_options" :scroller="scroller_ref" :fwManager="fwManager" @select="(x,y) => console.log('select', x, y)"/>

    </div>
    <p>KWOTA_HINTS: {{ kwota_hints }}</p>
    <p>PODSTAWA_HINTS: {{ podstawa_hints }}</p>
    <p>CHANGED: {{ dataset1.is_changed_ref }}</p>
    <p>INSERT: {{ insert_mode }}</p>
    <fieldset class="form_fieldset">
        <legend>FORM</legend>
        <form ref="form_elem" class="form" :class="{hidden: dataset1.empty.value}">
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
        <fieldset class="form_fieldset" :class="{hidden: insert_mode}">
            <legend>SUBFORM</legend>
            <form ref="form_elem2" class="form" :class="{hidden: dataset2.empty.value}">
                <label class="label">KWOTA:            </label> <FormInput type="number"  step="0.01" :value="p2_kwota" />
                <label class="label">PODSTAWA:         </label> <FormEnum  :value="p2_podstawa" :options="['nadgodziny', 'premia', 'wypłata']"  />
                <label class="label">DATA:             </label> <FormInput type="text" :value="p2_data"/>
                <label class="label">MIESIĄC PŁACENIA: </label> <FormInput type="date" :value="p2_miesiac"/>
            </form>
            
                <QueryFormScrollerDataset
                    :query_value_name="p2_scroller_query_name"
                    :query_from="p2_scroller_query_from"
                    :query_where="p2_scroller_query_where"
                    :datasets="[dataset2]"
                    @error="handle_err"/> 
        </fieldset>
        <fieldset class="form_fieldset" :class="{hidden: insert_mode}">
            <legend>SUBFORM SIMPLE</legend>
            <form ref="form_elem3" class="form" :class="{hidden: dataset3.empty.value}">
                <label class="label">KWOTA:            </label> <FormInput type="number"  step="0.01" :value="p3_kwota" />
                <label class="label">PODSTAWA:         </label> <FormEnum  :value="p3_podstawa" :options="['nadgodziny', 'premia', 'wypłata']"  />
                <label class="label">DATA:             </label> <FormInput type="text" :value="p3_data"/>
                <label class="label">MIESIĄC PŁACENIA: </label> <FormInput type="date" :value="p3_miesiac"/>
            </form>
            
                <QueryFormScrollerDataset simple
                    :query_from="p3_scroller_query_from"
                    :datasets="[dataset3]"
                    @error="handle_err"
                    @changed_index="x => console.log('CHANGED INDEX 3', x)"/> 
        </fieldset>
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
        @changed_insert_mode="x => insert_mode = x"
        @changed_index="on_changed"
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

    .hidden {
        visibility: hidden;
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