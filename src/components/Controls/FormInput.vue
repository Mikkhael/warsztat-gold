<script setup>
//@ts-check

import { computed, ref, watch, toRef, useAttrs, watchEffect, nextTick } from 'vue';
import { use_FormInput } from './impl/FormInput';
import { smart_focus_next_form , smart_focus_next } from './smartFocus';
import { TrackedValue } from '../Dataset/TrackedValue';
import '../Dataset/types';
import { Column } from '../Dataset';

/*
 * @typedef {{
 *  readonly value?: TrackedValue,
 *  readonly rawvalue?: SQLValue,
 *  readonly oldvalue?: SQLValue,
 *  readonly changed?:  boolean,
 *  readonly decimal_format?: DecimalFormat,
 *  readonly format?:   FormValueFormat,
 *  readonly column?:   Column,
 *  readonly no_col_deduce?: boolean,
 *  readonly readonly?: boolean,
 *  readonly nonull?:   boolean,
 *  readonly len?: number,
 *  readonly min?: number,
 *  readonly max?: number,
 *  readonly hints: any[]
 * }} PropsType 
 */

const props = defineProps({

    value:    {
        /**@type {PropType<TrackedValue>} */ 
        type: Object, 
        required: false
    },
    rawvalue: {
        /**@type {PropType<SQLValue>}     */ 
        type: [String, Number, Boolean, Object],
        required: false
    },
    oldvalue: {
        /**@type {PropType<SQLValue>}     */ 
        type: [String, Number, Boolean, Object],
        default: undefined
    },
    changed:  {type: Boolean, default: undefined},

    decimal_format: { 
        /**@type {PropType<DecimalFormat>} */
        type: Object,
        required: false
    },

    type:   {
        /**@type {PropType<FormValueFormat>} */
        //@ts-ignore
        type: String,
        required: false
    },
    column: {
        /**@type {PropType<Column>}          */
        type: Column,
        required: false
    },
    
    no_col_deduce: {type: Boolean, default: false},
    readonly: {type: Boolean, default: undefined},
    nonull:   {type: Boolean, default: undefined},
    len:      {type: Number, required: false},
    min:      {type: Number, required: false},
    max:      {type: Number, required: false},
    
    textarea: {type: Boolean, default: false},
    nospin:   {type: Boolean, default: false},

    preffered_focus: {
        /**@type {PropType<() => (Element | Iterable<Element>)>} */
        //@ts-ignore
        type: Function,
        required: false
    },

    _debug_on: Boolean,

});

const fallthrough_attrs = useAttrs();

const emit = defineEmits({
    "update:rawvalue": (/**@type {SQLValue} */ v) => {return true;}
});
function emit_rawvalue_callback(/**@type {SQLValue} */ v) {return emit('update:rawvalue', v);}
const impl = use_FormInput(props, emit_rawvalue_callback);

function set_as_null() {
    impl.local = null;
}
function reset_changes(){
    impl.reset();
}

function handle_enter(/**@type {KeyboardEvent} */ event) {
    if(!enter_focusable.value) return false;
    /**@type {HTMLElement?} */
    //@ts-ignore
    const target = event.target;
    if(!target) return false;
    if(props.preffered_focus) {
        return smart_focus_next(props.preffered_focus(), target);
    } else {
        return smart_focus_next_form(target);
    }
}

const elem = ref();
watchEffect(() => {
    elem?.value?.setCustomValidity(impl.custom_validity_message);
});
// watch(toRef(impl, "custom_validity_message"), (new_value, old_value) => {
//     elem?.value?.setCustomValidity(new_value);
// });
// onMounted(() => {
//     elem.value.setCustomValidity(impl.custom_validity_message);
// });



// const uid = generate_UID();
// const INPUT_UID = ref(uid + '_input');

// const use_datalist = computed(() => props.hints.length > 0);
// const HINTS_UID = ref(uid + '_hint');

const all_attributes  = computed(() => {return {...impl.attributes, ...fallthrough_attrs};});
const enter_focusable = computed(() => !props.textarea && !all_attributes.value['disabled']);

const all_reactive_class = computed(() => {
    return {
        changed: impl.changed,
        null: impl.local === null,
        nospin: props.nospin,
        enter_focusable: enter_focusable.value
    }
});

function print_impl(){console.log("IMPL: ", impl, elem.value);}

// Fix for when the "type" changes, and the displayed model value turns empty, and a warning is thrown
watch(toRef(impl, 'static_changed_trigger'), async () => {
    await nextTick();
    if(props._debug_on) {console.log("[FormInput Debug Comp] FORCING REASIGN OF PROXY ", impl.local, impl.local_proxy);}
    impl.reasign_proxy();
});

if(props._debug_on) {
    watchEffect(() => {
        console.log(`[FormInput Debug Comp] impl: local:${impl.local} local_proxy:${impl.local_proxy} type:${all_attributes.value['type']} `);
    })
}

</script>

<template>
        <!-- <pre v-if="_debug_on"> {{ impl }} </pre> -->
        <input v-if="!props.textarea" ref="elem"
                class="FormControl FormControlInput" 
                :class="all_reactive_class"
                :placeholder="impl.local === null ? '~' : ''"
                v-bind="all_attributes"
                v-model="impl.local_proxy_single_line" 
                v-on="impl.listeners"
                 @set_as_null="set_as_null()"
                 @reset_changes="reset_changes()"
                 @keyup.enter="handle_enter"
        />
        <textarea v-else ref="elem"
                class="FormControl FormControlInput" 
                :class="all_reactive_class"
                :placeholder="impl.local === null ? '~' : ''"
                v-bind="all_attributes"
                v-model="impl.local_proxy" 
                v-on="impl.listeners"
                 @set_as_null="set_as_null()"
                 @reset_changes="reset_changes()"
        ></textarea>
        <!-- <input type="button" value="PRINT_IMPL" @click="print_impl()"> -->
</template>

<style scoped>

*[right] {
    text-align: right;
}
textarea {
    text-wrap-mode: nowrap;
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