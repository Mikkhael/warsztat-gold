
function escape_sql_value(value){
	if(typeof value === 'number' || typeof value === 'bigint'){
		return value.toString();
	} else {
		return '"' + value.toString().replace(/"/g, '""') + '"';
	}
}

export {
	escape_sql_value
}