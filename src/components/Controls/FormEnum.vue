<script setup>
//@ts-check

import { onActivated, onMounted, computed, ref, watch, readonly } from 'vue';
import { escape_sql_value, typeofpl } from '../../utils';

const props = defineProps({
    options: {
        type: Array,
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
    nonull: {
        type: Boolean,
        default: false
    }
});

const value_ref     = props.formValue.as_ref();
const value_ref_true= props.formValue.as_ref_true();
const value_changed = props.formValue.as_ref_changed();

const options_map = computed(() => {
    /**@type {[any, any][]} */
    const entries = [];
    for(let entry of props.options){
        if(entry instanceof Array && entry.length >= 2) {
            entries.push([entry[0], entry[1]]);
        } else {
            entries.push([entry, entry]);
        }
    }
    return new Map(entries);
});

// console.log('OPTIONS', options_map.value);

const value_ref_proxy = computed({
    get() {return options_map.value.has(value_ref.value) ? value_ref.value : value_ref.value === null ? null : '___unknown'; },
    set(new_value) {value_ref.value = new_value;}
});


const custom_validity_message = computed(() => {
    const value = value_ref.value;
    const map   = options_map.value;
    const rdonly = props.readonly;
    const nonull = props.nonull;
    if (rdonly) return '';
    if (value === null && nonull)          { return 'Wartość nie może być pusta'; }
    if (value !== null && !map.has(value)) { return `Nieoczekiwana wartość (${typeofpl(value)}): ${value}`;}
    return '';
});
const elem = /**@type {import('vue').Ref<HTMLSelectElement>}*/ (ref());
watch(custom_validity_message, (new_value) => {
    elem.value.setCustomValidity(new_value);
});

// watch(value_ref, (new_value) => {
//     console.log("SELECT", typeof new_value, new_value, typeof elem.value.value, elem.value.value);
//     // update_validity();
// });



</script>

<template>

    <select class="FormControl FormControlEnum" v-model="value_ref_proxy" ref="elem" :class="{changed: value_changed, null: value_ref === null}" :disabled="props.readonly">
        <option value="___unknown" hidden>{{ value_ref }}</option>
        <option v-if="!options_map.has(null)" :value="null" :hidden="props.nonull" class="FormControlEnumOption FormControlEnumNull" :class="{true: value_ref_true === null}">~</option>
        <option v-for="[v, name] in options_map" :value="v" class="FormControlEnumOption" :class="{true: value_ref_true === v}">{{ name }}</option>
    </select>

</template>

<style>


.FormControlEnumOption.true {
    background-color: white;
}
.FormControlEnumNull {
    background-color: #0000002d;
}

</style>