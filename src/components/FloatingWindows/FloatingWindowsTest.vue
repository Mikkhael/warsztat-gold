<script setup>
import FloatingWindowContainer from "./FloatingWindowContainer.vue"
import TestWindow1 from "./TestWindow1.vue";
import TestWindow2 from "./TestWindow2.vue";
import FWManager from "./FWManager";
import { ref } from "vue";

const container = ref();
const container2 = ref();


const fw_manager  = new FWManager(container);
const fw_manager2 = new FWManager(container2);

const new_window_name = ref("test1");
const zaha = ref([0]);

defineExpose({
    fw_manager
});

</script>

<template>

    
    <div class="container" ref="container">
        <FloatingWindowContainer :manager="fw_manager" />
    </div>
    
    <div class="container2" ref="container2">
        <FloatingWindowContainer :manager="fw_manager2" />
    </div>
    

    <p>
        <input type="text" v-model="new_window_name">
        <input type="button" value="OPEN 1"  @click="fw_manager.open_or_focus_window (new_window_name, TestWindow1, {text: new_window_name, index: 123}, {x:37.52})">
        <input type="button" value="OPEN 2"  @click="fw_manager.open_or_focus_window (new_window_name, TestWindow2, {text: 'jsdiogf', aha: zaha})" >
        <input type="button" value="CLOSE"   @click="fw_manager.close_window         (new_window_name)">
    </p>

    <p>
        {{ zaha }}
        <input type="button" value="OPEN or FOCUS"  @click="fw_manager2.open_or_focus_window (new_window_name, {h:300.5})">
        <input type="button" value="CLOSE"          @click="fw_manager2.close_window         (new_window_name)">
    </p>



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

.container2 {
    pointer-events: none;
    position: absolute;
    overflow: hidden;
    width: 400px;
    height: 400px;
    right: 20px;
    bottom: 20px;
    border: 1px solid blue;
    z-index: 0;
}

</style>
