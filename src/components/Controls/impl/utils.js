//@ts-check

/**
 * @typedef {import("../../Dataset").SQLValue} SQLValue
 */
/**
 * @template T
 * @typedef {import("vue").Ref<T> | T} MaybeRef
 */


const proxies_types = {
    // By default, treat setting value to empty string as 'null' (and reading null as '')
    empty_as_null: {
        get(x) { return x === null ? ''   : x; },
        set(x) { return x === ''   ? null : x; }
    },
    // Dont use any null elision (as above)
    pass: {
        get(x) { return x; },
        set(x) { return x; }
    },
    // Wszystkie wartośći z SQLite są w formacie YYYY-MM-DDThh:mm. Dla type="date" trzeba to skonwertować
    dateYYYY_MM_DD: {
        get(x) { return x === null ? '' : x.toString().slice(0, 10); }, // usuń przy wyświetlaniu czas
        set(x) { return (x === '' || x === null) ? null : (x + 'T00:00'); } // dodaj czas przy nadpisaniu
    }
};


export {
    proxies_types
}