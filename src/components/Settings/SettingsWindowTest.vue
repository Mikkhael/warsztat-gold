<script setup>
//@ts-check
import { computed, watch } from 'vue';
import { FormInput } from '../Controls';

/**
 * @typedef {import('./Settings').SettingsCategoryNames} SettingsCategoryNames
 */

const props = defineProps({
    category: {
        /**@type {import('vue').PropType<import('./Settings').ReactiveSetting<'test'>>} */
        type: Object,
        required: true,
    },
});

const settings = props.category.ref.value;


</script>


<template>

    <div class="sub_container">

        TEST TEST <br>
        val1 = <FormInput type="text"   :value="settings.val1" /> <br>
        val2 = <FormInput type="number" :value="settings.val2" /> <br>

    </div>

</template>

<style scoped>

</style>