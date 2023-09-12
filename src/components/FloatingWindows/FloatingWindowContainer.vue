<script setup>
import FloatingWindow from "./FloatingWindow.vue"
import FWManager from './FWManager.js'

const props = defineProps({
    manager: FWManager
});


const manager = props.manager;
const windows_props = props.manager.props;
const windows_refs  = props.manager.refs;

</script>

<template>

    <FloatingWindow v-for="([title, zindex, wis, wprops, dims], index) in windows_props" :key="title" 
        :text="index" :title="title" :zindex="zindex" :wis="wis" :wprops="wprops" :dims="dims"
        :ref="el => windows_refs[title] = el"
        @window-request-focus="manager.focus_window_by_index(index)"
        />
    
</template>
