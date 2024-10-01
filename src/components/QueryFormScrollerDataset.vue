<script setup>
//@ts-check
import {computed, onMounted, onUnmounted, ref, watch} from 'vue'
import QueryFormScroller from "./QueryFormScroller.vue"
import useMainMsgManager from './Msg/MsgManager'
import { as_promise } from '../utils';

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
	datasets: {
		/**@type {import('vue').PropType<import('./Dataset/Dataset').Dataset[]>} */
		type: Array,
		required: true
	},
	before_change: {
		/**@type {import('vue').PropType<(() => Promise<boolean>)?>} */
		//@ts-ignore
		type: Function,
		default: null
	},
	index_after_insert: {
		/**@type {import('vue').PropType<((rowids: number[][]) => Promise<string | number>)?>} */
		//@ts-ignore
		type: Function,
		default: null
	}
});

const emit = defineEmits([
	'changed_index',
	'changed_insert_mode',
	'error',
]);

//// VARIABLES, STATE and HANDLERS /////

const msgManager = useMainMsgManager();
const scroller_ref = /**@type {import('vue').Ref<QueryFormScroller>} */ (ref());

const insert_mode = ref(false);

function handle_changed_insert_mode(new_mode) {
	insert_mode.value = new_mode;
	props.datasets.forEach(x => {
		x.set_insert_mode(new_mode);
	});
	emit('changed_insert_mode', new_mode);
}
function set_insert_mode(new_mode) {
	scroller_ref.value.set_insert_mode(new_mode);
}

async function handle_changed_index(new_index) {
	try{
		props.datasets.forEach(x => {
			x.set_index(new_index);
		});
		const responses = await Promise.all( props.datasets.map(x => x.perform_query_and_replace_all()) );
		// console.log('CHANGED INDEX', new_index, responses);
		emit('changed_index', new_index, responses);
		return [new_index, responses];
	} catch (err) {
		msgManager.postError(`Błąd podczas pobierania z bazy danych: \`${err}\``);
	}
}

function handle_err(/**@type {Error} */ err) {
	emit('error', err);
}

const db_opened_listener = () => {
	scroller_ref.value.refresh(true);
}
onMounted  (() => {	window.addEventListener   ('db_opened', db_opened_listener); });
onUnmounted(() => { window.removeEventListener('db_opened', db_opened_listener); });

//// DATASETS CHANGES CONFIRMATION /////

const is_any_dataset_changed = computed(() => {
	const is_changed_list = props.datasets.map(x => x.is_changed_ref.value);
	return is_changed_list.indexOf(true) !== -1;
});

async function confirm_discard_changes(){
    if(is_any_dataset_changed.value) {
		// debug
			// const changed_entries = props.datasets.map(x => Object.entries(x.values).filter(xx => xx[1].is_changed()));
			// const changed_objects = changed_entries.map(x => Object.fromEntries(x));
			console.log('CHANGED VALEUS: ', props.datasets.map(x => x.debug_all_changed_values.value));
        const resp = await confirm("Niektóre pola zostały zmienione. Naciśnij OK, aby odrzucić zmiany.");
        return resp;
    }
	return true;
}

async function before_change() {
	const confirmed = await confirm_discard_changes();
	if(!confirmed) return false;
	if(props.before_change) {
		return await props.before_change();
	}
    return true;
}

async function before_save_or_insert(bypass_validation = false, is_insert = false) {
	if(bypass_validation) return true;
	if(props.datasets.some(x => !x.reportFormValidity())){
		msgManager.post('info', 'Niektóre pola mają nieprawidłową wartość. Przytrzymaj SHIFT, aby zapisać mimo to.')
		return false;
	}
	return true;
}
function before_save  (bypass_validation = false) {return before_save_or_insert(bypass_validation, false);}
function before_insert(bypass_validation = false) {return before_save_or_insert(bypass_validation, true);}


//// REQUEST HANDLERS ////

/**
 * @template T
 * @param {Promise.<boolean>} confirm_promise 
 * @param {()=>Promise.<T>} callback 
 */
function before_check_wrapper(confirm_promise, callback){
	return as_promise(async () => {
		const confirmed = await confirm_promise;
		if(!confirmed) return;
		return await callback();
	}).catch(handle_err);
}

/**
 * @param {boolean} bypass Czy naciśnięty był SHIFT
 */
 function save_request(bypass) {
	console.log('SAVE REQUEST', bypass, insert_mode.value);
	if(insert_mode.value) return before_check_wrapper(before_insert(bypass), perform_insert);
	else                  return before_check_wrapper(before_save  (bypass), perform_save);
}

function insert_request() {
	if(insert_mode.value) return Promise.resolve();
	return before_check_wrapper(confirm_discard_changes(), async () => {
		props.datasets.map(x => x.reinitialize_all());
		set_insert_mode(true);
	});
}

function refresh_request() {
	return before_check_wrapper(confirm_discard_changes(), async () => {
		return perform_refresh();
	});
}


//// PERFORMING ACTIONS ////


async function perform_refresh(){
	await Promise.all(
		props.datasets.map(x => x.perform_query_and_replace_all())
	);
	await scroller_ref.value.refresh();
}

/**
 * @param {number[][]} inserted_indexes 
 */
async function set_index_after_insert(inserted_indexes){
	let new_index = inserted_indexes[0][0];
	if(props.index_after_insert){
		new_index = await props.index_after_insert(inserted_indexes);
	}
	if(new_index === undefined){
		return;
	}
	if(props.simple) {
		return await scroller_ref.value.goto_bound(true, true, true); // to_last, force_update, bypass
	}
	return await scroller_ref.value.goto(new_index, true, true); // new_index, force_refresh, bypass
}

async function perform_insert() {
	const inserts = await Promise.all(props.datasets.map(x => x.perform_insert_all()));
	console.log('INSERTED rowids: ', inserts.flat());
	await set_index_after_insert(inserts);
	// await perform_refresh();
}

async function perform_save(){
	const updates = await Promise.all(props.datasets.map(x => x.perform_update_all()));
	console.log('SAVED updates: ', updates.flat());
	await perform_refresh();
}

//// EXPOSE ////

defineExpose({
	set_insert_mode: (...args) => {return scroller_ref.value.set_insert_mode(...args)},
	scroll_by: 		 (...args) => {return scroller_ref.value.scroll_by(...args)},
	goto_bound:		 (...args) => {return scroller_ref.value.goto_bound(...args)},
	goto:   		 (...args) => {return scroller_ref.value.goto(...args)},
	refresh:		 (...args) => {return scroller_ref.value.refresh(...args)},
	goto_complete:   async (...args) => {
		const new_index = await scroller_ref.value.goto_no_emit(...args);
		if(new_index === undefined) return;
		return handle_changed_index(new_index);
	}
});
</script>


<template>

<QueryFormScroller 
		:simple="props.simple"
		:limit="props.limit"
        :query_value_name="props.query_value_name"
        :query_from="props.query_from"
        :query_where="props.query_where"
		:indicate_save="is_any_dataset_changed"
        :initial_value="null"
        :before_change="before_change"
		@changed_insert_mode="handle_changed_insert_mode"
        @changed_index="handle_changed_index"
		@insert_request="insert_request" 
        @refresh_request="refresh_request"
		@save_request="save_request"
        @error="handle_err"
        ref="scroller_ref"/>

</template>