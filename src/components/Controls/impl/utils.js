//@ts-check
import { computed, reactive, toRef } from "vue";
// import { DatasetValue, DVUtil } from "../../Dataset/Dataset";

/**
 * @param {Object.<string, any>} props
 * @param {string=} prop_name
 * @return {import("../../Dataset/Dataset").ReactiveDatasetValue}
 */
function convert_control_prop_to_reactive_props(props, prop_name = 'value'){
    const prop_ref = toRef(props, prop_name);
    const prop = prop_ref.value;
    // console.log('PROP, REF, PROPS', prop, prop_ref, props);
    if(prop instanceof DatasetValue) {
        return prop.to_reactive_values();
    }
    console.log('NOT DATASET VALUE')
    return reactive({
        local: /**@type {import('vue').Ref<import('../../Dataset/Dataset').SQLValue>} */ (prop_ref),
        remote: undefined,
        changed: false
    });
}



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
    convert_control_prop_to_reactive_props,
    proxies_types
}