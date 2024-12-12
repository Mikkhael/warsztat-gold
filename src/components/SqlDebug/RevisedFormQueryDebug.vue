<script setup>
//@ts-check

import {computed, reactive, ref,shallowRef} from 'vue';

import useWarsztatDatabase from '../../DBStructure/db_warsztat_structure';
import { FormQuerySourceFull, OwningChangableValue, SimpleQuerySource } from '../Dataset';
import QuerySourceOffsetScroller from '../Scroller/QuerySourceOffsetScroller.vue';
import DatasetFullArray from '../Controls/DatasetFullArray.vue';

import FormInput from '../Controls/FormInput.vue';
import FormEnum from '../Controls/FormEnum.vue';
import { QueryViewerSource } from '../QueryViewer/QueryViewer';
import QueryViewerAdv from '../QueryViewer/QueryViewerAdv.vue';


const db = useWarsztatDatabase();

const PRAC_TAB  = db.TABS.pracownicy;
const PRAC_COLS = db.TABS.pracownicy.cols;

const PLAC_TAB  = db.TABS.płace;
const PLAC_COLS = db.TABS.płace.cols;

const podstawa_enum_src = new SimpleQuerySource();
podstawa_enum_src.add_select("p", "distinct `podstawa`");
podstawa_enum_src.set_from_with_deps(PLAC_TAB);

const src_full = new FormQuerySourceFull();
src_full.add_dep(podstawa_enum_src);
src_full.set_from_with_deps(PRAC_TAB);

src_full.auto_add_column_synced(PRAC_COLS.ID_pracownika,     );
src_full.auto_add_column_synced(PRAC_COLS.imię,              );
src_full.auto_add_column       (PRAC_COLS.imię_matki,        );
src_full.auto_add_column_synced(PRAC_COLS.data_urodzenia,    );
src_full.auto_add_column_impl('imie_caps', {sql: 'upper(`imię`)'});

src_full.add_join(PRAC_COLS.ID_pracownika, PLAC_COLS.ID_pracownika, 'LEFT');
src_full.auto_add_column_synced(PLAC_COLS.ID_płac,           );
src_full.auto_add_column_synced(PLAC_COLS.kwota,             );
src_full.auto_add_column_synced(PLAC_COLS.podstawa,          );
src_full.auto_add_column_impl  ("no_plac", {sql: "(`ID płac` IS NULL)", default: 1});
src_full.add_where('(`płace`.rowid IN (SELECT r FROM (SELECT rowid as r, max(`kwota`) FROM `płace` GROUP BY `ID pracownika` ))) OR `płace`.rowid IS NULL');
src_full.dataset.get_or_create_sync(PLAC_TAB).set_update_only();


const podstawa_enum_values = computed(() => {
    return podstawa_enum_src.full_result.value?.[0].map(x => x[0]) ?? [];
})

function add_row() {
    src_full.dataset.add_row_default();
}

async function fetch_full() {
    await src_full.try_perform_and_update_confirmed(() => src_full.request_refresh());
    console.log('QUERY RESULT', src_full.full_result);
    console.log('QUERY SRC', src_full); 
}

async function save_full(force = false) {
    const affected = await src_full.save_deep_transaction_and_update(force);
    console.log("SAVE Affected " + affected + " rows");
}

//////////////////// Query Viewer //////////////

const nazwisko_len      = ref(0);
const nazwisko_readonly = ref(false);
const nazwisko_input_props = computed(() => {
    return {
        len: nazwisko_len.value,
        readonly: nazwisko_readonly.value,
    }
})

const q_src = new QueryViewerSource();
q_src.set_from_with_deps(PRAC_TAB);
q_src.auto_add_column_synced(PRAC_COLS.ID_pracownika,     );
q_src.auto_add_column_synced(PRAC_COLS.imię,              {display: "Imię"});
q_src.auto_add_column_synced(PRAC_COLS.nazwisko,          {display: "Nazwisko", input_props: nazwisko_input_props});
q_src.auto_add_column_impl  ('n',                         {display: "N", sql:"(`rowid` + 2)", readonly: false, input_props: {type:'integer'}});
q_src.auto_add_column       (PRAC_COLS.imię_matki,        {display: "Imię Matki"});
q_src.auto_add_column_synced(PRAC_COLS.imię_ojca,         {display: "Imię Ojca", readonly: true});
q_src.auto_add_column_synced(PRAC_COLS.miejscowość,       {display: "Miasto",   readonly: true, input_props: {readonly: false}});
q_src.auto_add_column_synced(PRAC_COLS.data_urodzenia,    {display: "Uro"});
q_src.auto_add_column_synced(PRAC_COLS.miejsce_urodzenia, {display: "M. Uro",   as_enum: true, input_props: {options: ['Gliwice', ['Zabrze', 'HAHA']]}});
q_src.auto_add_column_impl('imie_caps', {sql: 'upper(`imię`)', display: 'Imie CAPS'});


const select_result = ref('');
function handle_select(cols, row, offset) {
    console.log("SELECTING (Cient)", cols, row, offset);
    select_result.value = row.values.map(x => x.get_local()).join('; ');
}



///////////////////////////////////////////////

const show_deleted = ref(false);

function handle_err(err) {
    console.error(err);
}

const opts = reactive({
    qviewer_selectable: false,
    qviewer_saveable:   true,
    qviewer_insertable: true,
    qviewer_deletable:  true,
});





</script>

<template>

	<div>

        <button @click="add_row()"       > ADD ROW         </button>
        <button @click="fetch_full()"    > FETCH FULL      </button>
        <button @click="save_full()"     > SAVE FULL       </button>
        <button @click="save_full(true)" > SAVE FULL FORCE </button>

        <!-- <QuerySourceOffsetScroller 
            :src="prac_src"
            @error="handle_err"
            saveable
        /> -->

        <p>
            changed:  <span>{{ src_full.changed }}</span> <br>
            expired:  <span>{{ src_full.expired }}</span> <br>
            disabled: <span>{{ src_full.disabled }}</span> <br>
            
            enum_changed:  <span>{{ podstawa_enum_src.changed }}</span> <br>
            enum_expired:  <span>{{ podstawa_enum_src.expired }}</span> <br>
            enum_disabled: <span>{{ podstawa_enum_src.disabled }}</span> <br>

        </p>
        <p>
            enum podstawa: {{ podstawa_enum_values }} <br>
        </p>

        <p>
            Show deleted: <input type="checkbox" v-model="show_deleted">
        </p>

        <DatasetFullArray :dataset="src_full.dataset" v-slot="{elem, deleted}" :show_deleted="show_deleted">
            <div class="prac_src_dataset_row" :class="{deleted}">
                <label> ID:         <FormInput auto :value="elem.get(PRAC_COLS.ID_pracownika)" /> </label>
                <label> IMIĘ:       <FormInput auto :value="elem.get(1)" /> </label>
                <label> IMIĘ CAPS:  <FormInput      :value="elem.get('imie_caps')" /> </label>
                <label> IMIĘ MATKI: <FormInput auto :value="elem.get('`pracownicy`.`imię matki`')" /> </label>
                <label> DATA URO:   <FormInput auto :value="elem.get(PRAC_COLS.data_urodzenia)" /> </label>
                <label> ID plac:    <FormInput auto :value="elem.get(PLAC_COLS.ID_płac)" readonly /> </label>
                <label> KWOTA:      <FormInput :readonly="elem.is_true('no_plac')" auto :value="elem.get(PLAC_COLS.kwota)"    type="decimal" /> </label>
                <label> PODSTAWA:   <FormEnum  :readonly="elem.is_true('no_plac')"      :value="elem.get(PLAC_COLS.podstawa)" :options="podstawa_enum_values" /> </label>
                <label> PODSTAWA:   <FormInput :readonly="elem.is_true('no_plac')" auto :value="elem.get(PLAC_COLS.podstawa)" /> </label>
                <div> FULL: {{ elem.values.map(x => x.get_local()) }}</div>
                <!-- <div>tak</div> -->
            </div>
        </DatasetFullArray>



        <p>
            <label>Selectable: <input type="checkbox" v-model="opts.qviewer_selectable"> </label><br>
            <label>Saveable:   <input type="checkbox" v-model="opts.qviewer_saveable">   </label><br>
            <label>Insertable: <input type="checkbox" v-model="opts.qviewer_insertable"> </label><br>
            <label>Deletable:  <input type="checkbox" v-model="opts.qviewer_deletable">  </label><br>
        </p>
        {{ select_result }} <br>
        <!-- <FormInput :value="new OwningChangableValue('tak')" @click="console.log('CLICKED ME COMP!!')"  /><br> -->
        <input value="tak" @click="console.log('CLICKED ME RAW!!')" disabled style="pointer-events: none" /><br>
        <div class="qviewer_container">
            <QueryViewerAdv 
                :src="q_src"
                :saveable="opts.qviewer_saveable"
                :insertable="opts.qviewer_insertable"
                :deletable="opts.qviewer_deletable"
                :selectable="opts.qviewer_selectable"
                @select="handle_select"
                @error="handle_err"
            />
        </div>

        <!-- <form class="full_form">
            <div class="full_form_row"
                v-for=" (row, row_index) in prac_src_rows_ref"
                :key="prac_src.dataset.get_unique_key(row_index)"
            >
                <label> ID:         <FormInput auto :value="row.get(PRAC_COLS.ID_pracownika)" /> </label> <br>
                <label> IMIĘ:       <FormInput auto :value="row.get(1)" /> </label> <br>
                <label> IMIĘ CAPS:  <FormInput      :value="row.get('imie_caps')" /> </label> <br>
                <label> IMIĘ MATKI: <FormInput auto :value="row.get('`pracownicy`.`imię matki`')" /> </label> <br>
                <label> DATA URO:   <FormInput auto :value="row.get(PRAC_COLS.data_urodzenia)" /> </label> <br>
                {{ row.values.map(x => x.get_local()) }}
            </div>
        </form> -->


        
    </div>

</template>

<style scoped>

    .full_form_row {
        border: 2px solid black;
    }
    .prac_src_dataset_row {
        display: grid;
        grid-template-columns: repeat(2, auto);
        justify-content: start;
        border-bottom: 1px dashed black;
    }
    .prac_src_dataset_row.deleted {
        background-color: red;
    }

    .qviewer_container {
        border: 2px solid green;
        resize: both;
        height: 300px;
        overflow: auto;
    }

</style>
