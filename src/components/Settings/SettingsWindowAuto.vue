<script setup generic="T extends import('./Settings').SettingsCategoryNames">
//@ts-check
import { computed, watch } from 'vue';
import { FormInput } from '../Controls';

/**
 * @typedef {import('./Settings').SettingsCategoryNames} SettingsCategoryNames
 */

const props = defineProps({
    category: {
        /**@type {import('vue').PropType<import('./Settings').ReactiveSetting<T>>} */
        type: Object,
        required: true,
    },
});

const settings = props.category.ref.value;


</script>


<template>

    <div class="sub_container">

        <template v-for="(value, key) in settings">
            <label>{{ key }}</label> <FormInput :type="typeof value === 'number' ? 'number' : 'text'" :value="/**@type {any} */ (value)"  />
        </template>

    </div>

</template>

<style scoped>

    .sub_container {
        display: grid;
        grid-template: auto / auto 1fr;
        align-items: center;
        justify-content: start;
        gap: 3px;
    }

</style>