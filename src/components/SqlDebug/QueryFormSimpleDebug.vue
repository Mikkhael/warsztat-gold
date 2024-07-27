<script setup>

import { escape_sql_value } from '../../utils';

import QueryFormScrollerSimple from '../QueryFormScrollerSimple.vue';
import ipc from '../../ipc';
import { computed, reactive, ref, watch } from 'vue';

const scroller_ref = ref();

const query = ref("`pracownicy` WHERE rowid%2==1 ORDER BY `imię` ASC");

const index = ref(0n);
const step = ref(1n);
const res = ref({});

const res_str = computed(() => {
	let r = '';
	for(let key in res.value) {
		r += key + ': ' + res.value[key] + '\n';
	}
	return r;
})

watch(index, async (newValue) => {
	console.log("New index value: ", newValue);
	try{
		newValue = BigInt(newValue);
	} catch (err) {
		if(err instanceof SyntaxError) {
			console.log("Debig Failed BigInt convertion from ", newValue);
			return; // Failed BigInt convertion - don't update
		} else throw err;
	}
	let [rows, col_names] = await ipc.db_query(`SELECT * FROM ${query.value} LIMIT 1 OFFSET ${newValue - 1n}`).catch(err => {
		console.error(err);
		return [
			[["Składni"]],
			["Błąd"]
		];
	});
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

defineExpose({
	scroller_ref
});

</script>


<template>

	<div class="container">
		<button @click="ipc.db_open()">OPEN</button>
		<div>Query: <input type="text" v-model.lazy="query" style="width: 100%"></div>
		<div>Index: <input type="text" v-model.lazy="index"></div>
		<div>Step: <input type="text" v-model.lazy="step"></div>
	</div>

	<div>
		Current index = {{ index }}
	</div>

	<div>
		<QueryFormScrollerSimple :query="query" :step="step" v-model:index="index" ref="scroller_ref"/>
	</div>

	<textarea cols="30" rows="10" :value="res_str"></textarea>

</template>