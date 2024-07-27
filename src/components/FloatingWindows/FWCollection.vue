<script setup>
import { onMounted } from 'vue';
import FWManager from './FWManager';

const manager = new FWManager();

const props = defineProps({});


defineExpose({
    manager
});


</script>

<template>

    <div class="FW_collection">

        <div class="FW_window" v-for="([title, window]) in manager.opened_windows">

            <!-- <component :is="wis" v-bind="props.wprops"></component> -->
            title: {{ title.toString() }} <br>
            component: {{ window.box.id.toString() }}

        </div>

    </div>
    
</template>


<style scoped>
    .FW_collection {
        border: 1px solid green;
        /* display: none; */
    }
</style>
