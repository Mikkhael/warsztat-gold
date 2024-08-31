<script setup>
import { Teleport } from 'vue';
import {FWManager} from './FWManager';

const props = defineProps({
    manager: {
        type: FWManager,
        required: true
    }
});

</script>

<template>

    <div class="FW_collection">

        <div class="FW_window" v-for="([title, window]) in props.manager.opened_windows">
<!-- 
            title: {{ title.toString() }} <br>
            component: {{ window.box.id.toString() }} -->
            <Teleport :to="window.get_mount_selector()">
                <component :is="window.component" v-bind="window.props" :parent_window="window" v-on="window.listeners"></component>
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
