<script setup>
//@ts-check
import {computed, onMounted, ref, watch} from 'vue'
import QueryFormScroller from "./QueryFormScroller.vue"
import useMainMsgManager from './Msg/MsgManager'

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
	}
	// before_save: {
	// 	/**@type {import('vue').PropType<((is_insert: boolean) => Promise<boolean>)?>} */
	// 	//@ts-ignore
	// 	type: Function,
	// 	default: null
	// }
});

const emit = defineEmits([
	'changed',
	'set_insert_mode',
	'error',
	'changed',

	// 'insert_mode_changed',
	// 'refresh_request',
	// 'save_request',
]);

const msgManager = useMainMsgManager();
const scroller_ref = ref();

const insert_mode = ref(false);

const is_any_dataset_changed = computed(() => {
	const is_changed_list = props.datasets.map(x => x.is_changed_ref.value);
	console.log('is_any_dataset_changed', is_changed_list);
	return is_changed_list.indexOf(true) !== -1;
});

watch(insert_mode, (new_value) => {
	emit('set_insert_mode', new_value);
}, {immediate: true});
function set_insert_mode(value) {
	scroller_ref.value.set_insert_mode(value);
}

async function confirm_discard_changes(){
	const is_any_changed = props.datasets.some(x => x.is_changed());
    if(is_any_changed) {
		const changed_entries = props.datasets.map(x => Object.entries(x.values).filter(xx => xx[1].is_changed()));
		const changed_objects = changed_entries.map(x => Object.fromEntries(x));
		console.log('CHANGED VALEUS: ', changed_objects[0]);
        const resp = confirm("Niektóre pola zostały zmienione. Naciśnij OK, aby odrzucić zmiany.");
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

async function before_save(is_insert, bypass_validation) {
    if(is_insert) {
		msgManager.postError('Nie zaimplementowano oddawania nowych elementów'); // TODO
		return false;
    } else {
		if(bypass_validation){
			return true;
		}
        if(props.datasets.some(x => !x.reportFormValidity())){
            msgManager.post('info', 'Niektóre pola mają nieprawidłową wartość. Przytrzymaj SHIFT, aby zapisać mimo to.')
            return false;
        }
		return true;
    }
}

async function handle_changed(new_value) {
    // console.log('New index: ', new_value);

	try{
		props.datasets.forEach(x => x.set_index(new_value));
		const responses = await Promise.all( props.datasets.map(x => x.perform_query_and_replace_all()) );
		emit('changed', new_value, responses);
	} catch (err) {
		msgManager.postError(`Błąd podczas pobierania z bazy danych: \`${err}\``);
	}
}

async function insert_request() {
	try{
		const confirmed = await confirm_discard_changes();
		if(!confirmed) return;
		props.datasets.map(x => x.reinitialize_all());
		set_insert_mode(true);
	} catch (err) {
		handle_err(err);
	}
}

async function perform_refresh(){
	await Promise.all(
		props.datasets.map(x => x.perform_query_and_replace_all())
	)
	await scroller_ref.value.refresh();
}

async function refresh_request() {
    try{
		const confirmed = await confirm_discard_changes();
		if(!confirmed) return;
		await perform_refresh();
    } catch(err) {
        handle_err(err);
    }
}

async function perform_save(bypass_validation = false){
	const confirm = await before_save(insert_mode.value, bypass_validation);
	if(!confirm) return;
	
	const updates = await Promise.all(props.datasets.map(x => x.perform_update_all()));
	console.log('SAVED updates: ', updates.flat());
	await perform_refresh();
}

/**
 * @param {boolean} with_shift 
 */
async function save_request(with_shift) {
	console.log('SAVE REQUEST', with_shift);
	if(insert_mode.value) {
		console.error('INSERTING NOT YET IMPLEMENTED');
		return;
	}
	try{
		const bypass_validation = with_shift;
		await perform_save(bypass_validation);
	} catch (err) {
		handle_err(err);
	}

}


function handle_err(/**@type {Error} */ err) {
	emit('error', err);
}

window.addEventListener('db_opened', () => {
	scroller_ref.value.refresh(true);
});

defineExpose({
	refresh:		 (...args) => {scroller_ref.value.refresh(...args)},
	goto:   		 (...args) => {scroller_ref.value.goto(...args)},
	scroll: 		 (...args) => {scroller_ref.value.scroll(...args)},
	set_insert_mode: (...args) => {scroller_ref.value.set_insert_mode(...args)},
});
</script>


<template>

<QueryFormScroller 
        :query_value_name="props.query_value_name"
        :query_from="props.query_from"
        :query_where="props.query_where"
		:indicate_save="is_any_dataset_changed"
        :initial_value="null"
        :before_change="before_change"
		v-model:insert_mode="insert_mode"
        @changed="handle_changed"
		@insert_request="insert_request" 
        @refresh_request="refresh_request"
		@save_request="save_request"
        @error="handle_err"
        ref="scroller_ref"/>

</template>