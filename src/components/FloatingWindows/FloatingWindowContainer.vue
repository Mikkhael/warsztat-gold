<script setup>
import FloatingWindow from "./FloatingWindow.vue"
import { ref, reactive } from "vue";

// [title, zindex]
const windows_props = reactive([]);
const windows_refs  = reactive({});


function get_window_index(title) {
    return windows_props.findIndex(w => w[0] === title);
}

function get_window_ref(title){
    const index = get_window_index(title);
    return index === -1 ? null : windows_refs[index];
}

function unfocus_all_by_1(){
    for(let i in windows_props){
        windows_props[i][1] -= 1;
    }
}
function focus_window_by_index(index){
    unfocus_all_by_1();
    windows_props[index][1] = 0;
}

function focus_window_by_title(title){
    const index = get_window_index(title);
    if(index !== -1) focus_window_by_index();
}

function open_window_unchecked(title){
    unfocus_all_by_1();
    windows_props.push([title, 0]);
}

function open_or_reopen_window(title){
    const index = get_window_index(title);
    if(index !== -1)
        close_window(title);
    open_window_unchecked(title);
}

function open_or_focus_window(title){
    const index = get_window_index(title);
    if(index === -1){
        open_window_unchecked(title);
    }else{
        focus_window_by_index(index);
    }
}

function close_window(title){
    const index = get_window_index(title);
    if(index !== -1){
        windows_props.splice(index, 1);
    }
}

defineExpose({
    get_window_index,
    get_window_ref,
    open_or_focus_window,
    open_or_reopen_window,
    close_window
});

</script>

<template>

    <FloatingWindow v-for="([title, zindex], index) in windows_props" :key="title" 
        :text="index" :title="title" :zindex="zindex"
        @window-request-focus="focus_window_by_index(index)"
        />
    
</template>
