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
        return "'" + value.toString().replace(/'/g, "''") + "'";
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
 * @template {Object.<string, any>} T
 * @typedef {T extends Array ? string : Extract<keyof T, string>} Keysof
 */
/**
 * @template {Object.<string, any>} T
 * @typedef {T extends Array ? T[number] : T[Extract<keyof T, string>]} Valsof
 */

/**
 * @template {Object.<string, any>} T
 * @param {T} val 
 * @returns {Keysof<T>}
 */
function keysof(val) {
    //@ts-ignore
    return Object.keys(val);
}

/**
 * @template {Object.<string, any>} T
 * @template R
 * @param {T} obj 
 * @param {(val: Valsof<T>, key: T extends Array ? number : Keysof<T>) => R} map_function 
 * @returns {{[P in keyof T]: R}}
 */
function object_map(obj, map_function) {
    if(Array.isArray(obj)) {
        //@ts-ignore
        return obj.map((val, key) => map_function(val, key));
    }
    //@ts-ignore
    return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, map_function(value, key)]));
}


/**
 * @template T
 * @template [R=any]
 * @typedef {T extends Array ? LeafMapped<T[number], R>[] :
 * 			 T extends Object.<string, any> ?
 * 				{[P in keyof T]: LeafMapped<T[P], R>} :
 * 			 R } LeafMapped
 */

/**
 * @template T
 * @template [W=undefined]
 * @template [R=any]
 * @param {T} obj 
 * @param {(val: any, walk_acc: W) => R} map_function 
 * @param {(val: any, walk_acc: W) => boolean} [stopper]
 * @param {(key: string, acc: W) => W} [walk_reducer]
 * @param {W} [walk_acc]
 * @returns {LeafMapped<T,R>}
 */
function object_leaf_map(
        obj, 
        map_function, 
        stopper = val => typeof val !== 'object', 
        walk_reducer, 
        walk_acc) 
{
    //@ts-ignore
    if(stopper(obj, walk_acc)) return map_function(obj, walk_acc);
    //@ts-ignore
    return object_map(obj, (val, key) => object_leaf_map(
        val,
        map_function,
        stopper,
        walk_reducer,
        //@ts-ignore
        walk_reducer?.(key, walk_acc)
    ));
}

const TEST = () => {
    const leafmap_test = {
        a: {
          b: 1,
          c: '2'
        },
        d: [
          10,
          20,
          30
        ],
        e: 100,
        f: [
            {f1: 123, f2: '123'},
            {f1: 124, f2: '124'},
        ],
        g: [1,2,'3'],
        h: [
            'test1',
            ['test2'],
        ]
    };

    const leafmap_test_1 = object_leaf_map(leafmap_test, /**@returns {[any]} */ val => [val]);

    /**
     * @template T
     * @typedef {T extends Array ? CustomLeafMapped<T[number]>[] :
    * 			 T extends Object.<string, any> ?
    * 				{[P in keyof T]: CustomLeafMapped<T[P]>} :
    * 			 T extends string ? boolean : [T] } CustomLeafMapped
    */
    /**@type {CustomLeafMapped<typeof leafmap_test>}*/
    const leafmap_test_2 = object_leaf_map(leafmap_test, /**@returns {any} */ val => typeof val === 'string' ? val.length>1 : [val]);
    
    /**
     * @typedef {LeafMapped<typeof leafmap_test>} LeafMappedTest
     */

    /**
     * @template T
     * @param {T} val 
     * @param {string | number} key 
     * @returns {T extends boolean ? null : [T]}
    */
    //@ts-ignore
    function test_object_map(val, key) {return null};

    const t1 = [1,'tak',false];
    const t2 = {a: 1, b: 'tak', c:false};
    /**
     * @typedef {typeof t1} T1
     * @typedef {typeof t2} T2
     */

    const a1 = object_map(t1, test_object_map);
    const a2 = object_map(t2, test_object_map);

    /**@type {ReturnType<typeof test_object_map<T1[number]>>[]} */
    const b1 = object_map(t1, test_object_map);
    /**@type {{[P in keyof T2]: ReturnType<typeof test_object_map<T2[P]>>}} */
    //@ts-ignore
    const b2 = object_map(t2, test_object_map);

}



/**
 * @template T
 * @param {T} val 
 * @return {T}
 */
function deep_copy(val) {
    if(typeof val === 'object') {
        return window.structuredClone(val);
    }
    return val;
}

function deep_compare(val1, val2) {
    if(val1 === val2) return true;
    if(typeof val1 !== 'object' || typeof val2 !== 'object') return false;
    const keys1 = Object.keys(val1);
    const keys2 = Object.keys(val2);
    if(!array_compare(keys1, keys2)) return false;
    for(const key of keys1) {
        if(!deep_compare(val1[key], val2[key])) return false;
    }
    return true;
}

/**
 * @param {any[]} arr1 
 * @param {any[]} arr2 
 * @returns 
 */
function array_compare(arr1, arr2) {
    if(arr1.length !== arr2.length) return false;
    for(let i = 0; i < arr1.length; i++) {
        if(arr1[i] !== arr2[i]) return false;
    }
    return true;
}

/**
 * @returns {string}
 */
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
    if(date_str === '') return '';
    const date = str_to_date(date_str);
    const res = date.toLocaleDateString('pl-PL', {year: 'numeric', month: 'long', day: 'numeric'});
    // console.log('PARSING DATE', date_str, date, res);
    return res;
}

///////////////// DECIMAL //////////////

// list of non-digits, non minus
// optional minus ()
// string of zeros
// string of digits dec ()
// optional
//   separator
//   string of digits frac ()
// list of non-digits
const decimal_parse_adv_regex = /^[^\d\-]*(\-)?0*(\d*)(?:[\,\.](\d*))?\D*$/;

const parse_decimal_regex = /^[^\d\-]*(?:0(?=\d))*(\-?\d+(?:[\.\,]\d+)?)\D*$/;
const decimal_regex = /^\-?\d+(?:\.\d+)?$/;
const decimal_parts_regex = /^\+(\-?\d+)(\.\d+)?$/;
const decimal_neg_zero_regex = /^\-0+(?:\.0*)?$/;
function is_decimal(/**@type {string?} */ value) {return !!value?.match(decimal_regex);}
/**
 * Convert a decimal string (with possible sufix and comma), to only the number part (with dot separator)
 * @param {string?} source_string
 */
function parse_decimal(source_string) {
    const parts = parse_decimal_adv(source_string);
    if(!parts) return null;
    return parts[2];
}
/**
 * 
 * @param {string?} source_string 
 * @returns {[whole: string, frac: string, full: string, sign: string, sep: string, is_zero: boolean]?}
 */
function parse_decimal_adv(source_string) {
    source_string   = source_string?.replace(/\s+/g, '') ?? null;
    const match_res = source_string?.match(decimal_parse_adv_regex);
    if(!match_res) return null;
    const whole   = match_res[2] === '' ? '0' : match_res[2];
    const frac    = match_res[3] ??  '';
    const is_zero = whole.match(/^0*$/) && frac.match(/^0*$/);
    const is_neg  = match_res[1] === '-' && !is_zero;
    const sign = (is_neg ? '-' : '');
    const sep  = (frac.length > 0 ? '.' : '');
    const full = sign + whole + sep + frac;
    return [whole, frac, full, sign, sep, !!is_zero];
}
// function parse_decimal(source_string) {
// 	if(source_string === '') return '0';
// 	if(!source_string) return null;
// 	let sign_set = false;
// 	let has_frac = false; 
// 	let sign  = '';
// 	let whole = '';
// 	let frac  = '';
// 	for(const ch of source_string) {
// 		if(!sign_set && (ch === '+' || ch === '-')) {
// 			sign_set = true;
// 			if(ch === '-') sign = '-';
// 			continue;
// 		}
// 		if(ch === '.' || ch === ',') {
// 			sign_set = true;
// 			whole += frac;
// 			frac = '';
// 			continue;
// 		}
// 		if(ch < '0' || ch > '9') continue;
// 		sign_set = true;
// 		if(has_frac) {
// 			frac  += ch;
// 		} else {
// 			whole += ch;
// 		}
// 	}
// }

/**
 * Appends sufix and sets precision, if input is a valid decimal string. Otherwise returns null
 * @param {string} source_string 
 * @param {number} precision 
 * @param {string} sufix 
 */
function format_decimal(source_string, precision = 2, sufix = " zł", force_sep = '.', triplets_sep = '') {
    const parse_res = parse_decimal_adv(source_string);
    if(!parse_res) return null;
    let [whole, frac, full, sign, sep, zero] = parse_res;
    if(triplets_sep !== '') {
        let triplets = [];
        while(whole.length > 0) {
            triplets.push(whole.slice(-3));
            whole = whole.slice(0, -3);
        }
        whole = triplets.reverse().join(triplets_sep);
    }
    if(precision <= 0) {
        return sign + whole + sufix;
    }
    if(frac.length > precision) {
        frac = frac.slice(0, precision);
    }
    if(frac.length < precision) {
        frac += '0'.repeat(precision - frac.length);
    }
    return sign + whole + force_sep + frac + sufix;
}


//////////////// Słownie ////////////////////////

const polish_1      = ["", " jeden", " dwa", " trzy", " cztery", " pięć", " sześć", " siedem", " osiem", " dziewięć"];
const polish_1x     = ["", " jedenaście", " dwanaście", " trzynaście", " czternaście", " piętnaście", " szesnaście", " siedemnaście", " osiemnaście", " dziewietnaście"];
const polish_10     = ["", " dziesięć", " dwadzieścia", " trzydzieści", " czterdzieści", " pięćdziesiąt", " sześćdziesiąt", " siedemdziesiąt", " osiemdziesiąt", " dziewięćdziesiąt"];
const polish_100    = ["", " sto", " dwieście", " trzysta", " czterysta", " pięćset", " sześćset", " siedemset", " osiemset", " dziewięćset"];
const polish_groups = [
    ["" ,"" ,""],
    [" tysiąc"  ," tysiące"  ," tysięcy"],
    [" milion"  ," miliony"  ," milionów"],
    [" miliard" ," miliardy" ," miliardów"],
    [" bilion"  ," biliony"  ," bilionów"],
    [" biliard" ," biliardy" ," biliardów"],
    [" trylion" ," tryliony" ," trylionów"],
    [" tryliard"," tryliadry"," tryliardów"],
];

/**
 * @param {string} whole 
 */
function split_whole_into_groups(whole) {
    if(!whole.match(/^\d+$/)) {
        console.error('NOT A WHOLE NUMBER', `"${whole}"`);
        return [];
    }
    const groups = [];
    while(whole.length > 0) {
        const new_group = pad(whole.slice(-3), 3, '0');
        const left      = whole.slice(0, -3);
        groups.push(new_group);
        whole = left;
    }
    return groups;
}
/**
 * @param {string} group 
 * @param {number} group_index 
 */
function group_to_polish_words(group, group_index = 0) {
    if(group === '000') return '';
    if(group === '001') return polish_1[1] + (polish_groups[group_index]?.[0] ?? ' ___');
    const n_1   = Number(group[2]);
    const n_10  = Number(group[1]);
    const n_100 = Number(group[0]);
    const s_1   = polish_1[n_1];
    const s_1x  = polish_1x[n_1];
    const s_10  = polish_10[n_10];
    const s_100 = polish_100[n_100];
    let s_group = polish_groups[group_index]?.[2] ?? ' ___';
    if(n_10 === 1 && n_1 !== 0) {
        const res = s_100 + s_1x + s_group;
        return res;
    }
    if (n_1 === 2 || n_1 === 3 || n_1 === 4) s_group = polish_groups[group_index]?.[1] ?? ' ___';
    const res = s_100 + s_10 + s_1 + s_group;
    return res;
  }
/**
 * @param {string} whole 
 */
function number_to_polish_words(whole) {
    console.log('POLISHING', whole);
    let minus = '';
    if(whole[0] === '-') {
        minus = 'minus';
        whole = whole.slice(1);
    }
    if(whole.match(/^0*$/)) return 'zero';
    const groups = split_whole_into_groups(whole);
    return minus + groups.map((group, i) => group_to_polish_words(group, i)).reverse().join('').trim();
} 




////////////////////////////////////////



/**
 * @template T
 * @param {()=>Promise.<T>} async_function 
 */
function as_promise(async_function) {
    return async_function();
}

function deffered_promise() {
    /**@type {(value: any) => any} */
    let resolve;
    /**@type {(value: any) => any} */
    let reject;
    const promise = new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject  = _reject;
    });
    //@ts-ignore
    return {promise,resolve,reject};
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
 * @typedef {import('vue').Ref<T> & {reas: (ref: import('vue').Ref<T>) => void, reas_or_unref: (maybe_ref: import('vue').MaybeRef<T>) => void}} ReasRef
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
    /**@param { import('vue').MaybeRef<import('vue').UnwrapRef<T>>} maybe_ref */
    const reas_or_unref = (maybe_ref) => {
        if(isRef(maybe_ref)) {reas(maybe_ref);}
        else                 {_computed.value = maybe_ref;}
    }
    return Object.assign(_computed, {reas, reas_or_unref});
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

    deep_copy,
    deep_compare,
    object_map,
    object_leaf_map,
    array_compare,
    typeofpl,
    as_promise,
    deffered_promise,

    pad,
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

    is_decimal,
    parse_decimal_adv,
    parse_decimal,
    format_decimal,

    number_to_polish_words,

    reasRef,
    // watchedRef
}