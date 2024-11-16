<script setup>
//@ts-check
import { ref } from 'vue';
import { useMainSettings, Settings } from './Settings';
import { FormInput } from '../Controls';

/**
 * @typedef {import('./Settings').SettingsCategoryNames} SettingsCategoryNames
 */

const props = defineProps({
    category: {
        /**@type {import('vue').PropType<import('./Settings').ReactiveSettingsCategory<'test'>>} */
        type: Object,
        required: true,
    },
});

</script>


<template>

    <div class="sub_container">

        TEST TEST <br>
        val1 = <FormInput type="text"   :value="category.fields.val1" /> <br>
        val2 = <FormInput type="number" :value="category.fields.val2" /> <br>

    </div>

</template>

<style scoped>

</style>