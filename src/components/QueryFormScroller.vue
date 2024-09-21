<script setup>
//@ts-check
import { watch, ref, readonly, toRef, toRefs, computed } from "vue";
import {ScrollerState, ScrollerStateSimple} from "../ScrollerState";

const props = defineProps({
	simple: {
		type: Boolean,
		default: false
	},
	limit: {
		type: Number,
		default: 1
	},
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
	'error',
	'changed_index',
	'changed_insert_mode',
	'insert_request',
	'refresh_request',
	'save_request',
]);

const insert_mode           = ref(false);
const displayed_value       = ref(props.initial_value);
const displayed_placeholder = computed(() => insert_mode.value ? '***' : '');

const state = props.simple ?
	new ScrollerStateSimple(props.initial_value ?? null, props.before_change, props_refs.limit) :
	new ScrollerState      (props.initial_value ?? null, props.before_change);
const is_error = ref(true);

/**
 * @param {Error} err 
 */
function handle_err(err) {
	is_error.value = true;
	emit('error', err);
}

/**
 * @param {string | number | null | undefined} new_index 
 */
function set_index(new_index) {
	if(new_index === undefined) return;
	displayed_value.value = new_index;
	set_insert_mode(false);
	emit('changed_index', new_index);
}
/**
 * @param {boolean} new_mode
 */
function set_insert_mode(new_mode) {
	if(insert_mode.value === new_mode) return;
	insert_mode.value = new_mode;
	emit('changed_insert_mode', new_mode);
	if(new_mode) {
		displayed_value.value = '';
	}
}
function clear_error() {
	is_error.value = false;
}

const props_query_parts_refs = [
	props_refs.query_value_name,
	props_refs.query_from,
	props_refs.query_where
];

/**
 * @param {string[]} new_query_parts
 */
function reinitialize_query(new_query_parts) {
	// console.log('NEW QUERY', new_query_parts);
	if(state instanceof ScrollerState) {
		state.update_queries(
			new_query_parts[0], 
			new_query_parts[1], 
			new_query_parts[2]
		);
	}else{
		state.update_query(new_query_parts[1]);
	}
	clear_error();
	return index_change_wrapper( state.refresh(true) );
}

watch(props_query_parts_refs, (new_parts, old_parts) => {
	// console.log("Updating query props", new_parts, old_parts);
	reinitialize_query(new_parts);
}, {immediate: true});


/**
 * @param {Promise.<string | number | null | undefined>} new_index_promise
 */
 function index_change_wrapper(new_index_promise) {
	return new_index_promise.then(new_index => {
		if(new_index !== undefined) {
			clear_error();
			set_index(new_index);
		}
		return new_index;
	}).catch(err => {
		handle_err(err);
		throw err;
	});
}

/**
 * @param {boolean} to_last 
 */
function goto_bound(to_last, force_update = false) {
	return index_change_wrapper(
		state.goto_bound(to_last, force_update || is_error.value)
	);
}

/**
 * @param {number} steps 
 */
function scroll_by(steps, force_update = false) {
	return index_change_wrapper(
		state.scroll_by(steps, force_update || is_error.value)
	);
}

/**
 * @param {string | number} value 
 */
function goto(value, force_update = false, bypass_before_change = false, dir_next = true) {
	return index_change_wrapper(
		state.goto(value, force_update || is_error.value, dir_next, bypass_before_change)
	);
}

function refresh(bypass_before_change = false, dir_next = true) {
	return index_change_wrapper(
		state.refresh(bypass_before_change, dir_next)
	);
}

function update_index_from_input(event) {
	return goto(event.target.value);
}


defineExpose({
	set_insert_mode,
	scroll_by,
	goto_bound,
	goto,
	refresh
});

function show_error(err) {
	console.error(err)
}

function clicked_refresh( /**@type {MouseEvent} */ event){ emit('refresh_request'); }
function clicked_insert ( /**@type {MouseEvent} */ event){ emit('insert_request'); }
function clicked_save   ( /**@type {MouseEvent} */ event){ emit('save_request', event.shiftKey); }

// const bounds_str = computed(() => {
// 	const min   = state.bounds.value[0];
// 	const max   = state.bounds.value[1];
// 	const count = state.bounds.value[2];
// });

</script>

<template>

<div class="form_scroller" :class="{is_error, is_empty: state.is_empty.value, is_bounds_oot: !state.is_bounds_utd.value, insert_mode}">
	<input type="button" class="btn prev bound" @click="goto_bound(false).catch(show_error)">
	<input type="button" class="btn prev step2" @click="scroll_by(-props.limit).catch(show_error)" v-if="props.simple && props.limit > 1">
	<input type="button" class="btn prev step"  @click="scroll_by(-1).catch(show_error)">
	<input type="text"   class="curr"           :value="displayed_value" @change="update_index_from_input($event).catch(show_error)" :placeholder="displayed_placeholder">
	<input type="button" class="btn next step"  @click="scroll_by(+1).catch(show_error)">
	<input type="button" class="btn next step2" @click="scroll_by(+props.limit).catch(show_error)" v-if="props.simple && props.limit > 1">
	<input type="button" class="btn next bound" @click="goto_bound(true).catch(show_error)">
	<span v-if="props.simple" class="txt bounds as_input">  ({{ state.count.value }}) </span>
	<span v-else              class="txt bounds as_input">  ({{ state.bounds.value[2] }}) {{ state.bounds.value[0] }} - {{ state.bounds.value[1] }} </span>
	<input type="button" class="btn refresh"    @click="clicked_refresh" v-if="!props.norefresh">
	<input type="button" class="btn insert"     @click="clicked_insert"  v-if="props.insertable">
	<div class="spacer"></div>
	<span  class="as_input"> | UTD: {{ state.is_bounds_utd }} | EMPTY: {{ state.is_empty }} | </span>
	<input type="button" class="btn save"       @click="clicked_save" v-if="!props.nosave" :class="{indicate: props.indicate_save}">
</div>

</template>

<style scoped>



</style>