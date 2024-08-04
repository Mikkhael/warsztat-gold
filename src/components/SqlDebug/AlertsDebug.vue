<script setup>

import CornerMsgContainer from '../Msg/CornerMsgContainer.vue';
import MsgManager from '../Msg/MsgManager';

const lorem2   = `lorem ipsum`;
const lorem10  = 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Non, tenetur?';
const lorem20  = 'Lorem ipsum dolor sit amet consectetur, adipisicing elit. Nulla pariatur nemo magnam velit exercitationem dicta corrupti id iusto explicabo ratione.';
const lorem100 = 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Unde molestias, ducimus quo iusto rerum quia aliquid amet assumenda enim minus esse ex eligendi voluptas dolorum expedita vel dicta! Dolorum dolores, harum molestiae, inventore hic tenetur quibusdam non reprehenderit, itaque tempore modi veniam doloremque voluptas a tempora magni. Ipsam consequuntur soluta exercitationem itaque repellat libero accusamus totam distinctio ipsum iste in pariatur, expedita, ducimus officia! Suscipit alias cum vitae corporis aut. Esse dolores saepe inventore amet optio praesentium libero voluptas laboriosam, vel aspernatur alias molestias harum repellendus recusandae placeat id earum ducimus ipsum, natus itaque modi obcaecati? Omnis ea tenetur aperiam.';


const manager = new MsgManager();
const main_manager = MsgManager.getMain();

function get_random(count) {
    return Math.floor(Math.random() * count);
}

function post_random(on_main = false) {
    const content_kind = get_random(4);
    const type_kind = get_random(5);
    const timeout = get_random(2) * 2000;

    const contents = [lorem2, lorem10, lorem20, lorem100];
    const types = ['info', 'succ', 'warn', 'error', 'critical'];

    const content = contents[content_kind];
    const type = types[type_kind];

    if(on_main) {
        main_manager?.post(type, content, timeout, (msg) => {
            console.log("MAIN CLICKED MSG", msg);
        });

        console.log('MAIN POSTED', type, timeout, content);
    } else {
        manager.post(type, content, timeout, (msg) => {
            console.log("CLICKED MSG", msg);
        });

        console.log('POSTED', type, timeout, content);
    }
    
}


</script>

<template>

    <button @click="post_random(false)" >Post Random</button>
    <button @click="post_random(true)" >Post Random MAIN</button>

    <CornerMsgContainer :manager="manager" class="msg_container"/>


<!-- 
    <div class="static_container">

        <CornerMsg type="info"     @click="console.log(1)" @close="console.log(10)" :content="lorem2" />
        <CornerMsg type="succ"     @click="console.log(2)" @close="console.log(20)" :content="lorem2 + 'asdf'" />
        <CornerMsg type="warn"     @click="console.log(3)" @close="console.log(30)" :content="lorem10" />
        <CornerMsg type="error"    @click="console.log(4)" @close="console.log(40)" :content="lorem20" />
        <CornerMsg type="critical" @click="console.log(5)" @close="console.log(50)" :content="lorem100" />

    </div> -->

</template>

<style scoped>

    button {
        display: block;
        align-self: center;
    }

    .msg_container {
        /* pointer-events: none; */
        border: 2px solid green;
    }

</style>