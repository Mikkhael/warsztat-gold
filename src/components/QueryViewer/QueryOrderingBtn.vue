<script setup>
//@ts-check

const props = defineProps({
    value: {
        type: Number,
        default: 0
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
    <div :class="{selected: props.value > 0}" @click="toggle( 1)" class="sort_btn"        ></div>
    <div :class="{selected: props.value < 0}" @click="toggle(-1)" class="sort_btn reverse"></div>
</div>

</template>

<style scoped>

    .btn_container {
        display: inline-block;
        height: 80%;
        width: 2ch;
    }
    .sort_btn {
        height: 50%;
        cursor: pointer;
        background-image: url('./../../assets/icons/sort_off.svg');
        background-size: contain;
        background-repeat: no-repeat;
    }
    .sort_btn.reverse {
        transform: scaleY(-1);
    }
    .sort_btn.selected {
        background-image: url('./../../assets/icons/sort_on.svg');
    }
    .sort_btn:hover{
        background-color: rgba(0, 0, 255, 0.185);
    }

</style>