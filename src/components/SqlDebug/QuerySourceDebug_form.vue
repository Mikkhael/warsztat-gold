<script setup>
//@ts-check

import useWarsztatDatabase from '../../DBStructure/db_warsztat_structure';
import {QuerySource, FormDataSet} from '../Dataset';
import useMainMsgManager from '../Msg/MsgManager';
import QuerySourceOffsetScroller from '../Scroller/QuerySourceOffsetScroller.vue';


const props = defineProps({
    src: {
        /**@type {import('vue').PropType<QuerySource>} */
        type: Object,
        required: true
    },
    name: {
        type: String,
        default: ""
    }
});

const msgManager = useMainMsgManager();

function handle_error(err) {
    msgManager.post('error', err);
}

// function computed_json(ref) {
//     return computed({
//         get()    {return JSON.stringify(ref.value);},
//         set(val) {ref.value = JSON.parse(val);}
//     });
// }

// function res_to_str(obj) {
//     const res = [];
//     for(let key in obj) {
//         res.push(key + ': ' + obj[key].ref.value);
//     }
//     return res.join('\n');
// }

// const data = props.src.dataset ?? new FormDataSet(props.src);

</script>

<template>

	<fieldset class="querySourceHelperContainer">
            <legend> {{ props.name }} </legend>

            <p>
                <div class="info"> COUNT: <span> {{ src.count.value }} </span></div>
                <div class="info"> EXP: <span> {{ src.expired.value }} </span></div>
                <div class="info"> INS: <span> {{ src.insert_mode.value }} </span></div>
                <div class="info"> CHE: <span> {{ src.changed.value }} </span></div>
            </p>

            <p>
                <input class="main_button" type="button" value="EXPIRE"   @click="src.expire()">
                <input class="main_button" type="button" value="UPDATE"   @click="src.update_complete()">
                <input class="main_button" type="button" value="REFRESH DATA" @click="props.src.dataset?.refresh()">
            </p>

            <!-- <p><textarea v-model="src1_res"></textarea></p> -->

            <form :class="{disabled: src.disabled.value, empty: src.is_empty.value}">
                <slot :data="props.src.dataset || new FormDataSet(null)" ></slot>

                <QuerySourceOffsetScroller 
                    :src="src"
                    :step="10"
                    insertable
                    saveable
                    :class="{disabled: src.disabled.value}"
                    @error="handle_error"
                />
            </form>

    </fieldset>

</template>

<style scoped>

    .info {
        display: inline-block;
        padding: 2px;
        border-right: 2px solid black;
    }

    form.empty {
        background-color: #85ff8f91;
    }
    form.disabled,
    .form_scroller.disabled {
        background-color: #ff000091;
    }
    
</style>
