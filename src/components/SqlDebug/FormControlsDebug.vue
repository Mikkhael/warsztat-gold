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
    \`rowid\`       as \`prac_rowid\`,
    \`imię\`        as \`prac_imię\`,
    \`nazwisko\`    as \`prac_nazwisko\`
    FROM    \`pracownicy\`
    WHERE   rowid = {{rowid}};
`;

const form1 = new FormManager();
const rowid         = form1.new_local("rowid_scroller", 0);
console.log('A"', rowid);

const form1_fetch_query_ref = computed(() => {
    console.log(rowid);
    return form1_fetch_query.replace(`{{rowid}}`, rowid.as_value().toString());
});

form1.set_fetch_query(form1_fetch_query_ref);

const prac_rowid    = form1.new_remote("prac_rowid", 0);
const prac_imie     = form1.new_remote("prac_imię", '');
const prac_nazwisko = form1.new_remote("prac_nazwisko", '');

const pracownicy    = form1.add_table_sync('pracownicy', 'prac_', {'rowid': rowid});


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

async function update_all_and_refresh(){
    const [updated_rows, row] = await form1.update_all_and_refresh();
    console.log("Updated rows: ", updated_rows);
    if(row) update_res(row);
}

</script>


<template>

	<div class="container">
		<button @click="ipc.db_open()">OPEN</button>
		<!-- <div>Query Value Name: <input type="text" v-model.lazy="query_props.value_name"></div>
		<div>Query From: <input type="text" v-model.lazy="query_props.from"></div>
		<div>Query Where: <input type="text" v-model.lazy="query_props.where"></div> -->
		<div>Curr Value: <input type="text" v-model.lazy="rowid.value.value"></div>
        <button @click="update_query = pracownicy.get_update_query();">Update Query Refresh</button> <br>
        <textarea>{{ update_query }}</textarea> <br>
        <button @click="update_all_and_refresh().then(() => form_scroller.refresh()).catch(err => console.error(err))" > UPDATE  </button>
        <button @click="form1.fetch_row_and_refresh().then(update_res).catch(err => console.error(err))" > REFRESH </button>
        <button @click="form1.fetch_row_and_replace().then(update_res).catch(err => console.error(err))" > REPLACE </button>
        <button @click="form1.fetch_row_and_retcon() .then(update_res).catch(err => console.error(err))" > RETCON  </button>
	</div>


	<div class="container">
        ROWID:    <input type="number" v-model="prac_rowid.value.value" :class="{changed: prac_rowid.changed.value}"> <br>
        IMIĘ:     <input type="text" v-model="prac_imie.value.value" :class="{changed: prac_imie.changed.value}">  <br>
        NAZWISKO: <input type="text" v-model="prac_nazwisko.value.value" :class="{changed: prac_nazwisko.changed.value}">  <br>
    </div>

    <fieldset class="form">
        <legend>FORM</legend>
        ROWID:    <FormInput type="integer" :formValue="prac_rowid" max="5"/>      <br>
        IMIĘ:     <FormInput type="text"    :formValue="prac_imie" />       <br>
        NAZWISKO: <FormInput type="text"    :formValue="prac_nazwisko" />   <br>
    </fieldset>
    
	<textarea cols="30" rows="10" :value="res_str"></textarea>



    <QueryFormScroller :query_props="query_props" v-model:value="rowid.value.value" ref="form_scroller" />

</template>

<style scoped>

    .changed {
        background-color: #f1c4c4;
    }

</style>