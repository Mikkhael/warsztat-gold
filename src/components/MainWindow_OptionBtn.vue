<script setup>
//@ts-check

import {ref} from 'vue';

/**
 * @typedef {{
 *  name?:    string,
 *  onclick?: (suboption_name: string, option_name: string) => void
 * }} SubOptionBtnDefinition
 */
/**
 * @typedef {{
 *  name:     string,
 *  sub?:     SubOptionBtnDefinition[]
 *  onclick?: (option_name: string) => void
 * }} OptionBtnDefinition
 */



const props = defineProps({
    options: {
        /**@type {import('vue').PropType<OptionBtnDefinition>} */
        type: Object,
        required: true
    },
});

/**@type {import('vue').Ref<HTMLElement>} */
//@ts-ignore
const tool     = ref();
/**@type {import('vue').Ref<HTMLElement>} */
//@ts-ignore
const subtools = ref();

const displayed = ref(false);
const top  = ref(0);
const left = ref(0);

/**
 * @param {boolean} [display] 
 */
function set_sub_display(display) {
    if(display === undefined) {
        display = !displayed.value;
    }
    if(display) {
        const elem = tool.value;
        const rect = elem.getBoundingClientRect();
        top.value  = rect.top + rect.height;
        left.value = rect.left;
        displayed.value = true;
        // console.log("SETTING SUB DISPLAY", display, props.options, top.value, left.value);
    } else {
        displayed.value = false;
        // console.log("SETTING SUB DISPLAY", display, props.options, top.value, left.value);
    }
}

defineExpose({
    set_sub_display
});

</script>



<template>

    <div class="tool" ref="tool"
        @click="props.options.onclick ? props.options.onclick(props.options.name) : set_sub_display()"
    >
        {{ props.options.name }}
    </div>

    <div class="subtools" ref="subtools"
        :class="{displayed: displayed}"
        :style="{
            top:  top  + 'px',
            left: left + 'px'
        }"
        @mouseleave="set_sub_display(false)"
    >
        <div class="sub"
            v-for="sub in props.options.sub"
            :class="{
                seperator: !sub.name
            }"
            @click="sub.onclick?.(sub.name ?? '', props.options.name)"
        >
            {{ sub.name }}
        </div>
    </div>

</template>

<style scoped>

.tool,
.sub,
.subtools {
    background-color: #c5c5c5;
}
.tool:hover,
.sub:hover {
    background-color: #eeeeee;
}

.tool {
    cursor: pointer;
    padding: 3px;
    border: 2px solid black;
    display: flex;
    align-items: center;
    transition: 0.1s;
    user-select: none;
}

.subtools {
    border: 1px solid black;
    position: absolute;
    /* height: 200px; */
    /* width: 100px; */
    z-index: 2;
    display: none;
    flex-direction: column;
    justify-content: stretch;
    align-items: left;
}
.subtools.displayed {
    display: flex;
}
.sub {
    padding: 4px;
    border-bottom: 1px dotted black;
    user-select: none;
    cursor: pointer;
}
.sub.seperator {
    padding: 0px;
    margin: 2px;
    border: 1px dashed black;
    cursor: unset;
}

</style>