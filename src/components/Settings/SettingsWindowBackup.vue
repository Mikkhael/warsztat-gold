<script setup>
//@ts-check
import { ReactiveSetting, ReactiveSettingValue, Settings, SettingsDefaults } from './Settings';
import { EditableArray, SelectFileDialog, FormInput, FormCheckbox } from '../Controls';
import { markRaw, ref } from 'vue';
import { useMainBackupManager } from '../Backup';

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

const backupManager = useMainBackupManager();

function add_new_list_elem() {
    props.category.modify_ref(x => {
        const new_list_elem = SettingsDefaults.backup_list_elem();
        const wrapped = ReactiveSetting.wrap(new_list_elem);
        x.list.push(wrapped);
        return x;
    });
    return true;
}
/**
 * @param {number} index 
 */
function delete_list_elem(index) {
    props.category.modify_ref(x => {
        x.list.splice(index, 1);
        return x;
    });
    return true;
}


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

const enable_debug = ref(false);
const mock_date = ref("2024.02.10 11:22:03");
const test_nomock = ref(false);
const test_delete = ref(false);
function perform_manual_backup(mock = false) {
    if(mock) {
        return backupManager.perform_backup(!test_delete.value, !test_nomock.value, mock_date.value);
    } else {
        return backupManager.perform_backup();
    }
}

</script>


<template>

    <div class="sub_container">

        <!-- <p style="text-wrap: wrap; grid-column: 1 / end;">
            {{ settings }}
        </p> -->

        <!-- <div
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
        </div> -->
        <EditableArray 
          :value="settings.list" 
          v-slot="/**@type {{elem: settings['value']['list'][number], index: number}} */ {elem, index}"
          :insert_handler="add_new_list_elem"
          :delete_handler="delete_list_elem">
            <div class="entry">
                <div class="path">
                    <span>Ścierzka:</span>
                    <FormInput :value="elem.path" />
                    <SelectFileDialog :options="{directory: true, defaultPath: elem.path.local.value}" @selected="res => elem.path.local.value = res"/>
                </div>
                <div>Okres</div>
                <div>Włącz/Wyłącz</div>
                <div>Maksymalna liczba kopii (0 = bez limitu)</div>
                <template
                v-for="variant in variants"
                >
                    <div class="variant_name"> {{ variant.display }} </div>
                    <div class="variant_enable">
                        <FormCheckbox :value="elem[variant.name + '_en']" />
                    </div>
                    <div class="variant_max">
                        <FormInput type="integer" min="0" nonull :value="elem[variant.name + '_max']" /> 
                    </div>
                </template>
            </div>
        </EditableArray>
        <button @click="e => e.shiftKey ? enable_debug = true : perform_manual_backup()">
            Wykonaj kopię zapasową manualnie
        </button>
        <template v-if="enable_debug">
            <button @click="perform_manual_backup(true)">
                Debug
            </button>
            <input type="text" v-model="mock_date">
            <label>no-mock: <input type="checkbox" v-model="test_nomock"></label>
            <label>delete:  <input type="checkbox" v-model="test_delete"></label>
        </template>
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