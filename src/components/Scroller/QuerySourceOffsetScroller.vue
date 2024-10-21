<script setup>
//@ts-check
import { watch, ref, readonly, toRef, toRefs, computed, onMounted, onUnmounted } from "vue";
import { QuerySource } from "../Dataset";

const props = defineProps({

	src: {
		type: QuerySource,
		required: true
	},

	step: {
		type: Number,
		default: 1
	},

	norefresh: {
		type: Boolean,
		default: false
	},
	saveable: {
		type: Boolean,
		default: false
	},
	insertable:{
		type: Boolean,
		default: false
	},

	// indicate_save:{
	// 	type: Boolean,
	// 	default: false,
	// }
});


const emit = defineEmits({
	error(err) {return true;}
})

// const displayed_placeholder = computed(() => '***' );
const displayed_placeholder = "***";
const displayed_value = computed(() =>
	props.src.is_empty.value || 
	props.src.insert_mode.value || 
	props.src.count.value < 0 ? 
		"" :
		props.src.offset.value + 1
);


function on_error(err) {
	console.error(err);
	emit('error', err);
}

// TODO additional buttons
// function clicked_refresh( /**@type {MouseEvent} */ event){ emit('refresh_request'); }
// function clicked_insert ( /**@type {MouseEvent} */ event){ emit('insert_request'); }
// function clicked_save   ( /**@type {MouseEvent} */ event){ emit('save_request', event.shiftKey); }

async function update_offset_from_input(/**@type {Event} */ event) {
	/**@type {number} */
	//@ts-ignore
	const value = event.target.value - 1;
	return goto(value);
}

async function goto(/**@type {number} */ value, wrapping = false) {
	return props.src.try_perform_and_update_confirmed(() => 
		props.src.request_offset_goto(value, wrapping));
}
async function scroll(/**@type {number} */ value) {
	return props.src.try_perform_and_update_confirmed(() => 
		props.src.request_offset_goto(props.src.offset.value + value, false));
}

async function clicked_refresh() {
	return props.src.try_perform_and_update_confirmed(() => 
		props.src.request_refresh());
}
async function clicked_insert() {
	return props.src.try_perform_and_update_confirmed(() => 
		props.src.request_insert_toggle());
}
async function clicked_save(shiftKey = false) {
	const force = shiftKey;
	return props.src.save_deep_transaction_and_update(force);
}


</script>

<template>

<div class="form_scroller" 
	:class="{
		is_expired: props.src.expired.value, 
		is_empty:   props.src.is_empty.value, 
		is_insert:  props.src.insert_mode.value
	}">
	<input type="button" class="btn prev bound" @click="goto(0)            .catch(on_error)">
	<input type="button" class="btn prev step2" @click="scroll(-props.step).catch(on_error)" v-if="props.step > 1">
	<input type="button" class="btn prev step"  @click="scroll(-1)         .catch(on_error)">
	<input type="text"   class="curr"           :value="displayed_value" @change="e => update_offset_from_input(e).catch(on_error)" :placeholder="displayed_placeholder">
	<input type="button" class="btn next step"  @click="scroll(+1).         catch(on_error)">
	<input type="button" class="btn next step2" @click="scroll(+props.step).catch(on_error)" v-if="props.step > 1">
	<input type="button" class="btn next bound" @click="goto(-1, true)     .catch(on_error)">
	<span class="txt bounds as_input"> ({{ props.src.count.value }}) </span>
	<input type="button" class="btn refresh"    @click="clicked_refresh().catch(on_error)" v-if="!props.norefresh">
	<input type="button" class="btn insert"     @click="clicked_insert().catch(on_error)"  v-if="props.insertable" 
				:class="{indicate: props.src.insert_mode.value}">
	<div class="spacer"></div>
	<!-- <span  class="as_input"> | UTD: {{ state.is_bounds_utd }} | EMPTY: {{ state.is_empty }} | </span> -->
	<input type="button" class="btn save"       @click="e => clicked_save(e.shiftKey).catch(on_error)" v-if="props.saveable" :class="{indicate: props.src.changed.value}">
</div>

</template>

<style scoped>

	.curr{
		max-width: 7ch;
	}
	.form_scroller {
		/* position: relative; */
		overflow-x: auto;
	}

</style>