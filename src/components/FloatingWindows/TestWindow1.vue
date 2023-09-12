<script setup>

const props = defineProps({
    text: String,
    index: Number
});


</script>


<template>

    <h1>TEST WINDOW (TYPE I)</h1>
    <p>{{ props.text }}</p>
    <p>Number: {{ props.index * 100 }}</p>

</template>


<style scoped>

    h1{
        color: yellow;
    }

</style>