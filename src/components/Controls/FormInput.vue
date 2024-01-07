<script setup>
//@ts-check

import { onActivated, onMounted, computed, ref, watch, toRef } from 'vue';
import { generate_UID } from '../../utils';

const props = defineProps({
    type: {
        type: String,
        required: true
    },
    formValue: {
        /**@type {import('vue').PropType<import('../../FormManager').FormValue<string | number | null>>} */
        type: Object,
        required: true
    },
    hints: {
        type: Array,
        default: []
    },
    properties: {
        type: Object,
        default: {}
    },
    readonly: {
        type: Boolean,
        default: false
    },
    len: {
        type: Number,
        required: false
    },
    nonull: {
        type: Boolean,
        default: false
    }
});

// const value_formvalue = (props.formValue instanceof FormValue) ? props.formValue : new FormValue(props.formValue);
// const value_ref     = value_formvalue.as_ref();
// const value_changed = value_formvalue.as_ref_changed();

const value_ref     = props.formValue.as_ref();
const value_changed = props.formValue.as_ref_changed();

const additional_props = Object.assign({ type: props.type, disabled: props.readonly }, props.properties);
if(props.len !== undefined) {
    additional_props.maxlength = props.len;
}

// /**@returns {string} */
// let custom_validity_check = (/**@type {string | number | null} */ value, /**@type {ValidityState} */validityState) => '';


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

if(props.type == 'integer') {
    additional_props.type = 'number';
    additional_props.step = 1;
}
else if(props.type == 'decimal') {
    additional_props.type    = 'text';
    // additional_props.pattern = /[\+\-]?\d+(?:\.\d+)?/.source;
    // custom_validity_check = (value) => check_decimal((value === null ? '' : value).toString());
}
else if(props.type == 'number') {
    additional_props.step = '0.01';
}

const value_ref_proxy__pass = {
    get() { return value_ref.value; },
    set(new_value) { value_ref.value = new_value }
};
const value_ref_proxy__empty_as_null = {
    get() { return value_ref.value === null ? '' : value_ref.value; },
    set(new_value) { value_ref.value = (new_value === '') ? null : new_value; }
};
const value_ref_proxy__dateYYYY_MM_DD = {
    get() { return value_ref.value === null ? '' : value_ref.value.toString().slice(0, 10); },
    set(new_value) { value_ref.value = (new_value === '' || new_value === null) ? null : (new_value + ' 00:00'); }
};


const treat_as_dateYYYY_MM_DD   = additional_props.type === 'date';
const treat_empty_as_null       = additional_props.type === 'number' ||
                                  additional_props.type === 'date' ||
                                  additional_props.type === 'datetime-local' ||
                                  props.type === 'decimal';
const value_ref_proxy = computed(
    treat_as_dateYYYY_MM_DD ? value_ref_proxy__dateYYYY_MM_DD :
    treat_empty_as_null     ? value_ref_proxy__empty_as_null : 
                              value_ref_proxy__pass
);

function set_as_null() {
    value_ref_proxy.value = null;
}

const custom_validity_message = computed(() => {
    const value  = value_ref.value;
    const nonull = props.nonull;
    const rdonly = props.readonly;
    const is_decimal = props.type === 'decimal';
    if(rdonly) {return '';}
    if(value === null) {return nonull ? 'Wartość nie może być pusta' : '';}
    if(is_decimal) {return check_decimal(value.toString());}
    return '';
});
const elem = ref();
watch(custom_validity_message, (new_value) => {
    elem.value.setCustomValidity(new_value);
});


const use_datalist = computed(() => props.hints.length > 0);
const UID = ref(generate_UID());

watch(toRef(props, 'hints'), (new_value) => {
    console.log('HINTS: ', new_value);
});

</script>

<template>

    <section class="FormControlInput">
        <input  ref="elem"
                 v-model="value_ref_proxy" 
                 class="FormControl FormControlInputMain" 
                 :class="{changed: value_changed, null: value_ref === null}" 
                 v-bind="additional_props"
                 :list="use_datalist ? UID : ''"
                 :placeholder="value_ref === null ? '~' : ''"
        />
        <input type="button" v-if="!props.nonull && !props.readonly && !treat_empty_as_null" class="FormControlInputNullBtn" @click="set_as_null()" value="~">
        <datalist v-if="use_datalist" :id="UID">
            <option v-for="v in props.hints" :value="v">{{ v }}</option>
        </datalist>
    </section>


</template>

<style>

.FormControlInput{
    width: 22ch;
    display: flex;
    flex-direction: row;
}
.FormControlInput:has(input[type="date"]) {
    width: 15ch;
}
.FormControlInputNullBtn{
    width: 2ch;
}
.FormControlInputMain{
    width: 0ch;
    flex-grow: 1;
}

/* .FormControlInput.null {
    background-image: repeating-linear-gradient(-60deg,
     #00f7ff00,
     #00f7ff00 10px,
     #00f7ffcc 10px,
     #00f7ffcc 12px, 
     #00f7ff00 12px);
} */

</style>