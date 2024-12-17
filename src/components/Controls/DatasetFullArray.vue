<script setup>
//@ts-check

import { triggerRef, watch } from 'vue';
import { FormDataSetFull, FormDataSetFull_LocalRow} from '../Dataset';
import EditableArray from './EditableArray.vue';


const props = defineProps({
    dataset: {
        type: FormDataSetFull,
        required: true
    },
    show_deleted: Boolean,
});


const value = props.dataset.local_rows;

function row_insert() {
    // console.log("INSERTING", value, value.value.length);
    props.dataset.add_row_default();
    // console.log("INSERTED",  value, value.value.length);
    triggerRef(value);
}
function row_delete(index) {
    props.dataset.mark_row_deleted(index);
}
function key_getter(index) {
    return props.dataset.get_unique_key(index);
}
function vif_getter(index, elem) {
    return props.show_deleted || !elem.deleted;
}

</script>

<template>

    <EditableArray
        :value="value"
        :insert_handler="row_insert"
        :delete_handler="row_delete"
        :key_getter="key_getter"
        :vif_getter="vif_getter"
    >
    <template v-slot="/**@type {{ elem: FormDataSetFull_LocalRow, index: number }} */ slot_props">
         <slot v-bind="slot_props" 
               :deleted="slot_props.elem.deleted" 
               :inserted="slot_props.elem.inserted"
        ></slot>
    </template>

    </EditableArray>

</template>