<script setup>

import CornerMsg from '../Msg/CornerMsg.vue';

const lorem2   = `lorem ipsum`;
const lorem10  = 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Non, tenetur?';
const lorem20  = 'Lorem ipsum dolor sit amet consectetur, adipisicing elit. Nulla pariatur nemo magnam velit exercitationem dicta corrupti id iusto explicabo ratione.';
const lorem100 = 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Unde molestias, ducimus quo iusto rerum quia aliquid amet assumenda enim minus esse ex eligendi voluptas dolorum expedita vel dicta! Dolorum dolores, harum molestiae, inventore hic tenetur quibusdam non reprehenderit, itaque tempore modi veniam doloremque voluptas a tempora magni. Ipsam consequuntur soluta exercitationem itaque repellat libero accusamus totam distinctio ipsum iste in pariatur, expedita, ducimus officia! Suscipit alias cum vitae corporis aut. Esse dolores saepe inventore amet optio praesentium libero voluptas laboriosam, vel aspernatur alias molestias harum repellendus recusandae placeat id earum ducimus ipsum, natus itaque modi obcaecati? Omnis ea tenetur aperiam.';
</script>

<template>

    <div class="static_container">

        <CornerMsg title="Testowa Informacja 1" type="info" :content="lorem2"/>
        <CornerMsg title="Wrn" type="warn" :content="lorem10"/>
        <CornerMsg title="JAIOSHSDHUI suhgo JFISDO sJDIO sdf isdfjio sg jfiogdf gifdog jfigo fg" type="error" :content="lorem20"/>
        <CornerMsg title="Ala ma kota, kot ma alę. No i tyle" type="critical" :content="lorem100"/>

    </div>

</template>

<style scoped>

    .static_container {
        width: 20%;
        display: flex;
        flex-direction: column;
    }

    .static_container > * {
        margin-bottom: 5px;
    }

</style>