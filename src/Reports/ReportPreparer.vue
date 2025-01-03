<script setup>
//@ts-check
import { nextTick, ref } from 'vue';
import { WebviewWindow } from '@tauri-apps/api/window'
import { deffered_promise } from '../utils';


const props = defineProps({
    rep: {
        /**@type {import('vue').PropType<import('vue').Component>} */
        type: Object,
        required: true
    },
});

/**@type {import('vue').Ref<{perform_update: () => any, create_options?: () => string}?>} */
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

// function open(with_print = true) {
//     if(rep_renderer_ref.value === null) {
//         throw new Error('Report parent element not assigned');
//     }
//     const win  = window.open('printview.html', 'printwindow');
//     console.log('REP WIN', win);
//     if(!win) {
//         throw new Error("Nie można otworzyć okna drukowania");
//     } 
//     // const links = document.head.getElementsByTagName('link');
//     // for(const link of links) {
//     //     win.document.head.innerHTML += link.outerHTML;
//     // }
//     win.addEventListener('load', () => {
//         // win.document.head.innerHTML  = document.head.innerHTML;
//         win.document.body.innerHTML  = rep_renderer_ref?.value?.innerHTML ?? '';
//         if(rep_ref.value?.create_options) {
//             const options_elem = win.document.body.getElementsByClassName('print_options')[0];
//             options_elem.innerHTML += rep_ref.value.create_options();
//         }
//         win.document.getElementsByName('font_size_input').forEach(x => x.setAttribute('value', '16'));
//         if(with_print) {
//             nextTick().then(() => win.print());
//         }
//     })
// }
async function open(withPrint = false) {
    if(rep_renderer_ref.value === null) {
        throw new Error('Report parent element not assigned');
    }
    const print_window_label = 'printwindow';
    const old_win = WebviewWindow.getByLabel(print_window_label);
    if(old_win) {
        await old_win.close();
    }
    const win = new WebviewWindow(print_window_label, {
        url: '/printview.html',
        title: 'Podgląd Wydruku',
        width: 1600,
        height: 900,
    });
    const opened_win_deffered = deffered_promise();
    win.once('tauri://created', function () {
        console.log('WINDOW OPENED', win);
        win.once('ready', () => {
            console.log("WINDOW READY");
            const innerHTML   = rep_renderer_ref?.value?.innerHTML;
            const optionsHTML = rep_ref.value?.create_options?.();
            if(innerHTML) {
                win.emit('set_innerHTML', {innerHTML, optionsHTML, withPrint});
            }
        })
        opened_win_deffered.resolve(win);
    });
    win.once('tauri://error', function (e) {
        console.log('WINDOW NOT OPENED', win, e);
        opened_win_deffered.reject(e.payload);
    })
    return opened_win_deffered.promise;
}

defineExpose({
    open,
    update_and_open,
    rep: rep_ref,
});

</script>

<template>

        
<div class="printrender" ref="rep_renderer_ref">

    <button type="button"
     onclick="if(Array.from(document.querySelectorAll('.print_options input, .print_options select')).every(x => x.reportValidity())) window.print();" 
     class="print_fallback_button noprint"> 
        DRUKUJ 
    </button>
    <component ref="rep_ref" :is="props.rep" v-bind="$attrs"/>
    <div class="noprint print_options">
        <h3>Opcje</h3>
        <fieldset>
            <legend>Opcje czcionki</legend>
            <div>
                Rozmiar Czcionki: 
                <input name="font_size_input" type="number"
                    step="0.2"
                    oninput="document.querySelector('.page').style.fontSize = this.value + 'px'" 
                />
            </div>
            <div>
                Czcionka: 
                <select onchange="document.querySelector('.page').style.fontFamily = this.value" class="noprint">
                    <option value="Arial"             > Arial             </option>
                    <option value="Times New Roman"   > Times New Roman   </option>
                    <option value="Verdana"           > Verdana           </option>
                    <option value="Tahoma"            > Tahoma            </option>
                    <option value="Trebuchet MS"      > Trebuchet MS      </option>
                    <option value="Georgia"           > Georgia           </option>
                    <option value="Garamond"          > Garamond          </option>
                    <option value="Courier New"       > Courier New       </option>
                    <option value="Brush Script MT"   > Brush Script MT   </option>
                </select>
            </div>
        </fieldset>
    </div>
</div>


</template>


<style scoped>
    .printrender {
        display: none;
    }
</style>