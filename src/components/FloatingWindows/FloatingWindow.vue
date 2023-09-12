<script setup>
import { ref, onRenderTriggered, reactive, onMounted } from "vue";

const props = defineProps(['title', 'text', 'dims', 'zindex']);
const emit = defineEmits(['window-request-focus']);

const window = ref();
const main = ref();

let curr_pos_x = props.dims?.x ?? 0;
let curr_pos_y = props.dims?.y ?? 0;

function update_current_pos() {
    window.value.style.left = curr_pos_x + 'px';
    window.value.style.top  = curr_pos_y + 'px';
}

function set_size(w = props.dims?.w ?? 300, h = props.dims?.h ?? 300){
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

onMounted(() => {
    set_size();
    update_current_pos();
});


</script>

<template>

    <div class="window" ref="window" :style="{zIndex: props.zindex}" @mousedown="emit('window-request-focus')">
        <header ref="header" @mousemove="handle_drag_window($event)" >
            {{ props.title }}
        </header>

        <main ref="main" >
            <p>{{ props.text }}</p>
        </main>
    </div>
    
</template>

<style scoped>

* {
    box-sizing: border-box;
}
.window{
    border: 1px solid black;
    position: absolute;
    pointer-events: auto;
    background-color: white;
}
.window > header {
    border-bottom: 4px solid green;
    background-color: #888888;
    text-align: left;
    width: 100%;
    padding-left: 3px;
    user-select: none;
    cursor: all-scroll;
}
.window > main {
    border: 1px solid red;
    width: 100%;
    overflow: scroll;
    resize: both;
}
</style>
