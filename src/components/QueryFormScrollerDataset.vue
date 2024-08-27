<script setup>
//@ts-check
import {ref} from 'vue'
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
	index: {
		type: [String, Number],
		required: true
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
});

const emit = defineEmits(['update:index','changed','refresh_request','error']);

const msgManager = useMainMsgManager();
const scroller_ref = ref();

async function before_change() {
	const is_any_changed = props.datasets.some(x => x.is_changed());
    if(is_any_changed) {
        const resp = confirm("Niektóre pola zostały zmienione. Naciśnij OK, aby odrzucić zmiany.");
        return resp;
    }
	if(props.before_change) {
		return await props.before_change();
	}
    return true;
}

function handle_changed(new_value) {
    // console.log('New index: ', new_value);
    emit('update:index', new_value);
}

async function refresh_request() {
    try{
		await Promise.all(
			props.datasets.map(x => x.perform_query_and_replace_all())
		)
        await scroller_ref.value.refresh();
    } catch(err) {
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
	refresh: (...args) => {scroller_ref.value.refresh(...args)},
	goto:    (...args) => {scroller_ref.value.goto(...args)},
	scroll:  (...args) => {scroller_ref.value.scroll(...args)}
});
</script>


<template>

<QueryFormScroller 
        :query_value_name="props.query_value_name"
        :query_from="props.query_from"
        :query_where="props.query_where"
        :initial_value="props.index"
        :before_change="before_change"
        @changed="handle_changed"
        @refresh_request="refresh_request"
        @error="handle_err"
        ref="scroller_ref"/>

</template>