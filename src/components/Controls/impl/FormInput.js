//@ts-check



import { computed, reactive, toRefs } from 'vue';
import { FormDataValue, FormDataValueLike } from '../../Dataset';
import { proxies_types } from './utils';


/**
 * 
 * @typedef {"integer" | "number" | "decimal" | "boolean" | "date" | "datetime" | "datetime-local" | "text" } FormInputType
 * @typedef {{type?: FormInputType, auto?: boolean, value: FormDataValueLike, readonly: boolean, nonull: boolean, len?: number, hints: any[]}} PropsType 
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

    const col = (props.value instanceof FormDataValue) ? props.value.associated_col : null;

    if(props.auto && col) {
        switch(col.type) {
            case 'INTEGER':   params.type = 'integer'; break;
            case 'TINYINT':   {
                params.type = 'integer';
                if(col.targ === '3') params.max = 255;
                if(col.targ === '1') params.max = 1;
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

    const attributes = reactive(/**@type {object} */({}));
    attributes.disabled   = props.readonly;
    if(auto_params.nonull !== true)      attributes.nullable  = true;
    if(auto_params.nonull !== undefined) attributes.required  = auto_params.nonull;
    if(auto_params.len    !== undefined) attributes.maxlength = auto_params.len;
    if(auto_params.min    !== undefined) attributes.min = auto_params.min;
    if(auto_params.max    !== undefined) attributes.max = auto_params.max;

    const custom_validity_message = computed(() => {
        const local      = value.get_local();
        const rdonly     = props.readonly;
        const nonull     = auto_params.nonull;
        const is_decimal = auto_params.type === 'decimal';
        if(rdonly) {return '';}
        if(local === null) {return nonull ? 'Wartość nie może być pusta' : '';}
        if(is_decimal) {return check_decimal(local.toString());}
        return '';
    });
    
    const proxy_type = apply_correct_attributes_and_proxy_based_on_type(auto_params.type ?? 'text', attributes);
    
    const local_proxy = computed({
        get()  {return proxy_type.get(value.local.value);},
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
 * @param {FormInputType} type 
 * @param {object} attributes 
 */
function apply_correct_attributes_and_proxy_based_on_type(type, attributes){
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
            attributes.type = "text";
            return proxies_types.empty_as_null;
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



function check_decimal(/**@type {string} */ value) {
    if(value === '') return '';
    const match = value.match(/^[\+\-]?(\d+)(?:\.(\d+))?$/);
    // console.log(match);
    if(match === null) {
        return 'Wartośc musi mieć postać liczby, z ewentualnym seperatorem dziesiętnym';
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
