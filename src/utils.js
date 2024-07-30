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

function escape_backtick(/**@type {string | undefined} */ value) {
    if(typeof value == "string") {
        if(value.indexOf('`') != -1) {
            console.error("Invalid column name: ", value);
        }
        return "`" + value + "`";
    }
    return value;
}

function escape_like(/**@type {string} */ value) {
	const res1 = value.replace(/([%_\\])/g, '\\$1');
	const res2 = res1.replace(/\"/g, '""');
	return res2;
}


function arr_to_object(/**@type {string[]} */ arr, val_map = function(/**@type {string}*/ key) {return /**@type {*}*/(undefined);} ){
	return Object.fromEntries(arr.map(key => [key, val_map(key)]));
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
 * @typedef {Object.<string, any[]>} ObjectQueryResult
 */

function query_result_to_object(/**@type {RawQueryResult} */ query_res) {
	const [rows, col_names] = query_res;
	const transpose = transpose_array(rows);
	const res = Object.fromEntries(col_names.map((x,i) => [x, transpose[i]]));
	return res;
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
	object_map,
	typeofpl
}