//@ts-check



import { computed, reactive, toRefs } from 'vue';
import { FormDataValue } from '../../Dataset';
import { proxies_types } from './utils';


/**
 * 
 * @typedef {"integer" | "number" | "decimal" | "date" | "datetime-local" | "text" } FormInputType
 * @typedef {{type: FormInputType, value: FormDataValue, readonly: boolean, nonull: boolean, len?: number, hints: any[]}} PropsType 
 */

/**
 * @param {PropsType} props
 */
function use_FormInput(props) {
    const value = props.value;
    
    const attributes = reactive(/**@type {object} */({}));
    attributes.type = "text";
    attributes.disabled = props.readonly;
    if(props.len !== undefined){
        attributes.maxlength = props.len;
    }

    const custom_validity_message = computed(() => {
        const local  = value.get_local();
        const nonull = props.nonull;
        const rdonly = props.readonly;
        const is_decimal = props.type === 'decimal';
        if(rdonly) {return '';}
        if(local === null) {return nonull ? 'Wartość nie może być pusta' : '';}
        if(is_decimal) {return check_decimal(local.toString());}
        return '';
    });
    
    const proxy_type = apply_correct_attributes_and_proxy_based_on_type(props, attributes);
    const local_proxy = computed({
        get()  {return proxy_type.get(value.get_local());},
        set(x) {value.local.value = proxy_type.set(x);}
    });

    const res = reactive({
        local: value.local,
        cached: value.get_cached_ref(),
        changed: value.changed,
        attributes,
        local_proxy,
        custom_validity_message
    });

    return res;
}

/**
 * 
 * @param {PropsType} props 
 * @param {object} attributes 
 */
function apply_correct_attributes_and_proxy_based_on_type(props, attributes){
    switch(props.type){
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
            return proxies_types.empty_as_null;
        }
        case 'date': {
            attributes.type = "date";
            return proxies_types.dateYYYY_MM_DD;
        }
        case 'datetime-local':{
            attributes.type = "datetime-local";
            return proxies_types.empty_as_null;
        }
        case "text": {
            return proxies_types.pass;
        }
    }
}



function check_decimal(/**@type {string} */ value) {
    if(value === '') return '';
    const match = value.match(/^[\+\-]?(\d+)(?:\.(\d+))?$/);
    // console.log(match);
    if(match === null) {
        return 'Wartośc musi mieć postać liczby, z ewentualnym seperatorem dziesiętnym (".")';
    }
    const whole = match[1];
    const decim = match[2] || '0';
    const res = [];
    if(decim.length > 4) {
        res.push('Cyfr dziesiętnych po przecinku może być co najwyżej 4');
    }
    // "922337203685477,5808"
    if((whole.length >  '922337203685477'.length) ||
        (whole.length == '922337203685477'.length && whole > '922337203685477') ||
        (whole == '922337203685477' && decim >= `5808`)) {
        res.push('Wartość musi mieścić się w zakresie +/-922337203685477,5808');
    }
    if(res.length === 0) return '';
    return res.join('\n');
}

export {
    use_FormInput
}
