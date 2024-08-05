<script setup>
//@ts-check
import { watch, ref, reactive, toRef } from "vue";
import SimpleScrollerState from "../SimpleSrollerState";


import useMainMsgManager from "./Msg/MsgManager";
const msgManager = useMainMsgManager();
function handle_err(err){
	console.error(err);
	msgManager.post("error", err);
	is_error.value = true;
}

// const props = defineProps(['query', 'index', 'step']);
const props = defineProps({
	query: {
		type: String,
		required: true
	},
	index: {
        /**@type {import('vue').PropType<bigint>} */
		type: undefined,
		required: true
	},
	step: {
        /**@type {import('vue').PropType<bigint>} */
		type: undefined,
		default: 1n
	},
	limit: {
        /**@type {import('vue').PropType<bigint>} */
		type: undefined,
		default: 1n
	}
});


const emit = defineEmits(['update:index']);

function emit_index(index) {console.log(index, 'aha'); return emit('update:index', index);}

const state = reactive( new SimpleScrollerState(props.index, props.query, emit_index) );
const is_error = ref(true);

watch(toRef(props, 'query'), async (newValue, oldValue) => {
	console.log("Updating query", oldValue, newValue);
	// console.log(queries);
	state.update_queries(newValue);
	try{
		await state.update_count();
		is_error.value = false;
	} catch (err) {
		handle_err(err);
	}
}, {immediate: true});

watch(toRef(props, 'index'), async (newValue, oldValue) => {
	console.log("Updating index", oldValue, newValue);
	if(newValue === state.index) return;
	try{
		state.index = BigInt(newValue);
	} catch (err) {
		if(err instanceof SyntaxError){
			// Failed BigInt convertion - don't change index
		} else throw err;
	}
	try{
		await state.goto(state.index);
		is_error.value = false;
	} catch (err) {
		handle_err(err);
	}
});

async function update_current_index(index = props.index){
	await state.goto(index);
	is_error.value = false;
}

async function click_last() {
	console.log("click last");
	await state.goto(-props.limit);
	is_error.value = false;
}
async function click_frst() {
	console.log("click first");
	await state.goto(1);
	is_error.value = false;
}
async function click_prev() {
	console.log("click prev");
	await state.scroll(-props.step);
	is_error.value = false;
}
async function click_next() {
	console.log("click next");
	await state.scroll(props.step);
	is_error.value = false;
}

defineExpose({
	state
});

</script>

<template>

<div class="form_scroller" :class="{is_error, is_empty: state.is_empty, is_count_oot: !state.is_count_utd}">
	<input type="button" class="btn prev" value="<|" @click="click_frst().catch(handle_err)">
	<input type="button" class="btn prev" value="<" @click="click_prev().catch(handle_err)">
	<input type="text"   class="txt curr" :value="props.index" @change="update_current_index($event.target.value).catch(handle_err); $event.target.value = props.index;">
	<input type="button" class="btn next" value=">" @click="click_next().catch(handle_err)">
	<input type="button" class="btn next" value="|>" @click="click_last().catch(handle_err)">
	<span  class="txt count as_input"> ({{ state.count }}) </span>
	<span  class="as_input"> | C: {{ state.is_count_utd }} | E: {{ state.is_empty }} </span>
</div>

</template>

<style>

.form_scroller {
	display: flex;
	flex-direction: row;
	background-color: #e6e4e4;
	border-top: 1px solid black;
	padding: 1px;
}

.form_scroller.is_error {
	color: red;
	background-color: #ff7171;
}

.form_scroller.is_empty .count,
.form_scroller.is_empty .curr,
.form_scroller.is_count_oot .count {
	background-color: #ebe1b4;
	color: #ffc012;
}

</style>