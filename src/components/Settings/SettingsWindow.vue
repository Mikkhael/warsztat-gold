<script setup>
//@ts-check
import { computed, nextTick, ref, shallowRef } from 'vue';
import { useMainSettings, Settings } from './Settings';

import SettingsWindowBackup from './SettingsWindowBackup.vue';
import SettingsWindowTest from './SettingsWindowTest.vue';

/**
 * @typedef {import('./Settings').SettingsCategoryNames} SettingsCategoryNames
 */

const props = defineProps({
    parent_window: {
        /**@type {import('vue').PropType<import('../FloatingWindows/FWManager').FWWindow>} */
        type: Object,
        required: false
    },
    settings: {
        type: Settings,
        required: false,
    }
});

const emit = defineEmits(['error']);

function handle_error(err) {
    console.error(err);
    emit('error', err);
}


const settings = props.settings ?? useMainSettings();

const categories = /**@type {const} */ ([
    ['backup', 'Kopia Zapasowa', SettingsWindowBackup],
    ['test',   'Testowe Opcje',  SettingsWindowTest],
]);

const reactive_categories = settings.get_reactive_settings_all();
const changed = computed(() => Object.values(reactive_categories).some(x => x.changed.value));

const selected_category_name = ref(/**@type {SettingsCategoryNames} */('none'));
const subsettings_comp       = shallowRef(/**@type {any} */ (null));
const subsettings_reactive   = shallowRef(/**@type {import('./Settings').ReactiveSetting?} */ (null));



/**
 * @param {SettingsCategoryNames} new_category_name 
 */
async function select_category_name(new_category_name) {
    subsettings_comp.value = null;
    await nextTick();
    selected_category_name.value = new_category_name;
    const comp = categories.find(x => x[0] === new_category_name)?.[2] ?? null;
    subsettings_comp.value     = comp;
    subsettings_reactive.value = reactive_categories[new_category_name];
}

function save_changes() {
    Object.values(reactive_categories).forEach(category => {
        category.update_settings();
    });
    select_category_name(selected_category_name.value);
}
function undo_changes() {
    Object.values(reactive_categories).forEach(category => {
        category.recreate_ref_from_original();
    });
    select_category_name(selected_category_name.value);
}



// console.log(reactive_categories);


</script>


<template>

    <div class="container">
        <div class="categories">
            <div v-for="category in categories"
             :key="category[0]"
             class="category_button" 
             :class="{selected: selected_category_name === category[0]}"
             @click="select_category_name(category[0])"
            >
                {{ category[1] }}
            </div>
        </div>
        <div class="category_options">
            <component v-if="subsettings_comp !== null" :is="subsettings_comp" :category="subsettings_reactive" />
        </div>

        <input type="button" 
            class="saving_panel"
            @click="undo_changes()"
            :disabled="!changed"
            :value="changed ? 'Cofnij Zmiany' : ''" />
        <input type="button" 
            class="saving_panel"
            @click="save_changes()"
            :disabled="!changed"
            :value="changed ? 'Zapisz Zmiany' : ''" />
    </div>

</template>

<style scoped>

    .container {
        display: grid;
        width:  100%;
        height: 100%;

        grid: 1fr auto / auto 1fr 1fr;
    }

    .categories {
        display: flex;
        flex-direction: column;
        border-right: 2px black double;
        grid-row: 1 / -1;
        min-height: 0px;
        overflow-y: auto;
        scrollbar-width: thin;
    }
    .category_button {
        border-bottom: 1px black dashed;
        text-align: center;
        padding: 3px;
        user-select: none;
        cursor: pointer;
    }
    .category_button:hover {
        background-color: #d4f7f4;
    }
    .category_button.selected {
        background-color: #b6fcf6;
    }

    .saving_panel {
        border-top: 1px solid black;
        padding: 4px;
        text-align: center;
    }
    .saving_panel:disabled{
        cursor:auto;
    }

    .category_options {
        padding: 4px;
        min-height: 0px;
        overflow-y: auto;
        scrollbar-width: thin;
        grid-column: 2 / -1;
    }

    

</style>