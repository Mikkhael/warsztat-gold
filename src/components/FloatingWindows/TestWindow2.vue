<script setup>

const props = defineProps(['text', 'aha']);

function update_aha(event) {
    props.aha[0] = event.target.value;
}

</script>


<template>

    <h1>TEST WINDOW (TYPE II)</h1>
    <p>{{ props.text }}</p>
    <p>ZINDEX: <input type="number" step="1" :value="aha[0]" @change="update_aha($event)"></p>

</template>

<style scoped>

    h1{
        color: red;
    }

</style>