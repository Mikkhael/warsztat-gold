//@ts-check

let last_UID = 0n;
function generate_UID(){
	const uid = `UID_${last_UID}`;
	last_UID = last_UID + 1n;
	console.log("NEW UID", uid);
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

function escape_like(/**@type {string} */ value) {
	const res1 = value.replace(/([%_\\])/g, '\\$1');
	const res2 = res1.replace(/\"/g, '""');
	return res2;
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

export {
	generate_UID,
	escape_sql_value,
	escape_backtick,
	escape_like,
	arr_to_object,
	query_row_to_object,
	query_result_to_object,
	iterate_query_result_values,
	iterate_query_result_values_single_row,
	object_map,
	typeofpl
}