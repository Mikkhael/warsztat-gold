<script setup>
//@ts-check
import { watch, ref, readonly, toRef, toRefs } from "vue";
import ScrollerState from "../ScrollerState";

const props = defineProps({
	query_value_name: {
		type: String,
		default: 'rowid'
	},
	query_from: {
		type: String,
		required: true
	},
	query_where: {
		type: String,
		default: ''
	},
	before_change: {
		/**@type {import('vue').PropType<(() => Promise<boolean>)?>} */
		//@ts-ignore
		type: Function,
		default: null
	},
	initial_value: {
		type: [String, Number],
		required: true
	},
	norefresh: {
		type: Boolean,
		default: false
	}
});
const props_refs = toRefs(props);
const emit = defineEmits(['changed','refresh_request','error']);

// import useMainMsgManager from "./Msg/MsgManager";
// const msgManager = useMainMsgManager();
// function handle_err(err){
// 	console.error(err);
// 	msgManager.post("error", err);
// 	is_error.value = true;
// }

const displayed_value = ref(props.initial_value);

const state = new ScrollerState(props.initial_value, props.before_change);
const is_error = ref(true);

/**
 * @param {Error} err 
 */
function handle_err(err) {
	is_error.value = true;
	emit('error', err);
}

/**
 * @param {string | number | undefined} new_value 
 */
function handle_changed(new_value) {
	if(new_value === undefined) return new_value;
	displayed_value.value = new_value;
	emit('changed', new_value);
	return new_value;
}



watch([props_refs.query_value_name, props_refs.query_from, props_refs.query_where], async (newValues, oldValues) => {
	console.log("Updating query props", oldValues, newValues);
	// console.log(queries);
	state.update_queries(
		newValues[0], 
		newValues[1], 
		newValues[2]);
	is_error.value = false;
	try{
		const new_value = await state.refresh();
		is_error.value = false;
		handle_changed(new_value);
	} catch (err) {
		handle_err(err);
	}
}, {immediate: true});


/**
 * @param {boolean} to_bound 
 * @param {boolean} to_next 
 */
async function scroll(to_bound, to_next, force_update = false) {
	try{
		let res;
		if(to_bound) {
			res = await state.goto_bound(to_next, force_update || is_error.value);
		} else {
			res = await state.goto_step(to_next, force_update || is_error.value);
		}
		if(res !== undefined) {
			is_error.value = false;
			return handle_changed(res);
		}
		return res;
	} catch (err) {
		handle_err(err);
		throw err;
	}
}

/**
 * @param {string | number} value 
 */
async function goto(value, force_update = false, dir_next = true) {
	try {
		const res = await state.goto(value, force_update || is_error.value, dir_next);
		if(res !== undefined) {
			is_error.value = false;
			return handle_changed(res);
		}
		return res;
	} catch (err) {
		handle_err(err);
		throw err;
	}
}

async function update_scroll_from_input(event) {
	return await goto(event.target.value, is_error.value);
}


async function refresh(dir_next = true) {
	try{
		await state.refresh(dir_next);
		is_error.value = false;
	}catch(err) {
		is_error.value = true;
		throw err;
	}
}

defineExpose({
	refresh,
	goto,
	scroll
});

function show_error(err) {
	console.error(err)
}

</script>

<template>

<div class="form_scroller" :class="{is_error, is_empty: state.is_empty, is_bounds_oot: !state.is_bounds_utd}">
	<input type="button" class="btn prev bound" @click="scroll(true,  false).catch(show_error)">
	<input type="button" class="btn prev step"  @click="scroll(false, false).catch(show_error)">
	<input type="text"   class="txt curr"       :value="displayed_value" @change="update_scroll_from_input($event).catch(show_error)">
	<input type="button" class="btn next step"  @click="scroll(false, true).catch(show_error)">
	<input type="button" class="btn next bound" @click="scroll(true,  true).catch(show_error)">
	<span  class="txt bounds as_input"> {{ state.bounds.value[0] }} - {{ state.bounds.value[1] }} ({{ state.bounds.value[2] }}) </span>
	<input type="button" class="btn refresh"    @click="emit('refresh_request')" v-if="!props.norefresh">
	<!-- <span  class="as_input"> | B: {{ state.is_bounds_utd }} | C: {{ state.is_curr_utd }} | E: {{ state.is_empty }} </span> -->
</div>

</template>

<style scoped>

.btn.bound{
	background-image: url("src/assets/icons/arrow_rb.svg");
} 
.btn.step{
	background-image: url("src/assets/icons/arrow_r.svg");
}
.btn.refresh{
	background-image: url("src/assets/icons/refresh.svg");
}
.btn {
	border: none;
	height: 3ch;
	width: 3ch;
	cursor: pointer;
	overflow: hidden;
	transition: background-color 0.2s;
	background-color: transparent;
	background-size: cover;
}
.btn:focus{
	background-color: transparent;
}
.btn.prev {
	scale: -1;
}
.btn:hover {
	background-color: #00ffd538;
}
.btn:active {
	background-color: #0066ff3d;
}

.txt {
	user-select: none;
	color: grey;
}

.form_scroller {
	text-wrap: nowrap;
	background-color: #e6e4e4;
	border-top: 1px solid black;
	padding: 1px;
}

.form_scroller.is_error {
	background-color: #ff7171;
	color: black;
}


</style>