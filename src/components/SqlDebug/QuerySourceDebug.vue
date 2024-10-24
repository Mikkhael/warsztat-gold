<script setup>
//@ts-check

import {computed, ref,shallowRef} from 'vue';

import useWarsztatDatabase from '../../DBStructure/db_warsztat_structure';
import {FormQuerySource, FormDataSet} from '../Dataset';

import QueryViewerOpenBtn from '../QueryViewer/QueryViewerOpenBtn.vue';

import FormInput from '../Controls/FormInput.vue';
import FormEnum from '../Controls/FormEnum.vue';
import { datetime_now } from '../../utils';

import QuerySourceDebug_form from './QuerySourceDebug_form.vue';
import { FWManager } from '../FloatingWindows/FWManager';
import FWCollection from '../FloatingWindows/FWCollection.vue';



const db = useWarsztatDatabase();
const fwManager = new FWManager();


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

const kto_ref_raw = ref('Gold');
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

//////////////// QUERY VIEWERS ////////////////////

/**@typedef {import('../QueryViewer/QueryViewerOpenBtn.vue').QueryViwerQueryParams} QueryViewerQueryParams*/

/**@type {QueryViewerQueryParams} */
const QV_KLIENCI_MAIN = {
    from: "`klienci`",
    select: [
        [['ID']],
        [['Nazwa'], 'Nazwa Klienta'],
        [['addr', '(`MIASTO` || " ul." || `ULICA`)'], 'Adres'],
        [['KTO'],   'KTO'],
    ],
    where_conj: [['`KTO` =', kto_ref]]
}

//////////////// CRATING SOURCES ////////////////////


function create_form1() {
    const src = new FormQuerySource();
    src.add_table_dep(db.TABS.klienci);
    for(const field of KLIENCI_SELECT_FIELDS.value) {
        src.add_select_data(field[0] ?? "", field[1], field[2] ?? undefined);
    }

    src.add_from(KLIENCI_FROM.value);
    // src.add_where_eq('KTO', kto_ref, true);
    src.query.add_where_eq('KTO', kto_ref, true);

    /**@type {FormDataSet} */
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
function create_form2(
    /**@type {import('./../Dataset').Dependable} */ param1 = null,
    /**@type {import('./../Dataset').Dependable} */ param2 = null,
) {
    const src = new FormQuerySource();
    src.add_table_dep(db.TABS.samochody);

    src.add_select_data("ID",            null);
    src.add_select_data("marka",         null);
    src.add_select_data("model",         null);
    src.add_select_data("nr_rej",        null, '`nr rej`');
    src.add_select_data("nr_sil",        null, '`nr silnika`');
    src.add_select_data("nr_nad",        'brak nadwozia', '`nr nadwozia`');
    src.add_from('`samochody klientów`');

    src.add_select_data("ID_klienta",  param1, '`ID klienta`');
    if(param2 === null) {
        src.add_where_eq("ID klienta", param1, true);
    } else {
        src.add_where_opt("`ID klienta` BETWEEN", param1, "AND", param2);
    }


    /**@type {FormDataSet} */
    const data = src.dataset;

    // TODO automate
    const sync = data.get_or_create_sync(db.TABS.samochody);
    
    sync?.assoc_value("ID",          data.values.ID,    true);
    sync?.assoc_value("marka",       data.values.marka      );
    sync?.assoc_value("model",       data.values.model      );
    sync?.assoc_value("nr rej",      data.values.nr_rej     );
    sync?.assoc_value("nr silnika",  data.values.nr_sil     );
    sync?.assoc_value("nr nadwozia", data.values.nr_nad     );
    sync?.assoc_value("ID klienta",  data.values.ID_klienta );

    return src;
}


//@ts-ignore
const src1  = shallowRef(/**@type {FormQuerySource} */ (undefined));
//@ts-ignore
const src2_1  = shallowRef(/**@type {FormQuerySource} */ (undefined));
//@ts-ignore
const src2_2  = shallowRef(/**@type {FormQuerySource} */ (undefined));
//@ts-ignore
const src2_3  = shallowRef(/**@type {FormQuerySource} */ (undefined));
//@ts-ignore
// const data1 = computed(() => src1.value.dataset ?? new FormDataSet());
const src1_res = computed(() => res_to_str(src1.value.result));

function reset_sources(no_disconnect = false) {
    if(!no_disconnect){
        src1.value?.disconnect_with_dists();
        src2_1.value?.disconnect_with_dists();
        src2_2.value?.disconnect_with_dists();
        src2_3.value?.disconnect_with_dists();
    }

    src1.value = create_form1();
    src2_1.value = create_form2(src1.value.result.ID);
    src2_2.value = create_form2(null);
    src2_3.value = create_form2(src2_1.value.result.ID_klienta, src2_2.value.result.ID_klienta);
}
reset_sources();




const mem_leak_reps = ref(0);
function test_mem_leaks(no_disconnect = false) {
    for(let i = 0; i < +mem_leak_reps.value; i++) {
        reset_sources(no_disconnect);
    }
}
function disconnect_tabs() {
    db.TABS.klienci.disconnect();
    db.TABS.samochody.disconnect();
}
function disconnect_tabs2() {
    db.TABS.klienci.disconnect_with_dists();
    db.TABS.samochody.disconnect_with_dists();
}



defineExpose({
    db
});


</script>

<template>

	<div>

        <input type="text" v-model="mem_leak_reps">
        <button @click="test_mem_leaks(false)" >TEST MEM LEAKS safe</button>
        <button @click="test_mem_leaks(true)" >TEST MEM LEAKS</button>
        <button @click="disconnect_tabs" >DISC TABS</button>
        <button @click="disconnect_tabs2" >DISC TABS 2</button>

        <p>SELECT: <input v-model="KLIENCI_SELECT_FIELDS_json"></p>
        <p>FROM:   <input v-model="KLIENCI_FROM"></p>
        <p>.</p>
        <p>KTO:   <input v-model="kto_ref_raw"></p>


        <input type="button" value="RESET SOURCES"      @click="reset_sources()"> <br>
        <input type="button" value="EXPIRE DB"          @click="db.DB.expire()"> <br>
        <input type="button" value="EXPIRE TAB_klienci" @click="db.TABS.klienci.expire()"> <br>

        <div class="content">
            <QuerySourceDebug_form name="Klienci" :src="src1" v-slot="{data}" class="abc">

                <QueryViewerOpenBtn :query="QV_KLIENCI_MAIN" :src="src1" :fwManager="fwManager"/>
                <br>

                <label>ID  <FormInput type="number"          :value="data.values.ID"        readonly />    </label> <br>
                <label>NAZ <FormInput type="text"            :value="data.values.Nazwa"     nonull   />    </label> <br>
                <label>MIA <FormInput type="text"            :value="data.values.MIASTO"    nonull   />    </label> <br>
                <label>ULI <FormInput type="text"            :value="data.values.ULICA"     nonull   />    </label> <br>
                <label>KOD <FormInput type="text"            :value="data.values.KOD_POCZT" nonull   />    </label> <br>
                <label>KTO <FormInput type="text"            :value="data.values.KTO"                />    </label> <br>     
                <label>KIE <FormInput type="date"            :value="data.values.KIEDY"              />    </label> <br>   
                <label>KIE <FormInput type="datetime-local"  :value="data.values.KIEDY"              />    </label> <br>   
                <label>KIE <FormInput type="datetime-local"  :value="data.values.KIEDY"     step="1" />    </label> <br>   
                <label>UL  <FormInput type="text"            :value="data.values.ulicaCaps" nonull   />    </label> <br>

                <label>KTO <FormEnum  :value="data.values.KTO" :options="['kot', 'gold', 'Gold']"/>        </label> <br>
                <label>KTO <FormEnum  :value="data.values.KTO" :options="['kot', 'gold', 'Gold']" nonull/> </label> <br>
            </QuerySourceDebug_form>
            
            <QuerySourceDebug_form name="Samochody" :src="src2_1" v-slot="{data}" class="abc">
                <label>ID    </label> <FormInput type="number"          :value="data.values.ID"         readonly /> <br>
                <label>ID_K  </label> <FormInput type="number"          :value="data.values.ID_klienta" readonly /> <br>
                <label>MARK  </label> <FormInput type="text"            :value="data.values.marka"      />          <br>   
                <label>MODE  </label> <FormInput type="text"            :value="data.values.model"      />          <br>   
                <label>N REJ </label> <FormInput type="text"            :value="data.values.nr_rej"     />          <br>   
                <label>N SIL </label> <FormInput type="text"            :value="data.values.nr_sil"     />          <br>   
                <label>N NAD </label> <FormInput type="text"            :value="data.values.nr_nad"     />          <br>   
            </QuerySourceDebug_form>
            <QuerySourceDebug_form name="Samochody All" :src="src2_2" v-slot="{data}" class="abc">
                <label>ID    </label> <FormInput type="number"          :value="data.values.ID"         readonly /> <br>
                <label>ID_K  </label> <FormInput type="number"          :value="data.values.ID_klienta" />          <br>
                <label>MARK  </label> <FormInput type="text"            :value="data.values.marka"      />          <br>   
                <label>MODE  </label> <FormInput type="text"            :value="data.values.model"      />          <br>   
                <label>N REJ </label> <FormInput type="text"            :value="data.values.nr_rej"     />          <br>   
                <label>N SIL </label> <FormInput type="text"            :value="data.values.nr_sil"     />          <br>   
                <label>N NAD </label> <FormInput type="text"            :value="data.values.nr_nad"     />          <br>   
            </QuerySourceDebug_form>
            <QuerySourceDebug_form name="Samochody Comb" :src="src2_3" v-slot="{data}" class="abc">
                <label>ID    </label> <FormInput type="number"          :value="data.values.ID"         readonly /> <br>
                <label>ID_K  </label> <FormInput type="number"          :value="data.values.ID_klienta" />          <br>
                <label>MARK  </label> <FormInput type="text"            :value="data.values.marka"      />          <br>   
                <label>MODE  </label> <FormInput type="text"            :value="data.values.model"      />          <br>   
                <label>N REJ </label> <FormInput type="text"            :value="data.values.nr_rej"     />          <br>   
                <label>N SIL </label> <FormInput type="text"            :value="data.values.nr_sil"     />          <br>   
                <label>N NAD </label> <FormInput type="text"            :value="data.values.nr_nad"     />          <br>   
            </QuerySourceDebug_form>
        </div> 

        <FWCollection :manager="fwManager" />

    </div>

</template>

<style scoped>

    .content {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
    }

    .abc {
        flex-basis: 30%;
        flex-grow: 1;
    }

</style>
