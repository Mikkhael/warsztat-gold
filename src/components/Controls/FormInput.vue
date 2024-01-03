<script setup>
//@ts-check

const props = defineProps({
    type: {
        type: String,
        required: true
    },
    formValue: {
        /**@type {import('vue').PropType<import('../../FormManager').FormValue<string | number>>} */
        type: Object,
        required: true
    },
    min:  { type: String },
    max:  { type: String },
    step: { type: String },
});
const emit  = defineEmits(['update:formValue']);

const value_ref     = props.formValue.as_ref();
const value_changed = props.formValue.as_ref_changed();

const additional_props = { type: props.type };

if(props.type == 'integer') {
    additional_props.type = 'number';
    additional_props.step = 1;
}

function bind_if_defined(name) {
    if(props[name] !== undefined) { additional_props[name] = props[name]; }
}

bind_if_defined('min');
bind_if_defined('max');
bind_if_defined('step');



</script>

<template>

    <input v-model="value_ref" class="FormControl FormControlInput" :class="{changed: value_changed}" v-bind="additional_props">

</template>

<style>

.FormControlInput.changed {
    background-color: #c4c7f1;
}

.FormControlInput:invalid {
    color: red;
    border-color: red;
}

</style>