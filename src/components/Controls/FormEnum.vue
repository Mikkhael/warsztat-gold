<script setup>
//@ts-check

import { use_FormEnum } from './impl/FormEnum';
import { ref, watch, toRef } from 'vue';

const props = defineProps({
    options: {
        /**@type {import('vue').PropType<(string | [value: any, name: string])[]>} */
        type: Array,
        required: true
    },
    value: {
        /**@type {import('vue').PropType<import('../Dataset').ChangableValueLike>} */
        type: Object,
        required: true
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

function set_as_null() {
    impl.local = null;
}
function reset_changes(){
    props.value.refresh();
}

const elem = /**@type {import('vue').Ref<HTMLSelectElement>}*/ (ref());
watch(toRef(impl, 'custom_validity_message'), (new_value) => {
    elem.value.setCustomValidity(new_value);
});


</script>

<template>

    <select class="FormControl FormControlEnum" 
        ref="elem" 
        v-model="impl.local_proxy"
        :class="{changed: impl.changed, null: impl.local === null}" 
        :disabled="props.readonly"
        :nullable="!props.nonull"
        @set_as_null="set_as_null()"
        @reset_changes="reset_changes()"
    >
        <option value="___unknown" hidden>{{ impl.local }}</option>
        <option v-if="!impl.options.has(null)"    :value="null" :class="{remote: impl.cached === null}" :hidden="props.nonull" class="FormControlEnumOption FormControlEnumNull" >~</option>
        <option v-for="[v, name] in impl.options" :value="v"    :class="{remote: impl.cached === v}"                           class="FormControlEnumOption" >{{ name }}</option>
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