<script setup>

import { watch, ref, reactive, toRef } from "vue";
import ScrollerState from "../ScrollerState";

const props = defineProps(['query_props', 'value']);
const emit = defineEmits(['update:value']);

function emit_value(value) {return emit('update:value', value);}

const state = reactive( new ScrollerState(props.value, emit_value) );
const is_error = ref(true);

watch(props.query_props, async (newValue, oldValue) => {
	console.log("Updating query props", oldValue, newValue);
	// console.log(queries);
	state.update_queries(
		newValue.value_name, 
		newValue.from, 
		newValue.where);
	is_error.value = true;
	try{
		await state.update_bounds();
		await state.goto(state.value);
		is_error.value = false;
	} catch (err) {
		handle_err(err);
	}
}, {immediate: true});

watch(toRef(props, 'value'), async (newValue, oldValue) => {
	console.log("Updating value", oldValue, newValue);
	if(newValue === state.value) return;
	state.value = newValue;
	try{
		await state.goto(state.value);
		is_error.value = false;
	} catch (err) {
		handle_err(err);
	}
});

async function update_current_value(value = props.value){
	await state.goto(value);
	is_error.value = false;
}

async function click_last() {
	console.log("click last");
	await state.goto_bound(true);
	is_error.value = false;
}
async function click_frst() {
	console.log("click first");
	await state.goto_bound(false);
	is_error.value = false;
}
async function click_prev() {
	console.log("click prev");
	await state.scroll(false, false);
	is_error.value = false;
}
async function click_next() {
	console.log("click next");
	await state.scroll(false, true);
	is_error.value = false;
}

function handle_err(err){
	console.error(err);
	is_error.value = true;
}

defineExpose({
	state
});

</script>

<template>

<div class="form_scroller" :class="{is_error, none_found: state.is_empty}">
	<input type="button" class="btn prev" value="<|" @click="click_frst().catch(handle_err)">
	<input type="button" class="btn prev" value="<" @click="click_prev().catch(handle_err)">
	<input type="text"   class="txt curr" :value="props.value" @change="update_current_value($event.target.value).catch(handle_err); $event.target.value = props.value;">
	<input type="button" class="btn next" value=">" @click="click_next().catch(handle_err)">
	<input type="button" class="btn next" value="|>" @click="click_last().catch(handle_err)">
	<span  class="txt bounds"> {{ state.bounds[0] }} .. {{ state.bounds[1] }} </span>
	<span> | B: {{ state.is_bounds_utd }} | C: {{ state.is_curr_utd }} | E: {{ state.is_empty }} </span>
</div>

</template>

<style>

.form_scroller {
	display: flex;
	flex-direction: row;
}

.form_scroller.is_error {
	background-color: rgb(255, 113, 113);
}
.form_scroller.none_fund .bounds {
	color: red;
}
.form_scroller.none_fund .curr {
	color: red;
}

</style>