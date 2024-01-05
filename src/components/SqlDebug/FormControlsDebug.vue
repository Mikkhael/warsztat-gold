<script setup>
//@ts-check

import { escape_sql_value, query_row_to_object } from '../../utils';
import ipc from '../../ipc';

import {FormInput} from '../Controls';

import {FormManager} from '../../FormManager'; 
import QueryFormScroller from '../QueryFormScroller.vue';
import {ref, reactive, watch, computed} from 'vue';


const form_scroller = /**@type { import('vue').Ref<QueryFormScroller> } */ (ref());

const query_props = reactive({
	value_name: "`rowid`",
	where: "",
	from: "`pracownicy`",
});

const form1_fetch_query = ` SELECT 
    \`ID pracownika\`       as \`prac_rowid\`,
    \`imię\`                as \`prac_imię\`,
    \`nazwisko\`            as \`prac_nazwisko\`,
    \`miejsce urodzenia\`   as \`prac_miejsce urodzenia\`,
    max(\`ID płac\`)        as \`place_ID płac\`,
    \`kwota\`               as \`place_kwota\`
    FROM    \`pracownicy\` NATURAL LEFT JOIN \`płace\`
    WHERE   \`ID pracownika\` = {{rowid}};
`;

const form_elem = ref();
const form1 = new FormManager(form_elem);
const rowid         = form1.new_local("rowid_scroller", 0);
console.log('A"', rowid);

const form1_fetch_query_ref = computed(() => {
    console.log(rowid);
    return form1_fetch_query.replace(`{{rowid}}`, escape_sql_value(rowid.as_value()));
});

form1.set_fetch_query(form1_fetch_query_ref);

const prac_rowid    = form1.new_remote("prac_rowid", 0);
const prac_imie     = form1.new_remote("prac_imię", '');
const prac_nazwisko = form1.new_remote("prac_nazwisko", '');
const prac_miejsce  = form1.new_local ("prac_miejsce urodzenia", '');

const place_rowid   = form1.new_local ("place_ID płac", 0);
const place_kwota   = form1.new_remote("place_kwota", '');

const pracownicy    = form1.add_table_sync('pracownicy', 'prac_', {'rowid': rowid});
const place         = form1.add_table_sync('płace', 'place_', {'rowid': place_rowid});


const update_query = ref("");

watch(rowid.as_ref(), async (newValue) => {
    let row = await form1.fetch_row_and_replace().catch(err => {
        console.error(err);
        return {"Błąd": "Składni"};
    });
    update_res(row);
});

// Unnesesary
const res = ref({});
const res_str = computed(() => {
	let r = '';
	for(let key in res.value) {
		r += key + ': ' + res.value[key] + '\n';
	}
	return r;
})


function update_res(row) {
    if(Object.keys(row).length <= 0) {
        res.value = {"Nic": "nie ma"};
        return;
    }
    res.value = row;
    return row;
}

async function update_all_and_refresh(bypass_validation = false){
    const [updated_rows, row] = await form1.update_all_and_refresh(false, bypass_validation);
    console.log("Updated rows: ", updated_rows);
    if(row) update_res(row);
}

function handle_err(/**@type {Error} */ err) {
    if(err.message ==  'Form Invalid') {
        console.log('Form Invalid');
        return;
    }
    console.error(err);
}

</script>


<template>

	<div class="container">
		<button @click="ipc.db_open()">OPEN</button>
		<!-- <div>Query Value Name: <input type="text" v-model.lazy="query_props.value_name"></div>
		<div>Query From: <input type="text" v-model.lazy="query_props.from"></div>
		<div>Query Where: <input type="text" v-model.lazy="query_props.where"></div> -->
		<div>Curr Value: <input type="text" v-model.lazy="rowid.value.value"></div>
        <button @click="update_query = pracownicy.get_update_query() + '\n' + place.get_update_query();">Update Query Refresh</button> <br>
        <textarea>{{ update_query }}</textarea> <br>
        <button @click="update_all_and_refresh()    .then(() => form_scroller.refresh()).catch(handle_err)" > UPDATE  </button>
        <button @click="update_all_and_refresh(true).then(() => form_scroller.refresh()).catch(handle_err)" > UPDATE  BYPASS</button> <br>
        <button @click="form1.fetch_row_and_refresh().then(update_res).catch(handle_err)" > REFRESH </button>
        <button @click="form1.fetch_row_and_replace().then(update_res).catch(handle_err)" > REPLACE </button>
        <button @click="form1.fetch_row_and_retcon() .then(update_res).catch(handle_err)" > RETCON  </button>
	</div>


	<div class="container">
        ROWID:    <input type="number" v-model="prac_rowid.value.value" :class="{changed: prac_rowid.changed.value}"> <br>
        IMIĘ:     <input type="text" v-model="prac_imie.value.value" :class="{changed: prac_imie.changed.value}">  <br>
        NAZWISKO: <input type="text" v-model="prac_nazwisko.value.value" :class="{changed: prac_nazwisko.changed.value}">  <br>
    </div>
    <form ref="form_elem">
        <fieldset class="form">
            <legend>FORM</legend>
            ROWID PRAC: <FormInput type="integer"            :formValue="prac_rowid"   :properties="{max: 5}" nonull/>    <br>
            IMIĘ:       <FormInput type="text"    :len="15"  :formValue="prac_imie"    :properties="{
                pattern: /[A-Z][a-z]+/.source,
            }" nonull /> <br>
            NAZWISKO:          <FormInput type="text"    :len="15"  :formValue="prac_nazwisko"             /> <br>
            KWOTA:             <FormInput type="number"             :formValue="place_kwota"               /> <br>
            KWOTA D:           <FormInput type="decimal"            :formValue="place_kwota"               /> <br>
            ROWID PŁAC:        <FormInput type="integer"            :formValue="place_rowid"  readonly     /> <br>
            MIEJSCE URODZENIA: <FormInput type="text"    :len="3"   :formValue="prac_miejsce" readonly     /> <br>
        </fieldset>
    </form>
    
	<textarea cols="30" rows="10" :value="res_str"></textarea>



    <QueryFormScroller :query_props="query_props" v-model:value="rowid.value.value" ref="form_scroller" />

</template>

<style scoped>

    .container .changed {
        background-color: #f1c4c4;
    }

</style>