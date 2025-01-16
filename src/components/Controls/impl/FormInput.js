//@ts-check



import { computed, reactive, toRefs } from 'vue';
import { ChangableValueLike, Column, FormChangebleValue } from '../../Dataset';
import { format_decimal, is_decimal, parse_decimal_adv, parse_decimal } from '../../../utils';


/**
 * 
 * @typedef {"integer" | "number" | "decimal" | "boolean" | "date" | "datetime" | "datetime-local" | "text" | "money" } FormInputType
 * @typedef {{type?: FormInputType, auto?: boolean, value: ChangableValueLike, readonly: boolean, nonull: boolean, len?: number, hints: any[]}} PropsType 
 */

/**
 * @param {PropsType} props 
 */
function auto_params_from_props(props) {
    /**
     * @type {{
     *  type?:   FormInputType,
     *  len?:    number,
     *  min?:    number,
     *  max?:    number,
     *  nonull?: boolean
     * }}
     */
    const params = {};

    /**@type {Column?} */
    //@ts-ignore
    const col = props.value.associated_col ?? null;

    // console.log('AUTO PARAMS', props.value);

    if(props.auto && col) {
        switch(col.type) {
            case 'INTEGER':   params.type = 'integer'; break;
            case 'TINYINT':   {
                params.type = 'integer';
                if(col.targ === '3') params.max = 255;
                if(col.targ === '1') params.type = 'boolean';
            } break;
            case 'DECIMAL':   params.type = 'decimal'; break;
            case 'DOUBLE':    params.type = 'number';  break;
            case 'FLOAT':     params.type = 'number';  break;
            case 'TIMESTAMP': params.type = 'date';    break;
            case 'DATETIME':  params.type = 'date';    break;
            case 'LONGTEXT':  params.type = 'text';    break;
            case 'VARCHAR':   {
                params.type = 'text';
                if(col.targ) params.len = +col.targ; 
            } break;
        }
        if(col.is_nonull()) {
            params.nonull = true;
        }
        if(col.is_unsigned()) {
            params.min = 0;
        } 
    }

    if(props.type)   params.type   = props.type;
    if(props.len)    params.len    = props.len;
    if(props.nonull) params.nonull = props.nonull;

    return params;
}

/**
 * @param {PropsType} props
 */
function use_FormInput(props) {
    const value = props.value;

    const auto_params = auto_params_from_props(props);

    const listeners  = reactive(/**@type {Object.<string, (...any) => any>} */({}));
    const attributes = reactive(/**@type {object} */({}));
    attributes.disabled   = props.readonly;
    if(auto_params.nonull !== true)      attributes.nullable  = true;
    if(auto_params.nonull !== undefined) attributes.required  = auto_params.nonull;
    if(auto_params.len    !== undefined) attributes.maxlength = auto_params.len;
    if(auto_params.min    !== undefined) attributes.min = auto_params.min;
    if(auto_params.max    !== undefined) attributes.max = auto_params.max;


    if(auto_params.type === 'decimal') {
        listeners.change = (event) => {
            const input = event.target?.value?.toString() ?? null;
            if(input === null) {
                event.target.value = '';
                value.set_local(null);
                console.log("!DECIMAL SETTING NULL", input);
            } else {
                const formated = format_decimal(input)   ?? input;
                const parsed   = parse_decimal(formated) ?? input;
                event.target.value = formated;
                value.set_local(parsed);
                console.log("!DECIMAL SETTING ", input, formated, parse_decimal(formated), parse_decimal_adv(input));
            }
        }
    }

    const custom_validity_message = computed(() => {
        const local      = value.get_local();
        if(local === undefined) return 'Wartość jest niezdefiniowana';
        const rdonly     = props.readonly;
        const nonull     = auto_params.nonull;
        const is_decimal = auto_params.type === 'decimal';
        if(rdonly) {return '';}
        if(local === null) {return nonull ? 'Wartość nie może być pusta' : '';}
        if(is_decimal) {return check_decimal(local.toString());}
        return '';
    });
    
    const proxy_type = apply_correct_attributes_and_proxy_based_on_type(auto_params.type ?? 'text', attributes, listeners);
    

    const local_proxy = computed({
        get()  {return proxy_type.get(value.get_local());},
        set(x) {proxy_type.set && value.set_local(proxy_type.set(x));}
    });

    const local_proxy_single_line = computed({
        get()  {return get_first_line(local_proxy.value);},
        set(x) {local_proxy.value = set_first_line(local_proxy.value, x);}
    });

    const res = reactive({
        local: value.get_local_ref(),
        cached: value.get_cached_ref(),
        changed: value.changed,
        attributes,
        listeners,
        local_proxy,
        local_proxy_single_line,
        custom_validity_message
    });

    return res;
}

function get_first_line(value) {
    if(typeof value !== 'string') return value;
    const index = value.search(/\n|\r/);
    if(index > 0) {
        // console.log("GETTING FIRST LINE VALUE ", index, value.slice(0, index));
        return value.slice(0, index);
    }
    return value;
}
function set_first_line(old_value, new_value) {
    if(typeof old_value !== 'string' || typeof new_value !== 'string') return new_value;
    const old_index = old_value.search(/\n|\r/);
    if(old_index < 0) return new_value;
    // console.log("SETTING FIRST LINE VALUE ", old_index, new_value, old_value.slice(0, old_index));
    return new_value + old_value.slice(old_index);
}

/**
 * 
 * @param {FormInputType} type 
 * @param {object} attributes 
 * @param {object} listeners 
 */
function apply_correct_attributes_and_proxy_based_on_type(type, attributes, listeners){
    switch(type){
        case 'number': {
            attributes.type = "number";
            attributes.step = 0.01;
            return proxies_types.empty_as_null;
        }
        case 'integer': {
            attributes.type = "number";
            attributes.step = 1;
            return proxies_types.empty_as_null;
        }
        case 'decimal': {
            attributes.type  = "text";
            attributes.right = true;
            return proxies_types.decimal_standard_no_set;
        }
        case 'boolean': {
            attributes.type = 'number';
            attributes.min  = 0;
            attributes.max  = 1;
            attributes.step = 1;
            return proxies_types.boolean_as_num;
        }
        case 'date': {
            attributes.type = "date";
            return proxies_types.dateYYYY_MM_DD;
        }
        case 'datetime-local':{
            attributes.type = "datetime-local";
            return proxies_types.empty_as_null;
        }
        case 'datetime':{
            attributes.type = "datetime";
            return proxies_types.empty_as_null;
        }
        case "text": {
            attributes.type = "text";
            return proxies_types.pass;
        }
        default: {
            console.error('Unrecognized input type: ', type);
            attributes.type = "text";
            return proxies_types.pass;
        }
    }
}


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
    // decimal_standard: {
    //     get(x) { return x === null ? ''   : (format_decimal(x.toString()) ?? x.toString()); },
    //     set(x) { return x === ''   ? null : (parse_decimal (x.toString()) ?? x.toString()); }
    // }
    decimal_standard_no_set: {
        get(x) { console.log("!DECIMAL GETTING ", x, x === null ? '' : format_decimal(x.toString()));
                 return x === null ? ''   : format_decimal(x.toString()) ?? x.toString(); },
    },
};


function check_decimal(/**@type {string} */ value) {
    // if(value === '') return '';
    if(!is_decimal(value)) {
        return 'Wartośc musi mieć postać liczby, z ewentualnym seperatorem dziesiętnym';
    }
    const parts   = parse_decimal_adv(value) ?? ['0', ''];
    let [whole, frac] = parts;
    const res = [];
    if(frac.length > 4) {
        res.push('Cyfr dziesiętnych po przecinku może być co najwyżej 4');
    }
    // "922337203685477,5808"
    const limit_whole = '922337203685477';
    const limit_frac  = '5808';
    if( (whole.length >  limit_whole.length) ||
        (whole.length == limit_whole.length && whole >  limit_whole) ||
        (whole        == limit_whole        && frac  >= limit_frac)) {
        res.push('Wartość musi mieścić się w zakresie +/-922337203685477,5807');
    }
    return res.join('\n');
}

export {
    use_FormInput
}
