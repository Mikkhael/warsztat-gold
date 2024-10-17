<script setup>
//@ts-check

import {computed, ref,shallowRef} from 'vue';

import useWarsztatDatabase from '../../DBStructure/db_warsztat_structure';
import {DataGraphNodeBase, QuerySource, FormDataSet} from '../Dataset';
import QuerySourceOffsetScroller from '../Scroller/QuerySourceOffsetScroller.vue';

import FormInput from '../Controls/FormInput.vue';
import FormEnum from '../Controls/FormEnum.vue';
import { datetime_now } from '../../utils';


class ChangeableNode extends DataGraphNodeBase {
    constructor() {
        super();
        this.checked = ref(false);
    }

    check_changed_impl() {return this.checked.value;}
}

const db = useWarsztatDatabase();

function computed_json(ref) {
    return computed({
        get()    {return JSON.stringify(ref.value);},
        set(val) {ref.value = JSON.parse(val);}
    });
}

function res_to_str(obj) {
    const res = [];
    for(let key in obj) {
        res.push(key + ': ' + obj[key].ref.value);
    }
    return res.join('\n');
}

const kto_ref_raw = ref('');
const kto_ref = computed(() => kto_ref_raw.value === "" ? null : kto_ref_raw.value);

const KLIENCI_SELECT_FIELDS = ref([
    ['ID'],
    ['Nazwa'],
    ['MIASTO'],
    ['ULICA'],
    ['KOD_POCZT'],
    ['KTO', 'ktoś'],
    ['KIEDY', datetime_now()], // TODO get real now date, responsive
    ['ulicaCaps', null, 'upper(ULICA)']
]);
const KLIENCI_SELECT_FIELDS_json = computed_json(KLIENCI_SELECT_FIELDS);

const KLIENCI_FROM = ref('`klienci`');


function create_form1() {
    const src = new QuerySource();
    src.add_table_dep(db.TABS.klienci);
    //@ts-ignore
    src.add_select_auto(KLIENCI_SELECT_FIELDS.value);
    src.add_from(KLIENCI_FROM.value);
    src.add_where_eq('KTO', kto_ref, true);

    /**@type {FormDataSet} */
    //@ts-ignore
    const data = src.dataset;

    // TODO automate
    const sync = data.get_or_create_sync(db.TABS.klienci);
    sync?.assoc_value('ID',        data.values.ID, true);
    sync?.assoc_value('NAZWA',     data.values.Nazwa);
    sync?.assoc_value('MIASTO',    data.values.MIASTO);
    sync?.assoc_value('ULICA',     data.values.ULICA);
    sync?.assoc_value('KOD_POCZT', data.values.KOD_POCZT);
    sync?.assoc_value('KTO',       data.values.KTO);
    sync?.assoc_value('KIEDY',     data.values.KIEDY);

    return src;
}


//@ts-ignore
const src1  = shallowRef(/**@type {QuerySource} */ (undefined));
//@ts-ignore
const data1 = computed(() => src1.value.dataset ?? new FormDataSet());
const src1_res = computed(() => res_to_str(src1.value.result));


const changed1 = new ChangeableNode();

function reset_sources() {
    src1.value?.disconnect_with_dists();

    // const form1 = create_form1();
    // src1.value  = form1.src;
    // data1.value = form1.data;
    src1.value = create_form1();

    changed1.add_dep(src1.value);
}

reset_sources();

defineExpose({
    db
});

</script>

<template>

	<div>

        <p>SELECT: <input v-model="KLIENCI_SELECT_FIELDS_json"></p>
        <p>FROM:   <input v-model="KLIENCI_FROM"></p>
        <p>.</p>
        <p>KTO:   <input v-model="kto_ref_raw"></p>


        <input type="button" value="RESET SOURCES"      @click="reset_sources"> <br>
        <input type="button" value="EXPIRE DB"          @click="db.DB.expire()"> <br>
        <input type="button" value="EXPIRE TAB_klienci" @click="db.TABS.klienci.expire()"> <br>

        <div class="src_deb">
            <input type="button" value="EXPIRE SRC"   @click="src1.expire()">
            <input type="button" value="UPDATE SRC"   @click="src1.update_complete()">
            <input type="button" value="REFRESH DATA" @click="data1.refresh()">
            <p>SRC1</p>
            <p>EXPIRED: {{ src1.expired.value }} ({{ src1.expired_self.value }}) </p>
            <p>CHANGED: {{ src1.changed.value }} {{ data1.changed.value }}</p>
            <p>INSERT:  {{ src1.insert_mode.value }}</p>
            <p>COUNT:   {{ src1.count.value }}</p>
            <p><textarea v-model="src1_res"></textarea></p>

            ID  <FormInput type="number"          :value="data1.values.ID"        readonly /> <br>
            NAZ <FormInput type="text"            :value="data1.values.Nazwa"     nonull   /> <br>
            MIA <FormInput type="text"            :value="data1.values.MIASTO"    nonull   /> <br>
            ULI <FormInput type="text"            :value="data1.values.ULICA"     nonull   /> <br>
            KOD <FormInput type="text"            :value="data1.values.KOD_POCZT" nonull   /> <br>
            KTO <FormInput type="text"            :value="data1.values.KTO"                /> <br>     
            KIE <FormInput type="date"            :value="data1.values.KIEDY"              /> <br>   
            KIE <FormInput type="datetime-local"  :value="data1.values.KIEDY"              /> <br>   
            KIE <FormInput type="datetime-local"  :value="data1.values.KIEDY"     step="1" /> <br>   
            UL  <FormInput type="text"            :value="data1.values.ulicaCaps" nonull   /> <br>

            KTO <FormEnum  :value="data1.values.KTO" :options="['kot', 'gold', 'Gold']"/> <br>
            KTO <FormEnum  :value="data1.values.KTO" :options="['kot', 'gold', 'Gold']" nonull/> <br>

            
            <QuerySourceOffsetScroller 
                :src="src1"
                :step="10"
                insertable
                saveable
            />
        </div>

    </div>

</template>

<style scoped>

    input {
        width: 90%;
    }
    input[type='button'] {
        width: unset;
    }

    .src_deb {
        border: 1px solid black;
    }

    textarea {
        height: 5em;
    }

</style>
