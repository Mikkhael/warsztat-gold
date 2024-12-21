<script setup>
//@ts-check
import { watch, ref, readonly, toRef, toRefs, computed, onMounted, onUnmounted } from "vue";
import { FormQuerySourceBase, FormQuerySourceBaseInsertable, FormQuerySourceFull, QuerySource } from "../Dataset";
import useMainMsgManager, { MsgManager } from "../Msg/MsgManager";

/**
 * @typedef {{
 * 	name: string,
 *  icon?:  string,
 *  value?: string,
 *  class?: Object.<string, boolean>,
 *  style?: Object.<string, any>, 
 * }} CustomButtonDef
 */

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

	full_limit: {
		type: Number,
		default: 0,
	},

	custom_buttons: {
		/**@type {import('vue').PropType<CustomButtonDef[]>} */
		type: Array,
		default: []
	}

	// indicate_save:{
	// 	type: Boolean,
	// 	default: false,
	// }
});


const msgManager = useMainMsgManager();

const emit = defineEmits({
	error(err) {return true;},
	custom(/**@type {string} */ name) {return true;}
})

const src_form            = computed(() => props.src instanceof FormQuerySourceBase ? props.src : null);
const src_form_insertable = computed(() => props.src instanceof FormQuerySourceBaseInsertable ? props.src : null);
const src_form_full       = computed(() => props.src instanceof FormQuerySourceFull ? props.src : null)



// const displayed_placeholder = computed(() => '***' );
const displayed_placeholder = "***";
const displayed_value = computed(() =>
	props.src.should_disable_dists.value || 
	props.src.count.value < 0 ? 
		"" :
		props.src.offset.value + 1
);


function on_error(err) {
	console.error(err);
	emit('error', err);
}

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
		props.src.request_offset_scroll(value));
}

async function clicked_refresh() {
	return props.src.try_perform_and_update_confirmed(() => 
		props.src.request_refresh());
}
async function clicked_insert() {
	if(src_form_insertable.value) {
		return src_form_insertable.value.try_perform_and_update_confirmed(() => 
			src_form_insertable.value?.request_insert_toggle());
	} else if(src_form_full.value) {
		src_form_full.value?.dataset.add_or_swap_row_default_with_limit(props.full_limit);
		return true;
	}
}
async function clicked_save(shiftKey = false) {
	const force = shiftKey;
	const valid = force || src_form.value?.report_validity_deep();
	if(!valid) {
		msgManager.post_or_repost('info', "Niektóre pola zawierają nieprawidłową wartość. Wykonaj zapis, przytrzymując SHIFT, aby spróbować zapisać mimo to.")
		return false;
	};
	await props.src.save_deep_transaction_and_update(force);
	return true;
}

function clicked_custom(/**@type {string} */ name) {
	emit('custom', name);
}


</script>

<template>

<div class="form_scroller" 
	:class="{
		is_expired: props.src.expired.value, 
		is_empty:   props.src.is_empty.value, 
		is_insert:  src_form_insertable?.insert_mode.value
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
				:class="{indicate: src_form_insertable?.insert_mode.value}">
	<div class="spacer"></div>
	<input type="button" class="btn custom" 
		v-for="custom_btn in props.custom_buttons"
		:style="{'background-image': custom_btn.icon ? `url('src/assets/icons/${custom_btn.icon}.svg')` : 'none', ...(custom_btn.style ?? {})}"
		:value="custom_btn.value ?? ''"
		:class="custom_btn.class ?? {}"
		@click="clicked_custom(custom_btn.name)"
	/>
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