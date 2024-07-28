<script setup>
import { Teleport } from 'vue';
import FWManager from './FWManager';

const manager = new FWManager();


defineExpose({
    manager
});


</script>

<template>

    <div class="FW_collection">

        <div class="FW_window" v-for="([title, window]) in manager.opened_windows">
<!-- 
            title: {{ title.toString() }} <br>
            component: {{ window.box.id.toString() }} -->
            <Teleport :to="window.get_mount_selector()">
                <component :is="window.component" v-bind="window.props"></component>
            </Teleport>
        </div>

    </div>
    
</template>


<style scoped>
    .FW_collection {
        /* border: 1px solid green; */
        display: none;
    }
</style>
