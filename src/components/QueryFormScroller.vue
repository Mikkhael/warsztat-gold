<script setup>
//@ts-check
import { watch, ref, readonly, toRef, toRefs, computed } from "vue";
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
		/**@type {import('vue').PropType<string | number | null>} */
		type: [String, Number],
		required: false
	},
	insert_mode: {
		type: Boolean,
		default: false
	},
	norefresh: {
		type: Boolean,
		default: false
	},
	nosave: {
		type: Boolean,
		default: false
	},
	insertable:{
		type: Boolean,
		default: false
	},
	indicate_save:{
		type: Boolean,
		default: false,
	}
});
const props_refs = toRefs(props);
const emit = defineEmits([
	'update:insert_mode',
	'error',
	'changed',
	'insert_request',
	'refresh_request',
	'save_request',
]);

const insert_mode           = ref(false);
const displayed_value       = ref(props.initial_value);
const displayed_placeholder = computed(() => insert_mode.value ? '***' : '');

const state = new ScrollerState(props.initial_value ?? null, props.before_change);
const is_error = ref(true);

/**
 * @param {Error} err 
 */
function handle_err(err) {
	is_error.value = true;
	emit('error', err);
}

/**
 * @param {string | number | null | undefined} new_value 
 */
function handle_changed(new_value) {
	if(new_value === undefined) return new_value;
	displayed_value.value = new_value;
	set_insert_mode(false);
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
		const new_value = await state.refresh(true);
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
async function goto(value, force_update = false, dir_next = true, bypass_before_change = false) {
	try {
		console.log("GOING TO ", ...arguments);
		const res = await state.goto(value, force_update || is_error.value, dir_next, bypass_before_change);
		console.log("GOINT TO RES = ", res);
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


async function refresh(bypass_before_change = false, dir_next = true) {
	try{
		const res = await state.refresh(bypass_before_change, dir_next);
		is_error.value = false;
		if(res !== undefined) {
			return handle_changed(res);
		}
		return res;
	}catch(err) {
		is_error.value = true;
		throw err;
	}
}

function set_insert_mode(value) {
	if(insert_mode.value === value) return;
	insert_mode.value = value;
	emit('update:insert_mode', value);
	if(value) {
		displayed_value.value = '';
	}
}

defineExpose({
	refresh,
	goto,
	scroll,
	set_insert_mode
});

function show_error(err) {
	console.error(err)
}

/**
 * @param {MouseEvent} event 
 */
function clicked_save(event){
	emit('save_request', event.shiftKey);
}

// const bounds_str = computed(() => {
// 	const min   = state.bounds.value[0];
// 	const max   = state.bounds.value[1];
// 	const count = state.bounds.value[2];
// });

</script>

<template>

<div class="form_scroller" :class="{is_error, is_empty: state.is_empty, is_bounds_oot: !state.is_bounds_utd, insert_mode}">
	<input type="button" class="btn prev bound" @click="scroll(true,  false).catch(show_error)">
	<input type="button" class="btn prev step"  @click="scroll(false, false).catch(show_error)">
	<input type="text"   class="curr"           :value="displayed_value" @change="update_scroll_from_input($event).catch(show_error)" :placeholder="displayed_placeholder">
	<input type="button" class="btn next step"  @click="scroll(false, true).catch(show_error)">
	<input type="button" class="btn next bound" @click="scroll(true,  true).catch(show_error)">
	<span  class="txt bounds as_input">  ({{ state.bounds.value[2] }}) {{ state.bounds.value[0] }} - {{ state.bounds.value[1] }} </span>
	<input type="button" class="btn refresh"    @click="emit('refresh_request')" v-if="!props.norefresh">
	<input type="button" class="btn insert"     @click="insert_mode || emit('insert_request')"  v-if="props.insertable">
	<div class="spacer"></div>
	<input type="button" class="btn save"       @click="clicked_save" v-if="!props.nosave" :class="{indicate: props.indicate_save}">
	<!-- <span  class="as_input"> | B: {{ state.is_bounds_utd }} | C: {{ state.is_curr_utd }} | E: {{ state.is_empty }} </span> -->
</div>

</template>

<style scoped>



</style>