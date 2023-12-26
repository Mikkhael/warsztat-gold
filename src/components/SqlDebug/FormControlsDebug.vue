<script setup>
//@ts-check

import { escape_sql_value, query_row_to_object } from '../../utils';
import ipc from '../../ipc';

import {FormValuesCollection} from '../../ReactiveFormValues'; 
import QueryFormScroller from '../QueryFormScroller.vue';
import {ref, reactive, watch, computed} from 'vue';


const query_props = reactive({
	value_name: "`rowid`",
	where: "",
	from: "`pracownicy`",
});

const form1 = new FormValuesCollection();
const rowid         = form1.new_local("rowid_scroller", 0);

const prac_rowid    = form1.new_remote("prac_rowid", 0);
const prac_imie     = form1.new_remote("prac_imię", '');
const prac_nazwisko = form1.new_remote("prac_nazwisko", '');

const pracownicy    = form1.add_table_sync('pracownicy', {
    rowid: rowid.as_ref()
},{
    'rowid':    prac_rowid.as_ref(),
    'imię':     prac_imie.as_ref(),
    'nazwisko': prac_nazwisko.as_ref()
});


const update_query = ref("");
const res = ref({});
const res_str = computed(() => {
	let r = '';
	for(let key in res.value) {
		r += key + ': ' + res.value[key] + '\n';
	}
	return r;
})




watch(rowid.as_ref(), async (newValue) => {

let [rows, col_names] = await ipc.db_query(`SELECT rowid as rowid,* FROM ${query_props.from} WHERE ${query_props.value_name} = ${escape_sql_value(newValue)}`).catch(err => {
    console.error(err);
    return [
        [["Składni"]],
        ["Błąd"]
    ];
});

col_names = col_names.map(x => "prac_" + x);
form1.replace(query_row_to_object(rows[0], col_names));

if(rows.length <= 0) {
    res.value = {"Nic": "nie ma"};
    return;
}
let res2 = {};
for(let i in col_names){
    res2[col_names[i]] = rows[0][i];
}
res.value = res2;
});

</script>


<template>

	<div class="container">
		<button @click="ipc.db_open()">OPEN</button>
		<div>Query Value Name: <input type="text" v-model.lazy="query_props.value_name"></div>
		<div>Query From: <input type="text" v-model.lazy="query_props.from"></div>
		<div>Query Where: <input type="text" v-model.lazy="query_props.where"></div>
		<div>Curr Value: <input type="text" v-model.lazy="rowid.value"></div>
        <button @click="update_query = pracownicy.get_update_query();">Update Query Refresh</button> <br>
        <textarea>{{ update_query }}</textarea>
	</div>


	<div class="container">
        ROWID:    <input type="text" v-model="prac_rowid.value" :class="{changed: prac_rowid.value != prac_rowid.true_value}"> <br>
        IMIĘ:     <input type="text" v-model="prac_imie.value" :class="{changed: prac_imie.value != prac_imie.true_value}">  <br>
        NAZWISKO: <input type="text" v-model="prac_nazwisko.value" :class="{changed: prac_nazwisko.value != prac_nazwisko.true_value}">  <br>
    </div>
    
	<textarea cols="30" rows="10" :value="res_str"></textarea>



    <QueryFormScroller :query_props="query_props" v-model:value="rowid.value"  />

</template>

<style scoped>

    .changed {
        background-color: #f1c4c4;
    }

</style>