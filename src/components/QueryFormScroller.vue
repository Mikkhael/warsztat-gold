<script setup>

import { watch, ref } from "vue";
import ipc from "../ipc";

const props = defineProps(['query_props', 'value']);
const emit = defineEmits(['update:value']);

const min_value = ref(0);
const max_value = ref(0);
const none_found = ref(true);
const is_error   = ref(false);

let queries = {};
watch(props, async (newValue, oldValue) => {
	console.log("Updating query props", oldValue, newValue);
	queries = get_sql_queries(newValue.query_props);
	// console.log(queries);
	try{
		await update_bounds_and_current_value(newValue.value);
		is_error.value = false;
	} catch (err) {
		handle_err(err);
	}
}, {immediate: true});

function escape_sql_value(value){
	if(typeof value === 'number'){
		return value.toString();
	} else {
		return '"' + value.toString().replace(/"/g, '""') + '"';
	}
}

function get_bounds_query() {return queries.bounds;}
function get_next_query(value) {return queries.next.replace('{{}}', escape_sql_value(value))}
function get_curr_query(value) {return queries.curr.replace('{{}}', escape_sql_value(value))}
function get_prev_query(value) {return queries.prev.replace('{{}}', escape_sql_value(value))}
function get_last_query()  {return queries.last};
function get_first_query() {return queries.first};

function get_sql_queries(query_props) {
	const value_name = query_props.value_name ?? 'rowid';
	let from_raw     = query_props.from;
	let where_raw    = query_props.where;

	let where 		= where_raw ? `WHERE ${where_raw}` : '';
	let where_next  = `WHERE ` + ( where_raw ? `(${where_raw}) AND ` : `` ) + `${value_name} >  {{}}`;
	let where_curr  = `WHERE ` + ( where_raw ? `(${where_raw}) AND ` : `` ) + `${value_name} >= {{}}`;
	let where_prev  = `WHERE ` + ( where_raw ? `(${where_raw}) AND ` : `` ) + `${value_name} <  {{}}`;

	const bounds = `SELECT min(${value_name}), max(${value_name}) FROM ${from_raw} ${where};`;
	const next   = `SELECT ${value_name} FROM ${from_raw} ${where_next} ORDER BY ${value_name} ASC  LIMIT 1;`;
	const curr   = `SELECT ${value_name} FROM ${from_raw} ${where_curr} ORDER BY ${value_name} ASC  LIMIT 1;`;
	const prev   = `SELECT ${value_name} FROM ${from_raw} ${where_prev} ORDER BY ${value_name} DESC LIMIT 1;`;
	const first  = `SELECT ${value_name} FROM ${from_raw} ${where}      ORDER BY ${value_name} ASC  LIMIT 1;`;
	const last   = `SELECT ${value_name} FROM ${from_raw} ${where}      ORDER BY ${value_name} DESC LIMIT 1;`;

	return {
		bounds,
		next,
		curr,
		prev,
		first,
		last
	};
}

async function update_bounds_and_current_value(value = props.value){
	console.log('Updating bounds');
	const query_bounds = get_bounds_query();
	const [rows, col_names] = await ipc.db_query(query_bounds);
	if(rows.length <= 0) {
		console.log("Updating bounds - none found");
		min_value.value = 0;
		max_value.value = 0;
		none_found.value = true;
		return;
	}
	min_value.value = rows[0][0];
	max_value.value = rows[0][1];
	none_found.value = false;
	console.log("Updating bounds - ", min_value.value, max_value.value);
	await update_current_value(value);
	is_error.value = false;
}

async function update_current_value(value = props.value){
	console.log('Updating current');
	const query_curr = get_curr_query(value);
	let  [rows, col_names] = await ipc.db_query(query_curr);
	if(rows.length <= 0) {
		console.log('Updating current - bounds incorrect');
		const query_last = get_last_query();
		const [rows_last, col_names_last] = await ipc.db_query(query_last);
		if(rows_last.length <= 0) {
			console.log('Updating current - none found');
			none_found.value = true;
			rows = [[0]];
		} else {
			rows = rows_last;
		}
	}
	emit("update:value", rows[0][0]);
	console.log('Updating current - ', rows[0][0]);
	is_error.value = false;
}

async function click_prev() {
	console.log("click prev");
	const query_prev = get_prev_query(props.value);
	console.log(query_prev);
	const [rows, col_names] = await ipc.db_query(query_prev);
	if(rows.length <= 0) {
		console.log("click prev - none found");
	} else {
		console.log("click prev - ", rows[0][0]);
		emit("update:value", rows[0][0]);
	}
	is_error.value = false;
}
async function click_next() {
	console.log("click next");
	const query_next = get_next_query(props.value);
	const [rows, col_names] = await ipc.db_query(query_next);
	if(rows.length <= 0) {
		console.log("click next - none found");
	} else {
		console.log("click next - ", rows[0][0]);
		emit("update:value", rows[0][0]);
	}
	is_error.value = false;
}

function handle_err(err){
	console.error(err);
	is_error.value = true;
}

</script>

<template>

<div class="form_scroller" :class="{is_error, none_found}">
	<input type="button" class="btn prev" value="<" @click="click_prev().catch(handle_err)">
	<input type="text"   class="txt curr" :value="props.value" @change="update_current_value($event.target.value); $event.target.value = props.value;">
	<input type="button" class="btn next" value=">" @click="click_next().catch(handle_err)">
	<span  class="txt bounds"> {{ min_value }} .. {{ max_value }} </span>
</div>

</template>

<style>

.form_scroller {
	display: flex;
	flex-direction: row;
}

.form_scroller.is_error {
	background-color: rgb(255, 113, 113);
}
.form_scroller.none_fund .bounds {
	color: red;
}
.form_scroller.none_fund .curr {
	color: red;
}

</style>