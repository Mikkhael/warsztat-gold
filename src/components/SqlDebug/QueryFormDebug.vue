<script setup>
//@ts-check

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

const before_change_wait  = ref(0);
const before_change_allow = ref(true);

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

/**
 * @param {number} delay 
 */
function wait(delay){
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(undefined);
		}, delay);
	});
}

async function before_change(){
	if(before_change_wait.value !== 0) {
		await wait(before_change_wait.value);
	}
	return before_change_allow.value;
}

function handle_changed(new_value) {
	value.value = new_value;
}

function handle_error(err) {
	console.error(err);
}

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
		<div>Update timeout: <input type="number" v-model.lazy="before_change_wait"></div>
		<div>Update allow: <input type="checkbox" v-model.lazy="before_change_allow"></div>
	</div>

	<div>
		Current value = {{ value }}
	</div>

	<div>
		<QueryFormScroller 
			:query_value_name="query_props.value_name"
			:query_from="query_props.from"
			:query_where="query_props.where"
			:initial_value="value"
			:before_change="before_change"
			@changed="handle_changed"
			@error="handle_error"
			ref="scroller_ref"/>
	</div>

	<textarea cols="30" rows="10" :value="res_str"></textarea>

</template>