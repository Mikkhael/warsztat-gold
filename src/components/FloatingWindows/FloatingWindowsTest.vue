<script setup>
import FloatingWindowContainer from "./FloatingWindowContainer.vue"
import { ref, reactive, nextTick } from "vue";

const manager = ref();
const new_window_name = ref("test1");


defineExpose({
    manager
});

</script>

<template>

    
    <div class="container">
        <FloatingWindowContainer ref="manager" />
    </div>

    <input type="text" v-model="new_window_name">
    <input type="button" value="OPEN or FOCUS"  @click="manager.open_or_focus_window (new_window_name)">
    <input type="button" value="OPEN or REOPEN" @click="manager.open_or_reopen_window(new_window_name)">
    <input type="button" value="CLOSE"          @click="manager.close_window         (new_window_name)">

</template>

<style scoped>

.container {
    pointer-events: none;
    position: absolute;
    overflow: hidden;
    left: 0px;
    right: 0px;
    bottom: 0px;
    /* height: 70%; */
    top: 0px;
    border: 1px solid red;
    z-index: 0;
}

</style>
