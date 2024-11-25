<script setup>
//@ts-check
import { open } from '@tauri-apps/api/dialog';

const props = defineProps({
    options: {
        /**@type {import('vue').PropType<import('@tauri-apps/api/dialog').OpenDialogOptions>} */
        type: Object,
        default: {}
    }
});

const emit = defineEmits({
    /**@type {(paths: string[]) => void} */
    //@ts-ignore
    selected_all: () => true,
    /**@type {(paths: string) => void} */
    //@ts-ignore
    selected: () => true
})

async function onclick() {
    const res = await open(props.options);
    if(!res) return;
    if(typeof res === 'string') {
        emit('selected',     res);
        emit('selected_all', [res]);
    } else if(res.length > 0) {
        emit('selected',     res[0]);
        emit('selected_all', res);
    }
}

</script>

<template>

<img src="./../../assets/icons/folder_open.svg" class="button" @click="onclick">

</template>


<style scoped>

    img{
        box-sizing: border-box;
        padding: 1px;
        height: 3ch;
        display: inline-block;
    }

</style>
