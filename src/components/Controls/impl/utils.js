//@ts-check

/**
 * @typedef {import("../../Dataset").SQLValue} SQLValue
 */
/**
 * @template T
 * @typedef {import("vue").Ref<T> | T} MaybeRef
 */


// get(x) - how to display "x"
// set(x) - how to parse inputed "x"
const proxies_types = {
    // By default, treat setting value to empty string as 'null' (and reading null as '')
    empty_as_null: {
        get(x) { return x === null ? ''   : x; },
        set(x) { return x === ''   ? null : x; }
    },
    // Display "true" as 1, false an "0", null as empty
    boolean_as_num: {
        get(x) { return x === null ? ''   : (x ? '1' : '0'); },
        set(x) { return x === ''   ? null : x !== 0; }
    },
    // Dont use any null elision (as above)
    pass: {
        get(x) { return x; },
        set(x) { return x; }
    },
    // Wszystkie wartośći z MDB są w formacie YYYY-MM-DD HH:MM:SS. type="date" zwraca "YYYY-MM-DD"
    dateYYYY_MM_DD: {
        get(x) { return x === null ? '' : x.toString().slice(0, 10); },        // usuń przy wyświetlaniu czas
        set(x) { return (x === '' || x === null) ? null : (x + ' 00:00:00'); } // dodaj czas przy nadpisaniu
    },
    // Converting decimal values to use ',' as separator
    decimal_comma: {
        get(x) { return x.toString().replace('.', ','); },
        set(x) { return x.toString().replace(',', '.'); }
    }
};


export {
    proxies_types
}