<script setup>
//@ts-check

import { watch, toRef, onMounted } from 'vue';
import CornerMsg from './CornerMsg.vue';
import {MsgManager} from './MsgManager';

const props = defineProps({
    manager: {
        type: MsgManager,
        required: true
    }
});

function handle_close(id) {
    props.manager.close(id);
}

watch(props, (new_props) => {
 console.log('props', new_props);
})

</script>

<template>

    <div class="msg_container">
        <TransitionGroup name="msg_transition">
            <CornerMsg v-for="msg in props.manager.msgs" :key="msg.id"
                :type="msg.type"
                :content="msg.content"
                @click="msg.onclick(msg)"
                @close="handle_close(msg.id)"
            />
        </TransitionGroup>
    </div>


</template>

<style scoped>

.msg_transition-move,
.msg_transition-enter-active {
    transition: all 0.4s ease-in;
}
.msg_transition-leave-active {
    transition: all 0.4s ease-out;
    position: absolute;
}

.msg_transition-enter-from,
.msg_transition-leave-to {
  opacity: 0;
  transform: translateX(100%);
}


.msg_container {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: flex-end;
    width: 60%;
    
    position: fixed;
    right: 0px;
    bottom: 0px;
    top: 0px;

    pointer-events: none;
}

.msg_container > * {
    pointer-events: auto;
}

</style>