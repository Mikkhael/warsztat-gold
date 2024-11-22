<script setup>
//@ts-check
import { compile, ref, shallowRef } from 'vue';
import { useMainSettings, Settings } from './Settings';
import { FormInput, FormCheckbox } from '../Controls';

/**
 * @typedef {import('./Settings').SettingsCategoryNames} SettingsCategoryNames
 */

const props = defineProps({
    category: {
        /**@type {import('vue').PropType<import('./Settings').ReactiveSetting<'backup'>>} */
        type: Object,
        required: true,
    },
});


const settings = props.category.ref;

const variants = [
    {
        name: 'mon',
        display: 'Co miesiąc',
    },
    {
        name: 'wee',
        display: 'Co tydzień',
    },
    {
        name: 'day',
        display: 'Co dzień',
    },
    {
        name: 'std',
        display: 'Co uruchomienie programu',
    },
];

</script>


<template>

    <div class="sub_container">

        <!-- <p style="text-wrap: wrap; grid-column: 1 / end;">
            {{ settings }}
        </p> -->

        <div
        v-for="entry in settings.list"
        class="entry"
        >
            <div class="path">
                <span>Ścierzka:</span>
                <FormInput :value="entry.path" />
            </div>
            <div>Okres</div>
            <div>Włącz/Wyłącz</div>
            <div>Maksymalna liczba kopii (0 = bez limitu)</div>
            <template
            v-for="variant in variants"
            >
                <div class="variant_name"> {{ variant.display }} </div>
                <div class="variant_enable">
                    <FormCheckbox :value="entry[variant.name + '_en']" />
                </div>
                <div class="variant_max">
                    <FormInput type="integer" min="0" nonull :value="entry[variant.name + '_max']" /> 
                </div>
            </template>
        </div>

    </div>

</template>

<style scoped>
    

    .path {
        grid-column: 1/4;
        display: flex;
        flex-direction: row;
    }
    .path > ::v-deep(input) {
        margin: 0px 10px;
        flex-grow: 1;
    }

    .entry {
        display: grid;
        grid-template-columns: auto auto auto;
        justify-items: stretch;
        justify-content: space-around;
        align-items: center;
        column-gap: 4px;

        margin-bottom: 3px;
        border-bottom: 2px solid black;
    }
    .entry > * {
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