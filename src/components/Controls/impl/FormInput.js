//@ts-check


import { TrackedValue } from '../../Dataset/TrackedValue';
import { Column } from '../../Dataset/Database';
import { format_decimal, is_decimal, parse_decimal_adv, parse_decimal, DecimalFormatPreset, reactive_trigger } from '../../../utils';

import "../../Dataset/types";
import { computed, isReactive, markRaw, nextTick, reactive, readonly, shallowRef, toRef, triggerRef, unref, watch } from 'vue';

// TODO "money" FormInputType

/**
 * @typedef {"text" | "number" | "date" | "datetime" | "datetime-local"} HTMLFormType
 */

//   USAGE
// <FormInput :value="TrackedValue" ...>
//  or
// <FormInput v-model:rawvalue="SQLValue" ...>

/**
 * @typedef {{
 *  readonly value?: TrackedValue,
 *  readonly rawvalue?: SQLValue,
 *  readonly oldvalue?: SQLValue,
 *  readonly changed?:  boolean,
 *  readonly type?:     FormValueFormat,
 *  readonly decimal_format?: DecimalFormat,
 *  readonly column?:   Column,
 *  readonly no_col_deduce?: boolean,
 *  readonly readonly?: boolean,
 *  readonly nonull?:   boolean,
 *  readonly len?: number,
 *  readonly min?: number,
 *  readonly max?: number,
 * }} PropsType 
 */

// TODO Re-add hints?? (readonly hints: any[])

/**
 * @typedef {{
 *  format:         FormValueFormat,
 *  decimal_format: DecimalFormat | undefined,
 *  nonull:         boolean,
 *  readonly:       boolean,
 *  len?:           number,
 *  min?:           number,
 *  max?:           number,
 *  force_proxy_reasign_trigger?: any,
 * }} FormInputConfigStatic
 * 
 * @typedef {{
 *  value:     SQLValue,
 *  oldvalue:  SQLValue | undefined,
 *  changed:   boolean  | undefined,
 * }} FormInputConfigModel
 * 
 * @typedef {{
 *  static: FormInputConfigStatic,
 *  model:  FormInputConfigModel,
 * }} FormInputConfig
 */

function get_config_from_column(col) {
    if(!(col instanceof Column)) return {};

    /**
     * @type {{
     *   format?:   FormValueFormat,
     *   len?:      number,
     *   min?:      number,
     *   max?:      number,
     *   nonull?:   boolean,
     * }}
     */
    const config = {};

    switch(col.type) {
        case 'INTEGER':   config.format = 'integer'; break;
        case 'TINYINT':   {
            config.format = 'integer';
            if(col.targ === '1') {config.format = 'boolean';}
            if(col.targ === '3') {config.max = 255;}
        } break;
        case 'DECIMAL':   config.format = 'money'; break;
        case 'DOUBLE':    config.format = 'number'; break;
        case 'FLOAT':     config.format = 'number'; break;
        case 'TIMESTAMP': config.format = 'date'; break;
        case 'DATETIME':  config.format = 'date'; break;
        case 'LONGTEXT':  config.format = 'text'; break;
        case 'VARCHAR':   {
            config.format = 'text';
            if(col.targ) config.len = +col.targ; 
        } break;
    }

    config.nonull = col.is_nonull();
    if(col.is_unsigned() && config.min === undefined) {config.min = 0;}

    return config;
}

function DEBUG(...args) {
    console.log("[FormInput Debug]", ...args);
}

/**
 * @param {PropsType} props Should be reactive, passed from vue component
 * @param {{static_changed_trigger?: import('../../../utils').ReactiveTrigger}} triggers
 * @param {(new_value: SQLValue) => void} emit_rawvalue_callback
 * @returns {FormInputConfig}
 */
function deduce_config(props, triggers, emit_rawvalue_callback) {
    const _debug_on = !!(props['_debug_on']);
    if(!isReactive(props)) {
        throw new Error("PROPS IN FORM INPUT IS NOT REACTIVE");
    }

    const config_static = computed(() => {

        /**@type {FormInputConfigStatic} */
        const config = {};
        
        const column = props.no_col_deduce ? undefined : (props.column ?? props.value?.metadata?.column);
        const config_from_column = get_config_from_column(column);

        config.decimal_format =  props.decimal_format;
        config.format   = props.type     ?? config_from_column.format ?? 'text';
        config.nonull   = props.nonull   ?? config_from_column.nonull ?? false;
        config.readonly = props.readonly ?? false;
        config.len      = props.len      ?? config_from_column.len;
        config.min      = props.min      ?? config_from_column.min;
        config.max      = props.max      ?? config_from_column.max;
        
        if(_debug_on) DEBUG("RECOMPUTING CONFIG STATIC: ", JSON.stringify(config));
        
        triggers.static_changed_trigger?.trigger?.();
        
        return config;
    });

    // /**@type {FormInputConfigModel} */
    const config_model = (props.value === undefined) ? {
        value: computed({
            get()  {
                if(_debug_on) DEBUG("RECOMPUTING CONFIG MODEL: " ,props.rawvalue);
                return props.rawvalue ?? null;},
            set(/**@type {SQLValue}*/ v) {emit_rawvalue_callback(v);}
        }),
        oldvalue: computed(() => props.oldvalue),
        changed:  computed(() => props.changed ?? (props.oldvalue !== undefined && (props.rawvalue ?? null) !== props.oldvalue)),
    } : {
        value: computed({
            get()  {
                if(_debug_on) DEBUG("RECOMPUTING CONFIG MODEL: " ,props.rawvalue);
                return props.value?.current ?? null;},
            set(/**@type {SQLValue}*/ v) {props.value !== undefined && (props.value.current = v);}
        }),
        oldvalue: computed(() => {
            if(_debug_on) DEBUG("RECOMPUTING CONFIG MODEL (oldvalu): " , props.oldvalue, props.value?.old, props.value);
            return props.oldvalue ?? props.value?.old}),
        changed:  computed(() => {
            if(_debug_on) DEBUG("RECOMPUTING CONFIG MODEL (changed): " , props.changed, props.value?.changed, props.value);
            return props.changed  ?? props.value?.changed}),
    };

    return reactive({
        static: config_static,
        model:  config_model,
    });
}

function get_attributes_from_format(/**@type {FormValueFormat} */ format) {
    switch(format) {
        case 'number':         return {type: "number", step: 0.01};
        case 'integer':        return {type: "number", step: 1};
        case 'decimal':        return {type: "text", right: true};
        case 'money':          return {type: 'text', right: true};
        case 'boolean':        return {type: "number", step: 1, min: 0, max: 1};
        case 'date':           return {type: "date"};
        case 'datetime-local': return {type: "datetime-local"};
        case 'datetime':       return {type: "datetime-local"}; // Mozilla turns out doesn't support "datetime"
        case 'text':           return {type: 'text'};
    }
    console.error('Unrecognized input type: ', format);
    return {type: "text"};
}

/**@returns {Object.<string, any>} */
function get_attributes_from_config(/**@type {FormInputConfigStatic} */ config) {
    const attributes = get_attributes_from_format(config.format);
    attributes.disabled = config.readonly;
    // TODO check if requried should be set
    if(config.nonull !== undefined) {attributes.required  =  config.nonull;
                                     attributes.nullable  = !config.nonull;}
    if(config.len    !== undefined) attributes.maxlength = config.len;
    if(config.min    !== undefined) attributes.min       = config.min;
    if(config.max    !== undefined) attributes.max       = config.max;
    return attributes;
}

/**@returns {ProxySignature} */
function get_proxy_from_config(/**@type {FormInputConfigStatic} */ config) {
    switch(config.format) {
        case 'number':         return proxies_types.empty_as_null;
        case 'integer':        return proxies_types.empty_as_null;
        case 'decimal':        return config.decimal_format ? generate_proxy_decimal_no_set(config.decimal_format) : proxies_types.decimal_standard_no_set_DEFAULT;
        case 'money':          return config.decimal_format ? generate_proxy_decimal_no_set(config.decimal_format) : proxies_types.decimal_standard_no_set_PLN;
        case 'boolean':        return proxies_types.boolean_as_num;
        case 'date':           return proxies_types.dateYYYY_MM_DD;
        case 'datetime-local': console.warn('Not fully tested FormInput type'); return proxies_types.empty_as_null; // Parsing not perfect, due to "T" in format
        case 'datetime':       console.warn('Not fully tested FormInput type'); return proxies_types.empty_as_null; // Parsing not perfect, due to "T" in format
        case 'text':           return proxies_types.pass;
    }
    console.error('Unrecognized input type: ', config.format);
    return proxies_types.pass;
}

/**
 * 
 * @param {any} event 
 * @param {DecimalFormat} decimal_format 
 */
function set_decimal_formatter(event, decimal_format) {
    const input = event.target?.value?.toString() ?? null;
    if(input === null) {
        event.target.value = '';
        // if(_debug_on) DEBUG("!DECIMAL SETTING NULL", input);
        return null;
    } else {
        const formated = format_decimal(input, decimal_format) ?? input;
        const parsed   = parse_decimal(formated) ?? input;
        event.target.value = formated;
        // if(_debug_on) DEBUG("!DECIMAL SETTING ", input, formated, parse_decimal(formated), parse_decimal_adv(input));
        return parsed;
    }
}

/**@returns {Object.<string,Function>}} */
function get_listeners_from_config(/**@type {FormInputConfig} */ config) {
    if       (config.static.format === 'decimal') {
        return { change: (event) => { config.model.value = set_decimal_formatter(event, config.static.decimal_format ?? {}); }};
    } else if(config.static.format === 'money') {
        return { change: (event) => { config.model.value = set_decimal_formatter(event, config.static.decimal_format ?? DecimalFormatPreset.PLN); }};
    }
    return {};
}

// DONE test if listener is always correctly recomputed
// listeners are recomputed always when 'static' config changes, but not 'model' (which is correct)

/**
 * @param {FormInputConfig} config
 */
function get_secondary_config(config, _debug_on = false) {
    return reactive({
        attributes: computed(() => get_attributes_from_config(config.static)),
        proxy:      computed(() => get_proxy_from_config(config.static)),
        listeners:  computed(() => {
            if(_debug_on) DEBUG("RECOMPUTING LISTENERS");
            return get_listeners_from_config(config);
        }),
    });
}



/**
 * @param {PropsType} props
 * @param {(new_value: SQLValue) => void} emit_rawvalue_callback
 */
function use_FormInput(props, emit_rawvalue_callback) {
    const _debug_on = !!(props['_debug_on']);
    const static_changed_trigger      = reactive_trigger();
    const local_proxy_reasign_trigger = reactive_trigger();

    const config = deduce_config(props, {static_changed_trigger}, emit_rawvalue_callback);
    const config2 = get_secondary_config(config, _debug_on);

    const custom_validity_message = computed(() => {
        const value      = unref(config.model.value);
        if(value === undefined) return 'Wartość jest niezdefiniowana';
        const rdonly     = config.static.readonly;
        const nonull     = config.static.nonull;
        const is_decimal = config.static.format === 'decimal' || config.static.format === 'money';
        if(rdonly) {return '';}
        if(value === null) {return nonull ? 'Wartość nie może być pusta' : '';}
        if(is_decimal) {return check_decimal(value.toString());}
        return '';
    });

    const local_proxy = computed({
        get()  {
            local_proxy_reasign_trigger.value;
            if(_debug_on) DEBUG("RECUMPUTING LOCAL PROXY: ", config.model.value);
            return config2.proxy.get(config.model.value);
        },
        set(x) {
            if(_debug_on) DEBUG("SETTING LOCAL PROXY: ", x);
            config2.proxy.set && (config.model.value = config2.proxy.set(x));
        }
    });

    const local_proxy_single_line = computed({
        get()  {return get_first_line(local_proxy.value);},
        set(x) {local_proxy.value = set_first_line(local_proxy.value, x);}
    });

    const res = reactive({
        local:   computed({
            get() {return config.model.value;},
            set(/**@type {SQLValue} */ v) {config.model.value = v;}
        }),
        cached:  toRef(() => config.model.oldvalue),
        changed: toRef(() => config.model.changed),
        attributes: toRef(config2, 'attributes'),
        listeners:  toRef(config2, 'listeners'),
        reset() {if(config.model.oldvalue !== undefined) config.model.value = config.model.oldvalue},
        local_proxy,
        local_proxy_single_line,
        custom_validity_message,
        // static_changed_trigger: markRaw(static_changed_trigger),
        static_changed_trigger: static_changed_trigger,
        reasign_proxy() {local_proxy_reasign_trigger.trigger();}
    });

    return res;
}

function get_first_line(value) {
    if(typeof value !== 'string') return value;
    const index = value.search(/\n|\r/);
    if(index > 0) {
        // if(_debug_on) DEBUG("GETTING FIRST LINE VALUE ", index, value.slice(0, index));
        return value.slice(0, index);
    }
    return value;
}
function set_first_line(old_value, new_value) {
    if(typeof old_value !== 'string' || typeof new_value !== 'string') return new_value;
    const old_index = old_value.search(/\n|\r/);
    if(old_index < 0) return new_value;
    // if(_debug_on) DEBUG("SETTING FIRST LINE VALUE ", old_index, new_value, old_value.slice(0, old_index));
    return new_value + old_value.slice(old_index);
}



/**
 * @typedef {{get: (any) => any, set?: (any) => any}} ProxySignature
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
    // decimal_standard: {
    //     get(x) { return x === null ? ''   : (format_decimal(x.toString()) ?? x.toString()); },
    //     set(x) { return x === ''   ? null : (parse_decimal (x.toString()) ?? x.toString()); }
    // }
    
    decimal_standard_no_set_DEFAULT: generate_proxy_decimal_no_set(DecimalFormatPreset.Default),
    decimal_standard_no_set_PLN:     generate_proxy_decimal_no_set(DecimalFormatPreset.PLN),
    decimal_standard_no_set_PLN3:    generate_proxy_decimal_no_set(DecimalFormatPreset.PLN3),
};

function generate_proxy_decimal_no_set(/**@type {DecimalFormat} */ decimal_format) {return {
    get(x) { 
        // if(_debug_on) DEBUG("!DECIMAL GETTING ", x, x === null ? '' : format_decimal(x.toString(), decimal_format));
        return x === null ? ''   : format_decimal(x.toString(), decimal_format) ?? x.toString(); },
};}


function check_decimal(/**@type {string} */ value, /**@type {DecimalFormat} */ ) {
    // if(value === '') return '';
    if(!is_decimal(value, )) {
        return 'Wartośc musi mieć postać liczby, z ewentualnym seperatorem dziesiętnym';
    }
    const parts   = parse_decimal_adv(value) ?? ['0', ''];
    let [whole, frac] = parts;
    const res = [];
    if(frac.length > 4) {
        res.push('Cyfr dziesiętnych po przecinku może być co najwyżej 4');
    }
    // TODO Add handling MIN and MAX attributes for decimal
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
