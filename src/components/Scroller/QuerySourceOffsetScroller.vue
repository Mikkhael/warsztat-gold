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

	// norefresh: {
	// 	type: Boolean,
	// 	default: false
	// },
	// nosave: {
	// 	type: Boolean,
	// 	default: false
	// },
	// insertable:{
	// 	type: Boolean,
	// 	default: false
	// },

	// indicate_save:{
	// 	type: Boolean,
	// 	default: false,
	// }
});

// TODO insert mode //////////////
const insert_mode           = ref(false);
//////////////////////////////////


// const displayed_placeholder = computed(() => '***' );
const displayed_placeholder = "***";
const displayed_value = computed(() =>
	props.src.is_empty.value || props.src.count.value < 0 ? 
		"" :
		props.src.offset.value + 1
);


function show_error(err) {
	console.error(err)
}

// TODO additional buttons
// function clicked_refresh( /**@type {MouseEvent} */ event){ emit('refresh_request'); }
// function clicked_insert ( /**@type {MouseEvent} */ event){ emit('insert_request'); }
// function clicked_save   ( /**@type {MouseEvent} */ event){ emit('save_request', event.shiftKey); }


// TODO better error checking


async function goto(/**@type {number} */ value, wrapping = false) {
	props.src.offset_scroller.goto(value, wrapping);
	await props.src.update_complete();
}
async function scroll(/**@type {number} */ value) {
	props.src.offset_scroller.goto(props.src.offset.value + value);
	await props.src.update_complete();
}
async function update_offset_from_input(/**@type {Event} */ event) {
	/**@type {number} */
	//@ts-ignore
	const value = event.target.value - 1;
	return goto(value);
}

</script>

<template>

<div class="form_scroller" 
	:class="{
		is_error: props.src.expired.value, 
		is_empty: props.src.is_empty.value, 
	}">
	<input type="button" class="btn prev bound" @click="goto(0)            .catch(show_error)">
	<input type="button" class="btn prev step2" @click="scroll(-props.step).catch(show_error)" v-if="props.step > 1">
	<input type="button" class="btn prev step"  @click="scroll(-1)         .catch(show_error)">
	<input type="text"   class="curr"           :value="displayed_value" @change="e => update_offset_from_input(e).catch(show_error)" :placeholder="displayed_placeholder">
	<input type="button" class="btn next step"  @click="scroll(+1).         catch(show_error)">
	<input type="button" class="btn next step2" @click="scroll(+props.step).catch(show_error)" v-if="props.step > 1">
	<input type="button" class="btn next bound" @click="goto(-1, true)     .catch(show_error)">
	<span class="txt bounds as_input"> ({{ props.src.count.value }}) </span>
	<!-- <input type="button" class="btn refresh"    @click="clicked_refresh" v-if="!props.norefresh"> -->
	<!-- <input type="button" class="btn insert"     @click="clicked_insert"  v-if="props.insertable"> -->
	<div class="spacer"></div>
	<!-- <span  class="as_input"> | UTD: {{ state.is_bounds_utd }} | EMPTY: {{ state.is_empty }} | </span> -->
	<!-- <input type="button" class="btn save"       @click="clicked_save" v-if="!props.nosave" :class="{indicate: props.indicate_save}"> -->
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