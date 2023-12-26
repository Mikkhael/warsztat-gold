
function escape_sql_value(value){
	if(typeof value === 'number' || typeof value === 'bigint'){
		return value.toString();
	} else {
		return '"' + value.toString().replace(/"/g, '""') + '"';
	}
}

function arr_to_object(/**@type {string[]} */ arr, val_map = function(/**@type {string}*/ key) {return /**@type {*}*/(undefined);} ){
	return Object.fromEntries(arr.map(key => [key, val_map(key)]));
}

function query_row_to_object(row, col_names) {
	const res = {};
	for(let i = 0; i < col_names.length; i++) {
		res[col_names[i]] = row[i];
	}
	return res;
}

export {
	escape_sql_value,
	arr_to_object,
	query_row_to_object
}