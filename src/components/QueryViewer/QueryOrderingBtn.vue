<script setup>
//@ts-check

const props = defineProps({
    value: {
        type: Number,
        defalut: 0
    }
});

const emit = defineEmits(["update:value"]);
function set_value(new_value) {
    return emit('update:value', new_value);
}
function toggle(new_value) {
    if(props.value == new_value) {
        set_value(0);
    } else {
        set_value(new_value);
    }
}

// const value = computed({
//     get() {return props.value}, 
//     set(new_value) {return emit('update:value', new_value);}
// });

</script>

<template>

<div class="btn_container">
    <button :class="{selected: props.value > 0}" @click="toggle( 1)">^</button>
    <button :class="{selected: props.value < 0}" @click="toggle(-1)">V</button>
</div>

</template>

<style scoped>

    div.btn_container {
        display: inline-flex;
        flex-direction: row;
        overflow: hidden;
    }
    button {
        border: 1px outset black;
        background-color: lightgray;
    }
    button.selected {
        border-style: inset;
        background-color: lightblue;
    }

</style>