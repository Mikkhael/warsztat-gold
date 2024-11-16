<script setup>
//@ts-check

import { computed, ref, watch, toRef, useAttrs } from 'vue';
import { use_FormInput } from './impl/FormInput';
import { generate_UID } from '../../utils';

const props = defineProps({
    type: {
        /**@type {import('vue').PropType<import('./impl/FormInput').FormInputType>} */
        //@ts-ignore
        type: String,
        required: false
    },
    auto: {
        type: Boolean,
        default: false
    },
    textarea: {
        type: Boolean,
        default: false
    },
    nospin: {
        type: Boolean,
        default: false
    },
    value: {
        /**@type {import('vue').PropType<import('../Dataset').FormDataValueLike>} */
        type: Object,
        required: true
    },
    hints: {
        type: Array,
        default: []
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
const fallthrough_attrs = useAttrs();
const impl = use_FormInput(props);

function set_as_null() {
    impl.local = null;
}
function reset_changes(){
    props.value.refresh();
}

const elem = ref();
watch(toRef(impl, "custom_validity_message"), (new_value, old_value) => {
    // console.log("CUSTOM VAL", old_value, new_value);
    elem.value.setCustomValidity(new_value);
});

const uid = generate_UID();
const INPUT_UID = ref(uid + '_input');

const use_datalist = computed(() => props.hints.length > 0);
const HINTS_UID = ref(uid + '_hint');

</script>

<template>
        <input v-if="!props.textarea" ref="elem"
                 v-model="impl.local_proxy" 
                 class="FormControl FormControlInput" 
                 :class="{changed: impl.changed, null: impl.local === null, nospin: props.nospin}"
                 :placeholder="impl.local === null ? '~' : ''"
                 :list="use_datalist ? HINTS_UID : undefined"
                 :id="  use_datalist ? INPUT_UID : undefined"
                 v-bind="{...impl.attributes, ...fallthrough_attrs}"
                 @set_as_null="set_as_null()"
                 @reset_changes="reset_changes()"
        />
        <textarea v-else ref="elem"
                 v-model="impl.local_proxy" 
                 class="FormControl FormControlInput" 
                 :class="{changed: impl.changed, null: impl.local === null, nospin: props.nospin}"
                 :placeholder="impl.local === null ? '~' : ''"
                 :list="use_datalist ? HINTS_UID : ''"
                 :id="  use_datalist ? INPUT_UID : undefined"
                 v-bind="{...impl.attributes, ...fallthrough_attrs}"
                 @set_as_null="set_as_null()"
                 @reset_changes="reset_changes()"
        ></textarea>
        <datalist v-if="use_datalist" :id="HINTS_UID">
            <option v-for="v in props.hints" :value="v">{{ v }}</option>
        </datalist>
</template>

<style>

/* .FormControlInput.null {
    background-image: repeating-linear-gradient(-60deg,
     #00f7ff00,
     #00f7ff00 10px,
     #00f7ffcc 10px,
     #00f7ffcc 12px, 
     #00f7ff00 12px);
} */

</style>