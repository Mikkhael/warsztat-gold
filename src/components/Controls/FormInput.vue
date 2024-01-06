<script setup>
//@ts-check

import { onActivated, onMounted, computed, ref, watch } from 'vue';

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

/**@returns {string} */
let custom_validity_check = (/**@type {string | number | null} */ value, /**@type {ValidityState} */validityState) => '';


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
    custom_validity_check = (value) => check_decimal((value === null ? '' : value).toString());
}
else if(props.type == 'number') {
    additional_props.step = '0.01';
}

const elem = ref();
function update_validity(value) {
    let invalid_msg = custom_validity_check(value, elem.value.validity);
    if(!invalid_msg) {
        if(props.nonull && value === null) {
            invalid_msg = 'Wartość nie może być pusta';
        }
    }
    elem.value.setCustomValidity(invalid_msg);
}

const value_ref_proxy__pass = {
    get() { return value_ref.value; },
    set(new_value) { value_ref.value = new_value }
};
const value_ref_proxy__empty_as_null = {
    get() { return value_ref.value === null ? '' : value_ref.value; },
    set(new_value) { value_ref.value = (new_value === '') ? null : new_value; }
};

const treat_empty_as_null = additional_props.type === 'number' || props.type === 'decimal';
const value_ref_proxy = computed(
    treat_empty_as_null ? value_ref_proxy__empty_as_null : 
                          value_ref_proxy__pass
);

function set_as_null() {
    value_ref_proxy.value = null;
}

watch(value_ref, (new_value) => {
    // console.log(typeof new_value, new_value);
    update_validity(new_value);
});



</script>

<template>

    <section class="FormControlInput">
        <input ref="elem" v-model="value_ref_proxy" class="FormControlInputMain" :class="{changed: value_changed, null: value_ref === null}" v-bind="additional_props" :placeholder="value_ref === null ? '~' : ''">
        <input type="button" v-if="!props.nonull && !props.readonly && !treat_empty_as_null" class="FormControlInputNullBtn" @click="set_as_null()" value="~">
    </section>

</template>

<style>

.FormControlInput{
    width: 20ch;
    display: flex;
    flex-direction: row;
    /* border: 2px solid red; */
}
.FormControlInputNullBtn{
    width: 2ch;
}
.FormControlInputMain{
    /* border: 2px solid blue; */
    width: 0ch;
    flex-grow: 1;
}

.FormControlInputMain.changed {
    background-color: #fcf5be;
}

.FormControlInputMain:invalid {
    color: red;
    border-color: red;
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