//@ts-check

import { computed, isRef, ref, shallowRef, triggerRef } from 'vue';

let last_UID = 0n;
function generate_UID(){
	const uid = `UID_${last_UID}`;
	last_UID = last_UID + 1n;
	// console.log("NEW UID", uid);
	return uid;
}

function typeofpl(value){
	switch(typeof value) {
		case "bigint" : 	return 'duża liczba';
		case "string":		return 'tekst';
		case "number":		return 'liczba';
		case "boolean":		return 'tak/nie';
		case "symbol":		return 'symbol';
		case "undefined":	return 'n/d';
		case "object":		return 'objekt';
		case "function":	return 'funkcja';
	}
}

/**
 * @param {number | bigint | string | null} value 
 * @returns 
 */
function escape_sql_value(value){
	if(typeof value === 'number' || typeof value === 'bigint'){
		return value.toString();
	} else if(value === null) {
		return 'NULL';
	} else if(value === undefined) {
		console.error(`ESCAPING AN UNDEFINED VALUE `, value);
		return 'NULL';
	} else if(typeof value === 'object') {
		console.error(`ESCAPING AN OBJECT VALUE `, value);
		return 'NULL';
	} else {
		return '"' + value.toString().replace(/"/g, '""') + '"';
	}
}

function escape_backtick(/**@type {string} */ value) {
	if(value.indexOf('`') != -1) {
		console.error("Invalid column name: ", value);
	}
	return "`" + value + "`";
}
function escape_backtick_smart(/**@type {string} */ value) {
	if(value.indexOf('`') !== -1) return value;
	return escape_backtick(value);
}

function escape_like(/**@type {string} */ value) {
	const res1 = value.replace(/([%_\\])/g, '\\$1');
	const res2 = res1.replace(/\"/g, '""');
	return res2;
}
function escape_like_full(/**@type {string} */ value) {
	return`LIKE "%${escape_like(value)}%" ESCAPE '\\'`;
}

/**
 * @template T
 * @param {string[]} arr 
 * @param {(id: number, key: string) => T} val_map 
 * @return {Object.<string, T>}
 */
function arr_to_object(/**@type {string[]} */ arr, val_map){
	return Object.fromEntries(arr.map((key, id) => [key, val_map(id, key)]));
}

/**
 * 
 * @param {any[]} row 
 * @param {string[]} col_names 
 * @returns 
 */
function query_row_to_object(row, col_names) {
	/**@type {Object.<string, any>} */
	const res = {};
	for(let i = 0; i < col_names.length; i++) {
		res[col_names[i]] = row[i];
	}
	return res;
}

/**
 * @param {any[][]} arr 
 */
function transpose_array(arr) {
	/**@type {any[][]} */
	const transpose = [];
	for (let i = 0; i < arr.length; i++) {
		const row = arr[i];
		for (let j = 0; j < row.length; j++) {
			if(i===0) transpose[j] = [];
			transpose[j].push(row[j]);
		}
	}
	return transpose;
}

/**
 * @typedef {import('./ipc').IPCQueryResult} RawQueryResult
 * @typedef {Object.<string, (number | string | null)[]>} ObjectQueryResult
 */

function query_result_to_object(/**@type {RawQueryResult} */ query_res) {
	if(!query_res) return {};
	const [rows, col_names] = query_res;
	const transpose = transpose_array(rows);
	const res = Object.fromEntries(col_names.map((x,i) => [x, transpose[i]]));
	return res;
}

/**
 * @param {RawQueryResult} result
 * @param {(value: (string | number | null), column_name: string, row_id: number) => void} callback 
 */
function iterate_query_result_values(result, callback) {
	const [rows, columns] = result;
	rows.forEach((row, row_id) => {
		columns.forEach((col_name, col_id) => {
			callback(row[col_id], col_name, row_id);
		});
	});
}
/**
 * @param {RawQueryResult} result
 * @param {(value: (string | number | null), column_name: string) => void} callback 
 */
function iterate_query_result_values_single_row(result, callback, row_id=0) {
	const [rows, columns] = result;
	if(rows.length < 1) return;
	const row = rows[row_id];
	columns.forEach((col_name, col_id) => {
		callback(row[col_id], col_name);
	});
}

/**
 * 
 * @param {object} object 
 * @param {(value: any, key: string) => any} map_function 
 * @returns
 */
function object_map(object, map_function) {
	return Object.fromEntries(Object.entries(object).map(([key, value]) => map_function(value, key)));
}

function pad(str, width = 2, space = '0') {
	str = str.toString();
	if(str.length < width){
		return space.repeat(width - str.length) + str;
	}
	return str;
}

/**@param {Date} d */
function date(d) {
	return pad(d.getFullYear(), 4) + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
}
/**@param {Date} d */
function time(d){
	return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}
/**@param {Date} d */
function datetime(d){
	return date(d) + ' ' + time(d);
}

function date_now()    { return date    (new Date()); };
function time_now()    { return time    (new Date()); };
function datetime_now(){ return datetime(new Date()); };

let current_datetime_now = datetime_now();
let current_datetime_now_outdated = ref(false);
const datetime_now_reactive = computed(() => {
	if(current_datetime_now_outdated.value) {
		current_datetime_now = datetime_now();
		current_datetime_now_outdated.value = false;
		console.log('FETCHING DATE');
	}
	console.log('RECOMPUTING DATE');
	return current_datetime_now;
});
function poke_datetime_now_reactive(){
	current_datetime_now_outdated.value = true;
}
setInterval(poke_datetime_now_reactive, 500);

function use_datetime_now(){
	return datetime_now_reactive;
}





// console.log('DATE DEBUG 1- ', new Date());
// console.log('DATE DEBUG 1- ', date_now());
// console.log('DATE DEBUG 1- ', time_now());
// console.log('DATE DEBUG 1- ', datetime_now());
// console.log('DATE DEBUG "2023-01-05         "- ', str_to_date_local('2023-01-05')         ); //Jan 05 2023 01:00:00 GMT+0100
// console.log('DATE DEBUG "2023-01-05 00:00:00"- ', str_to_date_local('2023-01-05 00:00:00')); //Jan 05 2023 00:00:00 GMT+0100
// console.log('DATE DEBUG "2023-01-05 01:00:00"- ', str_to_date_local('2023-01-05 01:00:00')); //Jan 05 2023 01:00:00 GMT+0100
// console.log('DATE DEBUG "2023-01-05 23:30:00"- ', str_to_date_local('2023-01-05 23:30:00')); //Jan 05 2023 23:30:00 GMT+0100
// console.log('DATE DEBUG "2024-10-25 23:30:00"- ', str_to_date_local('2024-10-25 23:30:00')); //Oct 25 2024 23:30:00 GMT+0200
// console.log('DATE DEBUG "2024-10-25         "- ', str_to_date_local('2024-10-25')         ); //Oct 25 2024 02:00:00 GMT+0200
// console.log('DATE DEBUG "2024-10-25 00:00:00"- ', str_to_date_local('2024-10-25 00:00:00')); //Oct 25 2024 00:00:00 GMT+0200
// function str_to_date_local(/**@type {string} */ date_str) {
// 	// return new Date(Date.parse(date_str));
// 	return new Date(date_str);
// }

function str_to_date(/**@type {string} */ date_str) {
	if(date_str.match(/^\d\d\d\d-\d\d-\d\d$/)) date_str += ' 00:00:00';
	if(!date_str.match(/^\d\d\d\d-\d\d-\d\d[ T]\d\d:\d\d(?::\d\d)?$/)){
		console.error('Invalid date_str format: ' + date_str);
	}
	return new Date(Date.parse(date_str));
}

// a.toLocaleDateString('pl-PL', {year: 'numeric', month: 'long', day: 'numeric'})
function format_date_str_local(/**@type {string} */ date_str) {
	const date = str_to_date(date_str);
	const res = date.toLocaleDateString('pl-PL', {year: 'numeric', month: 'long', day: 'numeric'});
	// console.log('PARSING DATE', date_str, date, res);
	return res
}


/**
 * @template T
 * @param {()=>Promise.<T>} async_function 
 */
function as_promise(async_function) {
	return async_function();
}

///// Reactivity ////

// /**
//  * @template T
//  * @param {T} value
//  * @param {((nwe_value: import('vue').UnwrapRef<T>, 
//  *           old_value: import('vue').UnwrapRef<T>) => any) | undefined} on_change
//  */
// function watchedRef(value, on_change) {
// 	if(on_change === undefined) {
// 		return ref(value);
// 	}
// 	const _value = ref(value);
// 	return computed({
// 		get() { return _value.value; },
// 		set(new_value) {
// 			on_change(new_value, _value.value);
// 			_value.value = new_value;
// 		}
// 	});
// }

/**
 * @template T
 * @typedef {import('vue').Ref<T> & {reas: (ref: import('vue').Ref<T>) => void}} ReasRef
 */

/**
 * @template T
 * @param {T} val
 * @returns {ReasRef<import('vue').UnwrapRef<T>>}
 */
function reasRef(val) {
    const _ref = shallowRef([ref(val)]);
    const _computed = computed({
		get()  {return _ref.value[0].value;	    },
		set(n) {       _ref.value[0].value = n; }
	});
	/**@param { import('vue').Ref<import('vue').UnwrapRef<T>>} ref */
	const reas = (ref) => {
		_ref.value[0] = ref;
		triggerRef(_ref);
	}
	return Object.assign(_computed, {reas});
}




export {
	generate_UID,
	escape_sql_value,
	escape_backtick,
	escape_backtick_smart,
	escape_like,
	escape_like_full,
	arr_to_object,
	query_row_to_object,
	query_result_to_object,
	iterate_query_result_values,
	iterate_query_result_values_single_row,
	object_map,
	typeofpl,
	as_promise,

	date,
	time,
	datetime,
	date_now,
	time_now,
	datetime_now,

	use_datetime_now,
	poke_datetime_now_reactive,

	str_to_date,
	format_date_str_local,

	reasRef,
	// watchedRef
}