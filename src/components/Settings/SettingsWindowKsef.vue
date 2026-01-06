<script setup>
//@ts-check
import { ReactiveSetting, SettingsDefaults } from './Settings';
import { EditableArray, SelectFileDialog, FormInput, FormCheckbox } from '../Controls';
import { toRef } from 'vue';

/**
 * @typedef {import('./Settings').SettingsCategoryNames} SettingsCategoryNames
 */

const props = defineProps({
    category: {
        /**@type {import('vue').PropType<import('./Settings').ReactiveSetting<'ksef'>>} */
        type: Object,
        required: true,
    },
});

const settings = props.category.ref;

</script>

<template>

    <div class="sub_container">
        <div class="path">
            <span>Ścierzka do pliku generowanych faktur:</span>
            <FormInput :value="settings.xml_file_path" />
            <SelectFileDialog :options="{directory: false, defaultPath: settings.xml_file_path.local.value}" @selected="res => settings.xml_file_path.local.value = res"/>
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


</style>