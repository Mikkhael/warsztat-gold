<script setup>
//@ts-check
import { QuerySource } from '../components/Dataset';
import { nextTick, ref } from 'vue';


const props = defineProps({
    rep: {
        /**@type {import('vue').PropType<import('vue').Component>} */
        type: Object,
        required: true
    }
});

/**@type {import('vue').Ref<{src: QuerySource}?>} */
const rep_ref = ref(null);
/**@type {import('vue').Ref<HTMLElement?>} */
const rep_renderer_ref = ref(null);

 async function update_and_open(with_print = true) {
    console.log('REP REF: ', rep_ref?.value);
    if(rep_ref.value === null) {
        throw new Error('Report component not assigned');
    }
    await rep_ref.value.src.update_complete(true);
    return open(with_print);
}

function open(with_print = true) {
    if(rep_renderer_ref.value === null) {
        throw new Error('Report parent element not assigned');
    }
    const win  = window.open('about:blank', 'printwindow');
    console.log('REP WIN', win);
    if(!win) {
        throw new Error("Nie można otworzyć okna drukowania");
    }
    win.document.head.innerHTML = document.head.innerHTML;
    win.document.body.innerHTML = rep_renderer_ref.value.innerHTML;

    if(with_print) {
        nextTick().then(() => win.print());
    }
}

defineExpose({
    open,
    update_and_open,
    rep: rep_ref,
});

</script>

<template>

        
<div class="printrender" ref="rep_renderer_ref">
    <component ref="rep_ref" :is="props.rep" v-bind="$attrs"/>
</div>


</template>


<style scoped>
    .printrender {
        display: none;
    }
</style>