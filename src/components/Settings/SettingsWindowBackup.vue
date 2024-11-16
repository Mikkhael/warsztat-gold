<script setup>
//@ts-check
import { ref } from 'vue';
import { useMainSettings, Settings } from './Settings';
import { FormInput, FormCheckbox } from '../Controls';

/**
 * @typedef {import('./Settings').SettingsCategoryNames} SettingsCategoryNames
 */

const props = defineProps({
    category: {
        /**@type {import('vue').PropType<import('./Settings').ReactiveSettingsCategory<'backup'>>} */
        type: Object,
        required: true,
    },
});



const variants = [
    {
        name: 'mon',
        display: 'Co miesiąc',
        enable: props.category.fields.mon_en,
        max:    props.category.fields.mon_max
    },
    {
        name: 'wee',
        display: 'Co tydzień',
        enable: props.category.fields.wee_en,
        max:    props.category.fields.wee_max
    },
    {
        name: 'day',
        display: 'Co dzień',
        enable: props.category.fields.day_en,
        max:    props.category.fields.day_max
    },
    {
        name: 'std',
        display: 'Co uruchomienie programu',
        enable: props.category.fields.std_en,
        max:    props.category.fields.std_max
    },
];

</script>


<template>

    <div class="sub_container">

        <template
          v-for="variant in variants"
        >

            <div class="variant_name"> {{ variant.display }} </div>
            <div class="variant_enable">
                <!-- <span>Włącz</span> -->
                <!-- <br> -->
                <!-- <FormInput type="boolean" min="0" max="1" style="width:2ch" nospin nonull :value="variant.enable" />  -->
                <FormCheckbox :value="variant.enable" />
            </div>
            <div class="variant_max">
                <span>Maksymalna liczba kopii (0 = bez limitu)</span>
                <FormInput type="integer" min="0" nonull :value="variant.max" :disabled="!variant.enable.get_local()" /> 
            </div>

        </template>

    </div>

</template>

<style scoped>

    .sub_container {
        display: grid;
        grid-template-columns: auto auto auto;
        justify-items: stretch;
        justify-content: space-around;
        align-items: center;
        column-gap: 4px;
    }
    .sub_container > * {
        text-wrap: nowrap;
    }
    .variant_name {
        text-wrap: wrap;
        font-weight: bold;
        border-bottom: 1px dotted black;
    }
    .variant_max {
        display: flex;
        flex-direction: column;
        justify-content: stretch;
    }

</style>