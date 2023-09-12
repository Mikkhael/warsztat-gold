<script setup>
import { ref, onRenderTriggered, reactive, onMounted, computed } from "vue";

const props = defineProps(['title', 'text', 'zindex', 'dims', 'wis', 'wprops']);
const emit = defineEmits(['window-request-focus']);

const window = ref();
const main = ref();

const is_focused = computed(() => {
    return props.zindex == 0;
})

const init_pos_x  = props.dims?.x ?? 0;
const init_pos_y  = props.dims?.y ?? 0;
const init_size_w = props.dims?.w ?? 300;
const init_size_h = props.dims?.h ?? 300;

let curr_pos_x = init_pos_x;
let curr_pos_y = init_pos_y;

function update_current_pos() {
    window.value.style.left = curr_pos_x + 'px';
    window.value.style.top  = curr_pos_y + 'px';
}

function set_size(w = init_size_w, h = init_size_h){
    main.value.style.width  = w + 'px';
    main.value.style.height = h + 'px';
}


function handle_drag_window(event){
    if(event.buttons & 1) {
        curr_pos_x += event.movementX;
        curr_pos_y += event.movementY;
        update_current_pos();
    }
}

onRenderTriggered(() => {
    console.log("Rerender ", props.text);
})

function reapply_dims(){
    set_size();
    curr_pos_x = init_pos_x;
    curr_pos_y = init_pos_y;
    update_current_pos();
}

onMounted(() => {
    reapply_dims();
});

defineExpose({
    reapply_dims
});


</script>

<template>

    <div class="window" ref="window" :style="{zIndex: props.zindex}" :class="{focused: is_focused}" @mousedown="emit('window-request-focus')">
        <header ref="header" @mousemove="handle_drag_window($event)" >
            {{ props.title }}
        </header>

        <main ref="main">
            <component :is="wis" v-bind="props.wprops"></component>
        </main>
    </div>
    
</template>

<style scoped>

* {
    box-sizing: border-box;
}
.window{
    border: 1px solid black;
    background-color: white;
    position: absolute;
    pointer-events: auto;
    opacity: 0.8;
}

.window.focused {
    opacity: 1;
}
.window > header {
    border-bottom: 4px solid green;
    background-color: #61e4d2;
    text-align: left;
    width: 100%;
    padding-left: 3px;
    user-select: none;
    cursor: all-scroll;
}

.window.focused > header {
    background-color: #6361e4;
}
.window > main {
    border: 1px solid red;
    width: 100%;
    overflow: scroll;
    resize: both;
}
</style>
