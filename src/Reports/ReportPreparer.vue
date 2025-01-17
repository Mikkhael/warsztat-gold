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

/**@type {import('vue').Ref<{perform_update: () => any, create_options?: () => string, title_getter?: string}?>} */
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
    const main_win = WebviewWindow.getByLabel("main");
    if(!main_win) {
        throw new Error("No main window");
    }
    const main_size = await main_win.outerSize()
    const win = new WebviewWindow(print_window_label, {
        url: '/printview.html',
        title: 'Podgląd Wydruku',
        width:  main_size.width,
        height: main_size.height,
    });
    const opened_win_deffered = deffered_promise();
    win.once('tauri://created', function () {
        console.log('WINDOW OPENED', win);
        win.center();
        win.once('ready', () => {
            console.log("WINDOW READY");
            const innerHTML   = rep_renderer_ref?.value?.innerHTML;
            const optionsHTML = rep_ref.value?.create_options?.();
            const titleGetter = rep_ref.value?.title_getter ?? "";
            if(innerHTML) {
                win.emit('set_innerHTML', {innerHTML, optionsHTML, withPrint, titleGetter});
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

    <div class="print_overlay noprint" style="pointer-events: none;">
        <button type="button"
            onclick="if(Array.from(document.querySelectorAll('.print_options input, .print_options select')).every(x => x.reportValidity())) window.perform_print();" 
            class="print_fallback_button noprint offset_top"> 
                DRUKUJ 
        </button>
        <div class="noprint" style="pointer-events: none; user-select: none;"> &nbsp; </div>
        <div class="print_options noprint offset_right" ref="print_options_ref">
            <input type="button" value=">" onclick="toggle_print_options(this)" style="position: absolute">
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
    <div class="offset_top noprint"></div>
    <component ref="rep_ref" :is="props.rep" v-bind="$attrs" style="z-index: 1;"/>
    <div class="offset_right noprint"></div>
     
    
</div>


</template>


<style scoped>
    .printrender {
        display: none;
    }
</style>