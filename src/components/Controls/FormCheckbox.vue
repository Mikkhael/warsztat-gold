<script setup>
//@ts-check

import { computed, ref, watch, toRef, useAttrs } from 'vue';
import { use_FormCheckbox } from './impl/FormCheckbox';

const props = defineProps({
    auto: {
        type: Boolean,
        default: false
    },
    value: {
        /**@type {import('vue').PropType<import('../Dataset').FormDataValueLike>} */
        type: Object,
        required: true
    },
    readonly: {
        type: Boolean,
        default: false
    },
    allownull: {
        type: Boolean,
        default: false
    }
});
const fallthrough_attrs = useAttrs();
const impl = use_FormCheckbox(props);

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

</script>

<template>
        <div class="FormControl FormControlCheckbox" 
             v-bind="{...fallthrough_attrs}"
             :class="{changed: impl.changed, null: impl.local === null}"
        >
                <input ref="elem" type="checkbox"
                        v-model="impl.local_proxy" 
                        :class="{changed: impl.changed, null: impl.local === null}"
                        :nullable="props.allownull"
                        @set_as_null="set_as_null()"
                        @reset_changes="reset_changes()"
                />
        </div>
</template>

<style scoped>

/* .FormControlInput.null {
    background-image: repeating-linear-gradient(-60deg,
     #00f7ff00,
     #00f7ff00 10px,
     #00f7ffcc 10px,
     #00f7ffcc 12px, 
     #00f7ff00 12px);
} */

</style>