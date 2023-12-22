<script setup>

import { escape_sql_value } from '../../utils';

import QueryFormScroller from '../QueryFormScroller.vue';
import ipc from '../../ipc';
import { computed, reactive, ref, watch } from 'vue';

const scroller_ref = ref();

const query_props = reactive({
	value_name: "`rowid`",
	where: "",
	from: "`pracownicy`",
});

const value = ref(0);
const res = ref({});

const res_str = computed(() => {
	let r = '';
	for(let key in res.value) {
		r += key + ': ' + res.value[key] + '\n';
	}
	return r;
})

watch(value, async (newValue) => {

	let [rows, col_names] = await ipc.db_query(`SELECT * FROM ${query_props.from} WHERE ${query_props.value_name} = ${escape_sql_value(newValue)}`).catch(err => {
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
		<div>Query Value Name: <input type="text" v-model.lazy="query_props.value_name"></div>
		<div>Query From: <input type="text" v-model.lazy="query_props.from"></div>
		<div>Query Where: <input type="text" v-model.lazy="query_props.where"></div>
		<div>Curr Value: <input type="text" v-model.lazy="value"></div>
	</div>

	<div>
		Current value = {{ value }}
	</div>

	<div>
		<QueryFormScroller :query_props="query_props" v-model:value="value" ref="scroller_ref"/>
	</div>

	<textarea cols="30" rows="10" :value="res_str"></textarea>

</template>