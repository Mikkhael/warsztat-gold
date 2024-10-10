<script setup>
//@ts-check

import {computed, ref,shallowRef} from 'vue';

import useWarsztatDatabase from '../../DBStructure/db_warsztat_structure';
import {DataGraphNodeBase, QuerySource} from '../Dataset';
import QuerySourceOffsetScroller from '../Scroller/QuerySourceOffsetScroller.vue';


class ChangeableNode extends DataGraphNodeBase {
    constructor() {
        super();
        this.checked = ref(true);
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
    ['KTO'],
    ['ulicaCaps', 'upper(ULICA)']
]);
const KLIENCI_SELECT_FIELDS_json = computed_json(KLIENCI_SELECT_FIELDS);

const KLIENCI_FROM = ref('`klienci`');


function create_query_source1() {
    const src = new QuerySource();
    src.add_table_dep(db.TABS.klienci);
    src.add_select_auto(KLIENCI_SELECT_FIELDS.value);
    src.add_from(KLIENCI_FROM.value);
    src.add_where_eq('KTO', kto_ref, true);

    return src;
}



const src1 = shallowRef();
const src1_res = computed(() => res_to_str(src1.value.result ));


const changed1 = new ChangeableNode();

function reset_sources() {
    src1.value?.disconect();
    src1.value = create_query_source1();
    changed1.add_dep(src1.value);
}

reset_sources();

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
        <input type="button" value="EXPIRE SRC1"        @click="src1.expire()"> <br>
        <input type="button" value="UPDATE SRC1"        @click="src1.update_complete()"> <br>

        <div class="src_deb">
            <p>SRC1</p>
            <p>EXPIRED: {{ src1.expired.value }}</p>
            <p>CHANGED: {{ src1.changed.value }} <input type="checkbox" v-model="changed1.checked.value"> </p>
            <p>COUNT: {{ src1.count.value }}</p>
            <p><textarea v-model="src1_res"></textarea></p>
            
            <QuerySourceOffsetScroller 
                :src="src1"
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
