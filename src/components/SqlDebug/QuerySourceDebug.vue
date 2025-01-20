<script setup>
//@ts-check

import {computed, ref,shallowRef} from 'vue';

import useWarsztatDatabase from '../../DBStructure/db_warsztat_structure';
import {FormQuerySourceSingle} from '../Dataset';

// import QueryViewerOpenBtn from '../QueryViewer/QueryViewerOpenBtn.vue';

import FormInput from '../Controls/FormInput.vue';
import FormEnum from '../Controls/FormEnum.vue';
import { use_datetime_now, datetime_now } from '../../utils';

import QuerySourceDebug_form from './QuerySourceDebug_form.vue';
import { FWManager } from '../FloatingWindows/FWManager';
import FWCollection from '../FloatingWindows/FWCollection.vue';
import useMainMsgManager, { MsgManager } from '../Msg/MsgManager';

import {standard_QV_select} from '../../Forms/FormCommon';


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

// const KLIENCI_SELECT_FIELDS = ref([
//     ['ID'],
//     ['Nazwa'],
//     ['MIASTO'],
//     ['ULICA'],
//     ['KOD_POCZT'],
//     ['KTO', 'ktoś'],
//     ['KIEDY', datetime_now()],
//     ['ulicaCaps', null, 'upper(ULICA)']
// ]);
// const KLIENCI_SELECT_FIELDS_json = computed_json(KLIENCI_SELECT_FIELDS);
// const KLIENCI_FROM = ref('`klienci`');

//////////////// QUERY VIEWERS ////////////////////

// /**@typedef {import('../QueryViewer/QueryViewerOpenBtn.vue').QueryViwerQueryParams} QueryViewerQueryParams*/

// /**@type {QueryViewerQueryParams} */
const QV_KLIENCI_MAIN = {
    from: "`klienci`",
    select: [
        [['ID']],
        [['Nazwa'], 'Nazwa Klienta'],
        [['addr', '(`MIASTO` || " ul." || `ULICA`)'], 'Adres'],
        [['KTO'],   'KTO'],
    ],
    where_conj: [[ '`KTO`=', [kto_ref] ]]
}
// /**@type {QueryViewerQueryParams} */
const QV_KLIENCI_BYCAR = {
    from: "`samochody klientów` JOIN `klienci` ON `klienci`.`ID` = `samochody klientów`.`ID klienta`",
    select: [
        [['ID klienta']],
        [['`samochody klientów`.`ID`']],
        [['KTO']],

        [['nr rej'], 'Nr Rejestracyjny'],
        [['Nazwa'], 'Nazwa Klienta'],
        [['KTO'], 'KTO'],
    ]
}

//////////////// CRATING SOURCES ////////////////////


function create_form1() {
    const src = new FormQuerySourceSingle();
    src.add_table_dep(db.TABS.klienci);
    // for(const field of KLIENCI_SELECT_FIELDS.value) {
    //     src.add_select_with_default(field[0] ?? "", field[1], field[2] ?? undefined);
    // }
    // src.register_result('KIEDY', use_datetime_now());


    const COLS = db.TABS.klienci.cols;
    src.set_from_with_deps(db.TABS.klienci);
    src.auto_add_value_synced(COLS.ID);
    src.auto_add_value_synced(COLS.NAZWA);
    src.auto_add_value_synced(COLS.MIASTO);
    src.auto_add_value_synced(COLS.ULICA);
    src.auto_add_value_synced(COLS.KOD_POCZT);
    src.auto_add_value_synced(COLS.KTO);
    src.auto_add_value_synced(COLS.KIEDY);
    src.auto_add_value_impl('ulicaCaps', {sql: "upper(`ULICA`)"});

    // src.add_where_eq('KTO', kto_ref, true);
    src.add_where_eq(COLS.KTO.get_full_sql(), kto_ref, true);

    return src;
}
function create_form2(
    /**@type {import('./../Dataset').MaybeDependable} */ param1 = null,
    /**@type {import('./../Dataset').MaybeDependable} */ param2 = null,
) {
    const src = new FormQuerySourceSingle();
    src.set_from_with_deps(db.TABS.samochody_klientów);
    const COLS = db.TABS.samochody_klientów.cols;

    const sync = src.dataset.get_or_create_sync(db.TABS.samochody_klientów);

    src.auto_add_value_synced(COLS.ID,    );
    src.auto_add_value_synced(COLS.marka, );
    src.auto_add_value_synced(COLS.model, );
    src.auto_add_value_impl  ("nr_rej",        {sql: '`nr rej`'    , sync, sync_col: COLS.nr_rej.name});
    src.auto_add_value_impl  ("nr_sil",        {sql: '`nr silnika`', sync, sync_col: COLS.nr_silnika.name});
    src.auto_add_value_impl  ("nr_nad",        {sql: '`nr silnika`', sync, sync_col: COLS.nr_nadwozia.name, default: 'brak nadwozia'});
    
    src.auto_add_value_synced(COLS.ID_klienta);
    
    if(param2 === null) {
        // src.auto_add_value_synced(COLS.ID_klienta, {param: param1});
        src.add_where_eq(COLS.ID_klienta.get_full_sql(), param1, true);
    } else {
        // src.auto_add_value_synced(COLS.ID_klienta);
        console.log("PARAMS ", param1, param2);
        src.add_where(COLS.ID_klienta.get_full_sql(), "BETWEEN", [param1], "AND", [param2]);
    }
    return src;
}


//@ts-ignore
const src1  = shallowRef(/**@type {FormQuerySourceSingle} */ (undefined));
//@ts-ignore
const src2_1  = shallowRef(/**@type {FormQuerySourceSingle} */ (undefined));
//@ts-ignore
const src2_2  = shallowRef(/**@type {FormQuerySourceSingle} */ (undefined));
//@ts-ignore
const src2_3  = shallowRef(/**@type {FormQuerySourceSingle} */ (undefined));
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
    src2_1.value = create_form2(src1.value.get(0));
    src2_2.value = create_form2(null);
    src2_3.value = create_form2(
        src2_1.value.get(db.TABS.samochody_klientów.cols.ID_klienta), 
        src2_2.value.get(db.TABS.samochody_klientów.cols.ID_klienta)
    );
}
reset_sources();



const QV_KLIENCI_MAIN_handler  = standard_QV_select([[src1.value, 0]], handle_error);
const QV_KLIENCI_BYCAR_handler = standard_QV_select([[src1.value, 0], [src2_1.value, 1]], handle_error, row => {
    kto_ref_raw.value = row[2];
});


const mem_leak_reps = ref(0);
function test_mem_leaks(no_disconnect = false) {
    for(let i = 0; i < +mem_leak_reps.value; i++) {
        reset_sources(no_disconnect);
    }
}
function disconnect_tabs() {
    db.TABS.klienci.disconnect();
    db.TABS.samochody_klientów.disconnect();
}
function disconnect_tabs2() {
    db.TABS.klienci.disconnect_with_dists();
    db.TABS.samochody_klientów.disconnect_with_dists();
}


const msgManager = useMainMsgManager();
function handle_error(err) {
    msgManager.postError(err);
}

defineExpose({
    db
});


</script>

<template>

	<div>

        <input type="text" v-model="mem_leak_reps">
        <button type="button" @click="test_mem_leaks(false)" >TEST MEM LEAKS safe</button>
        <button type="button" @click="test_mem_leaks(true)" >TEST MEM LEAKS</button>
        <button type="button" @click="disconnect_tabs" >DISC TABS</button>
        <button type="button" @click="disconnect_tabs2" >DISC TABS 2</button>

        <p>.</p>
        <p>KTO:   <input v-model="kto_ref_raw"></p>


        <input type="button" value="RESET SOURCES"      @click="reset_sources()"> <br>
        <input type="button" value="EXPIRE DB"          @click="db.DB.expire()"> <br>
        <input type="button" value="EXPIRE TAB_klienci" @click="db.TABS.klienci.expire()"> <br>

        <div class="content">
            <QuerySourceDebug_form name="Klienci" :src="src1" v-slot="{data}" class="abc">

                <!-- <QueryViewerOpenBtn :query="QV_KLIENCI_MAIN"  @error="handle_error" :fwManager="fwManager" @select="(cols, row, offset, close) => {
                    src1.try_perform_and_update_confirmed(() => {
                        src1.request_offset_rownum(row[0]);
                    }).then(succ => {
                        if(succ) close();
                    }).catch(err => {
                        handle_error(err);
                    })
                }"/> -->
                <!-- <QueryViewerOpenBtn :query="QV_KLIENCI_MAIN"  @error="handle_error" :fwManager="fwManager"
                    @select="QV_KLIENCI_MAIN_handler"/> -->
                <!-- <QueryViewerOpenBtn :query="QV_KLIENCI_BYCAR"  @error="handle_error" :fwManager="fwManager"
                    @select="QV_KLIENCI_BYCAR_handler"/> -->
                <br>

                <label>ID  <FormInput type="number"          :value="data.get(db.TABS.klienci.cols.ID)"        readonly />    </label> <br>
                <label>NAZ <FormInput type="text"            :value="data.get(db.TABS.klienci.cols.NAZWA)"     nonull   />    </label> <br>
                <label>MIA <FormInput type="text"            :value="data.get(db.TABS.klienci.cols.MIASTO)"    nonull   />    </label> <br>
                <label>ULI <FormInput type="text"            :value="data.get(db.TABS.klienci.cols.ULICA)"     nonull   />    </label> <br>
                <label>KOD <FormInput type="text"            :value="data.get(db.TABS.klienci.cols.KOD_POCZT)" nonull   />    </label> <br>
                <label>KTO <FormInput type="text"            :value="data.get(db.TABS.klienci.cols.KTO)"                />    </label> <br>     
                <label>KIE <FormInput type="date"            :value="data.get(db.TABS.klienci.cols.KIEDY)"              />    </label> <br>   
                <label>KIE <FormInput type="datetime-local"  :value="data.get(db.TABS.klienci.cols.KIEDY)"              />    </label> <br>   
                <label>KIE <FormInput type="datetime-local"  :value="data.get(db.TABS.klienci.cols.KIEDY)"     step="1" />    </label> <br>   
                <label>UL  <FormInput type="text"            :value="data.get('ulicaCaps')" nonull   />    </label> <br>

                <label>KTO <FormEnum  :value="data.get(db.TABS.klienci.cols.KTO)" :options="['kot', 'gold', 'Gold']"/>        </label> <br>
                <label>KTO <FormEnum  :value="data.get(db.TABS.klienci.cols.KTO)" :options="['kot', 'gold', 'Gold']" nonull/> </label> <br>
            </QuerySourceDebug_form>
            
            <QuerySourceDebug_form name="Samochody" :src="src2_1" v-slot="{data}" class="abc">
                <label>ID    </label> <FormInput type="number"          :value="data.get(db.TABS.samochody_klientów.cols.ID)"         readonly /> <br>
                <label>ID_K  </label> <FormInput type="number"          :value="data.get(db.TABS.samochody_klientów.cols.ID_klienta)" readonly /> <br>
                <label>MARK  </label> <FormInput type="text"            :value="data.get(db.TABS.samochody_klientów.cols.marka)"      />          <br>   
                <label>MODE  </label> <FormInput type="text"            :value="data.get(db.TABS.samochody_klientów.cols.model)"      />          <br>   
                <label>N REJ </label> <FormInput type="text"            :value="data.get('nr_rej')"                                   />          <br>   
                <label>N SIL </label> <FormInput type="text"            :value="data.get('nr_sil')"                                   />          <br>   
                <label>N NAD </label> <FormInput type="text"            :value="data.get('nr_nad')"                                   />          <br>   
            </QuerySourceDebug_form>
            <QuerySourceDebug_form name="Samochody All" :src="src2_2" v-slot="{data}" class="abc">
                <label>ID    </label> <FormInput type="number"          :value="data.get('`samochody klientów`.`ID`')"         readonly /> <br>
                <label>ID_K  </label> <FormInput type="number"          :value="data.get('`samochody klientów`.`ID klienta`')" />          <br>
                <label>MARK  </label> <FormInput type="text"            :value="data.get('`samochody klientów`.`marka`')"      />          <br>   
                <label>MODE  </label> <FormInput type="text"            :value="data.get('`samochody klientów`.`model`')"      />          <br>   
                <label>N REJ </label> <FormInput type="text"            :value="data.get('nr_rej')"                            />          <br>   
                <label>N SIL </label> <FormInput type="text"            :value="data.get('nr_sil')"                            />          <br>   
                <label>N NAD </label> <FormInput type="text"            :value="data.get('nr_nad')"                            />          <br>   
            </QuerySourceDebug_form>
            <QuerySourceDebug_form name="Samochody Comb" :src="src2_3" v-slot="{data}" class="abc">
                <label>ID    </label> <FormInput type="number"          :value="data.get(0)"         readonly /> <br>
                <label>ID_K  </label> <FormInput type="number"          :value="data.get(6)"                  /> <br>
                <label>MARK  </label> <FormInput type="text"            :value="data.get(1)"                  /> <br>   
                <label>MODE  </label> <FormInput type="text"            :value="data.get(2)"                  /> <br>   
                <label>N REJ </label> <FormInput type="text"            :value="data.get(3)"                  /> <br>   
                <label>N SIL </label> <FormInput type="text"            :value="data.get(4)"                  /> <br>   
                <label>N NAD </label> <FormInput type="text"            :value="data.get(5)"                  /> <br>   
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
