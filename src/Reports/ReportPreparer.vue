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

/**@type {import('vue').Ref<{perform_update: () => any}?>} */
const rep_ref = ref(null);
/**@type {import('vue').Ref<HTMLElement?>} */
const rep_renderer_ref = ref(null);

 async function update_and_open(with_print = true) {
    console.log('REP REF: ', rep_ref?.value);
    if(rep_ref.value === null) {
        throw new Error('Report component not assigned');
    }
    await rep_ref.value.perform_update();
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
    win.document.getElementsByName('font_size_input').forEach(x => x.setAttribute('value', '16'));

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

    <div class="noprint">
        <button type="button" onclick="window.print();" class="print_fallback_button"> DRUKUJ </button>
        Czcionka: <input name="font_size_input" type="number"
            step="0.2"
            oninput="document.querySelector('.page').style.fontSize = this.value + 'px'" 
        />
        <select onchange="document.querySelector('.page').style.fontFamily = this.value" class="noprint">
            <option value="Times New Roman"   > Times New Roman   </option>
            <option value="Arial"             > Arial             </option>
            <option value="Verdana"           > Verdana           </option>
            <option value="Tahoma"            > Tahoma            </option>
            <option value="Trebuchet MS"      > Trebuchet MS      </option>
            <option value="Georgia"           > Georgia           </option>
            <option value="Garamond"          > Garamond          </option>
            <option value="Courier New"       > Courier New       </option>
            <option value="Brush Script MT"   > Brush Script MT   </option>
        </select>
    </div>
    <component ref="rep_ref" :is="props.rep" v-bind="$attrs"/>
</div>


</template>


<style scoped>
    .printrender {
        display: none;
    }
</style>