<script setup>

import { watch } from "vue";
import ipc from "../ipc";
import { P } from "@tauri-apps/api/event-41a9edf5";

const props = defineProps(['query_props', 'value']);
const emit = defineEmits(['update:value']);

const min_value = ref(0);
const max_value = ref(0);
const none_found = ref(true);

let queries = {};
watch(props.query_props, (oldValue, newValue) => {
	queries = get_sql_queries(newValue);
}, {immediate: true});

function get_bounds_query() {return queries.bounds;}
function get_next_query(value) {return queries.next.replace('{{}}', value)}
function get_prev_query(value) {return queries.prev.replace('{{}}', value)}
function get_last_query()  {return queries.last};
function get_first_query() {return queries.first};

function get_sql_queries(query_props) {
	const value_name = query_props.value_name ?? 'rowid';
	let from_raw     = query_props.from;
	let where_raw    = query_props.where;

	let where 		= where_raw ? `WHERE ${where_raw}` : '';
	let where_next  = where_raw ? `WHERE (${where_raw}) AND ${value_name} >= ` : `WHERE ${value_name} >= {{}}`;
	let where_prev  = where_raw ? `WHERE (${where_raw}) AND ${value_name} <= ` : `WHERE ${value_name} <= {{}}`;

	const bounds = `SELECT min(${value_name}), max(${value_name}) FROM ${from_raw} ${where};`;
	const next   = `SELECT ${value_name} FROM ${from_raw} ${where_next} ORDER BY ${value_name} ASC  LIMIT 1`;
	const prev   = `SELECT ${value_name} FROM ${from_raw} ${where_prev} ORDER BY ${value_name} DESC LIMIT 1`;
	const first  = `SELECT ${value_name} FROM ${from_raw} ${where}      ORDER BY ${value_name} ASC  LIMIT 1`;
	const last   = `SELECT ${value_name} FROM ${from_raw} ${where}      ORDER BY ${value_name} DESC LIMIT 1`;

	return {
		bounds,
		next,
		prev,
		first,
		last
	};
}

async function update_bounds(){
	const query_bounds = get_bounds_query();
	const [rows, col_names] = await ipc.db_query(query_bounds);
	if(rows.length <= 0) {
		min_value.value = 0;
		max_value.value = 0;
		none_found.value = true;
		return;
	}
	min_value.value = rows[0][0];
	max_value.value = rows[0][1];
	none_found.value = false;
	return await update_current_value();
}

async function update_current_value(){
	const query_next = get_next_query(props.value);
	const [rows, col_names] = await ipc.db_query(query_next);
	if(rows.length <= 0) {
		const query_first = get_first_query();
		const [rows_first, col_names_first] = await ipc.db_query(query_first);
		if(rows_first.length <= 0) {
			none_found.value = true;
			// TODO tu skończyłem
		}
	}
}

</script>

<template>



</template>