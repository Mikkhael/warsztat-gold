<script setup generic="T">
//@ts-check

import { ref, watch, toRef, nextTick } from 'vue';

const props = defineProps({
    value: {
        /**@type {import('vue').PropType<T[]>} */
        type: Array,
        required: true
    },
    add_text: {
        type: String,
        default: "Dodaj"
    },

    nodelete: Boolean,
    noinsert: Boolean,

    key_getter: {/**@type {import('vue').PropType<(index: number, elem: T) => boolean>} */ 
        type: Function
    },
    vif_getter: {/**@type {import('vue').PropType<(index: number, elem: T) => any>} */ 
        type: Function
    }, 

    insert_handler: {
        /**@type {import('vue').PropType<(index: number, elem: T?, arr: T[]) => boolean>}   */ 
        //@ts-ignore
        type: Function,
    },
    delete_handler: {
        /**@type {import('vue').PropType<(index: number, elem: T?, arr: T[]) => boolean>}   */ 
        //@ts-ignore
        type: Function,
    },
});

watch(toRef(props, 'value'), (new_value) => {
    console.log('CHANGED ARRAY VALUE', new_value, new_value.length);
})


const show = ref(true);
async function force_refresh() {
    show.value = false;
    await nextTick();
    show.value = true;
}

/**
 * @param {number} index 
 * @param {T?} elem 
 */
function perform_insert(index = -1, elem = null) {
    if(props.noinsert) return;
    if(index < 0) index = props.value.length - index + 1;
    if(props.insert_handler) {
        if(props.insert_handler(index, elem, props.value)) {
            force_refresh();
        }
        return;
    }
    //@ts-ignore
    props.value.splice(index, 0, elem);
}
/**
 * @param {number} index 
 */
function perform_delete(index) {
    if(props.nodelete) return;
    if(index < 0) index = props.value.length - index + 1;
    if(props.delete_handler) {
        if(props.delete_handler(index, props.value[index], props.value)){
            force_refresh();
        }
        return;
    }
    props.value.splice(index, 1)[0];
}


defineExpose({
    perform_insert,
    perform_delete,
    force_refresh
});

</script>

<template>
    <div class="EditableArray_container" v-if="show" >
        <div class="EditableArray_element" 
        v-for="(elem, index) in props.value"
        :key="props.key_getter?.(index, elem)"
        >
            <template v-if="props.vif_getter?.(index, elem) ?? true">
                <slot :elem="/**@type {any}*/ (elem)" :index="index" ></slot>
                <div class="EditableArray_erase_button_container">
                    <img class="button" 
                    src="./../../assets/icons/trashx.svg" 
                    @click="perform_delete(index)" 
                    v-if="!props.nodelete"/>
                </div>
            </template>
        </div>
        <div class="button EditableArray_add" @click="perform_insert()" v-if="!props.noinsert">
            {{ props.add_text }}
        </div>
    </div>

</template>

<style scoped>

.EditableArray_container {
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: stretch;
}

.EditableArray_element {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: space-between;
    align-items: center;
}

.EditableArray_element > ::v-deep(*) {
    flex-grow: 1;
}

.EditableArray_element > .EditableArray_erase_button_container {
    flex-grow: 0;
}

.EditableArray_erase_button_container > .button {
    width: 3ch;
}

.EditableArray_add {
    padding: 3px;
    text-align: center;
}

</style>