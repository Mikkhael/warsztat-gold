<script setup>
import { Teleport } from 'vue';
import {FWManager} from './FWManager';

const props = defineProps({
    manager: {
        type: FWManager,
        required: true
    }
});

const emit = defineEmits(['error']);

function fwd_error(err) {
    emit('error', err);
}

</script>

<template>

    <div class="FW_collection">

        <div class="FW_window" v-for="([title, window]) in props.manager.opened_windows" :key="window.id">
            <Teleport :to="window.get_mount_selector()">
                <component 
                    :is="window.component"
                    :parent_window="window"
                    v-bind="window.props"
                    v-on="window.listeners"
                    @error="fwd_error"
                ></component>
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
