<script setup>
//@ts-check
import { watch, ref, reactive, toRef } from "vue";
import SimpleScrollerState from "../SimpleSrollerState";


import useMainMsgManager from "./Msg/MsgManager";
const msgManager = useMainMsgManager();
function handle_err(err){
	console.error(err);
	msgManager.postError(err);
	is_error.value = true;
}

/**@typedef {string | number | BigInt} BigIntable */

// const props = defineProps(['query', 'index', 'step']);
const props = defineProps({
	query: {
		type: String,
		required: true
	},
	index: {
        /**@type {import('vue').PropType<bigint>} */
		//@ts-ignore
		type: BigInt,
		required: true
	},
	step: {
        /**@type {import('vue').PropType<BigIntable>} */
		//@ts-ignore
		type: [BigInt, Number, String],
		default: 1n
	},
	limit: {
        /**@type {import('vue').PropType<BigIntable>} */
		//@ts-ignore
		type: [BigInt, Number, String],
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

async function scroll(steps) {
	await state.scroll(steps);
	is_error.value = false;
}

async function goto(target) {
	await state.goto(target);
	is_error.value = false;
}
function goto_first(){ return goto(1); }
function goto_last() { return goto(-props.limit); }

/**
 * @param {Event} event 
 */
function handle_changed(event) {
	//@ts-ignore
	const value = /**@type {string} */ (event.target?.value);
	const value_bigint = BigInt(value);
	update_current_index(value_bigint).catch(handle_err);
}

defineExpose({
	state
});

</script>

<template>

<div class="form_scroller" :class="{is_error, is_empty: state.is_empty, is_count_oot: !state.is_count_utd}">
	<input type="button" class="btn prev bound" @click="goto_first().catch(handle_err)">
	<input type="button" class="btn prev step2" @click="scroll(-props.step).catch(handle_err)">
	<input type="button" class="btn prev step"  @click="scroll(-1).catch(handle_err)">
	<input type="text"   class="txt curr" :value="props.index" @change="handle_changed($event)">
	<input type="button" class="btn next step"  @click="scroll(1).catch(handle_err)">
	<input type="button" class="btn next step2" @click="scroll(props.step).catch(handle_err)">
	<input type="button" class="btn next bound" @click="goto_last().catch(handle_err)">
	<span  class="txt count as_input"> ({{ state.count }}) </span>
	<!-- <span  class="as_input"> | C: {{ state.is_count_utd }} | E: {{ state.is_empty }} </span> -->
</div>

</template>

<style scoped>


</style>