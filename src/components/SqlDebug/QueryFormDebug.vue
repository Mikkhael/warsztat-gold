<script setup>

import QueryFormScroller from '../QueryFormScroller.vue';
import ipc from '../../ipc';
import { computed, reactive, ref, watch } from 'vue';

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
		r += key + ': ' + res[key] + '\n';
	}
	return r;
})

watch(value, async (newValue) => {
	let [rows, col_names] = ipc.db_query(`SELECT * FROM ${query_props.from} WHERE ${query_props.value_name} = ${value.value}`);
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
		<div>Query Value Name: <input type="text" v-model="query_props.value_name"></div>
		<div>Query From: <input type="text" v-model="query_props.from"></div>
		<div>Query Where: <input type="text" v-model="query_props.where"></div>
		<div>Curr Value: <input type="text" v-model="value"></div>
	</div>

	<div>
		Current value = {{ value }}
	</div>

	<div>
		<QueryFormScroller :query_props="query_props" v-model:value="value" />
	</div>

	<textarea cols="30" rows="10" :value="res_str"></textarea>

</template>