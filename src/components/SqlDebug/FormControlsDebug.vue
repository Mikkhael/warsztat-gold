<script setup>
//@ts-check

import { escape_sql_value, query_row_to_object } from '../../utils';
import ipc from '../../ipc';

import {FormManager} from '../../FormManager'; 
import QueryFormScroller from '../QueryFormScroller.vue';
import {ref, reactive, watch, computed} from 'vue';

const form_scroller = ref();

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

const form1_fetch_query_ref = computed(() => {
    return form1_fetch_query.replace(`{{rowid}}`, rowid.value);
});

form1.set_fetch_query(form1_fetch_query_ref);

const prac_rowid    = form1.new_remote("prac_rowid", 0);
const prac_imie     = form1.new_remote("prac_imię", '');
const prac_nazwisko = form1.new_remote("prac_nazwisko", '');

const pracownicy    = form1.add_table_sync('pracownicy', 'prac_', {'rowid': rowid });


const update_query = ref("");
const res = ref({});
const res_str = computed(() => {
	let r = '';
	for(let key in res.value) {
		r += key + ': ' + res.value[key] + '\n';
	}
	return r;
})




watch(form1_fetch_query_ref, async (newValue) => {
    // let [rows, col_names] = await ipc.db_query(`SELECT rowid as rowid,* FROM ${query_props.from} WHERE ${query_props.value_name} = ${escape_sql_value(newValue)}`).catch(err => {
    let row = await form1.fetch_row_and_replace().catch(err => {
        console.error(err);
        return {"Błąd": "Składni"};
    });

    if(Object.keys(row).length <= 0) {
        res.value = {"Nic": "nie ma"};
        return;
    }
    res.value = row;
});

</script>


<template>

	<div class="container">
		<button @click="ipc.db_open()">OPEN</button>
		<!-- <div>Query Value Name: <input type="text" v-model.lazy="query_props.value_name"></div>
		<div>Query From: <input type="text" v-model.lazy="query_props.from"></div>
		<div>Query Where: <input type="text" v-model.lazy="query_props.where"></div> -->
		<div>Curr Value: <input type="text" v-model.lazy="rowid.value"></div>
        <button @click="update_query = pracownicy.get_update_query();">Update Query Refresh</button> <br>
        <textarea>{{ update_query }}</textarea> <br>
        <button @click="form1.update_all().catch(err => console.error(err)).then(() => form_scroller.state.expire())" > UPDATE  </button>
        <button @click="form1.fetch_row_and_refresh().catch(err => console.error(err))" > REFRESH </button>
        <button @click="form1.fetch_row_and_replace().catch(err => console.error(err))" > REPLACE </button>
        <button @click="form1.fetch_row_and_retcon() .catch(err => console.error(err))" > RETCON  </button>
	</div>


	<div class="container">
        ROWID:    <input type="number" v-model="prac_rowid.value" :class="{changed: prac_rowid.value != prac_rowid.true_value}"> <br>
        IMIĘ:     <input type="text" v-model="prac_imie.value" :class="{changed: prac_imie.value != prac_imie.true_value}">  <br>
        NAZWISKO: <input type="text" v-model="prac_nazwisko.value" :class="{changed: prac_nazwisko.value != prac_nazwisko.true_value}">  <br>
    </div>
    
	<textarea cols="30" rows="10" :value="res_str"></textarea>



    <QueryFormScroller :query_props="query_props" v-model:value="rowid.value" ref="form_scroller" />

</template>

<style scoped>

    .changed {
        background-color: #f1c4c4;
    }

</style>