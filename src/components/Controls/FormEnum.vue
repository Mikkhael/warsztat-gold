<script setup>
//@ts-check

import { use_FormEnum } from './impl/FormEnum';
import { ref, watch, toRef } from 'vue';

const props = defineProps({
    options: {
        type: Array,
        required: true
    },
    value: {
        /**@type {import('vue').PropType<import('../Dataset/Dataset').DatasetValuelike>} */
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

const impl = use_FormEnum(props);

const elem = /**@type {import('vue').Ref<HTMLSelectElement>}*/ (ref());
watch(toRef(impl, 'custom_validity_message'), (new_value) => {
    elem.value.setCustomValidity(new_value);
});



</script>

<template>

    <select class="FormControl FormControlEnum" v-model="impl.local_proxy" ref="elem" :class="{changed: impl.changed, null: impl.local === null}" :disabled="props.readonly">
        <option value="___unknown" hidden>{{ impl.local }}</option>
        <option v-if="!impl.options.has(null)"    :value="null" :class="{remote: impl.remote === null}" :hidden="props.nonull" class="FormControlEnumOption FormControlEnumNull" >~</option>
        <option v-for="[v, name] in impl.options" :value="v"    :class="{remote: impl.remote === v}"                           class="FormControlEnumOption" >{{ name }}</option>
    </select>

</template>

<style>

.FormControlEnumOption.remote {
    background-color: white;
}
.FormControlEnumNull {
    background-color: #0000002d;
}

</style>