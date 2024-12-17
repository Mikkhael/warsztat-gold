<script setup>
//@ts-check
import QuerySourceOffsetScroller from '../components/Scroller/QuerySourceOffsetScroller.vue';
import { FormDataSetFull, FormDataSetSingle, FormDefaultProps, FormParamProp, FormQuerySourceSingle, param_from_prop, RefChangableValue } from '../components/Dataset';
import { QueryViewerSource } from '../components/QueryViewer/QueryViewer';
import QueryViewerAdv from '../components/QueryViewer/QueryViewerAdv.vue';
import QueryViewerAdvOpenBtn from '../components/QueryViewer/QueryViewerAdvOpenBtn.vue';

import FormInput from '../components/Controls/FormInput.vue';

import useWarsztatDatabase from '../DBStructure/db_warsztat_structure';
import useMainMsgManager from '../components/Msg/MsgManager';

import { CREATE_FORM_QUERY_SOURCE_IN_COMPONENT } from './FormCommon';
import { ref } from 'vue';
import { RepQuerySourceSingle } from '../Reports/RepCommon';




const props = defineProps({
    ...FormDefaultProps,
    id_zlecenia: FormParamProp,
});

const msgManager = useMainMsgManager();

//      ID	    numer cz	ilość	cena netto	data przyjęcia	        rodzaj dokumentu	numer dokumentu	    cena netto sprzedaży
// 0:	124336	p4	        -1	    0.00	    2020-10-14 00:00:00	    zlec	            64434	            26.00

const db = useWarsztatDatabase();
const OBR_TAB    = db.TABS.obroty_magazynowe;
const OBR_COLS   = db.TABS.obroty_magazynowe.cols;
const CZ_TAB     = db.TABS.nazwy_części;
const CZ_COLS    = db.TABS.nazwy_części.cols;
const ZLEC_TAB   = db.TABS.zlecenia_naprawy;
const ZLEC_COLS  = db.TABS.zlecenia_naprawy.cols;

const param_id_zlecenia = param_from_prop(props, 'id_zlecenia');

const src  = CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, {src: new QueryViewerSource(), no_update_on_mounted: true, on_error: handle_err});
src.set_from_with_deps(OBR_TAB);
// src.add_join(OBR_COLS.numer_dokumentu, ZLEC_COLS.ID, "LEFT");
src.add_join(OBR_COLS.numer_cz,        CZ_COLS.numer_części);

src.auto_add_column_synced (OBR_COLS.ID);
src.auto_add_column_synced (OBR_COLS.rodzaj_dokumentu, {param: "zlec"});
src.auto_add_column_synced (OBR_COLS.numer_dokumentu,  {param: param_id_zlecenia});
src.auto_add_column_synced (OBR_COLS.cena_netto);
src.auto_add_column_synced (OBR_COLS.ilość,            {default: 0});
src.auto_add_column_synced (OBR_COLS.numer_cz,         {display: "Numer Części", readonly: true});
src.auto_add_column        (CZ_COLS.nazwa_części,      {display: "Nazwa Części", readonly: true});
src.auto_add_column_local  ("pos_ilość", {
    assoc_col: OBR_COLS.ilość,
    display:  "Ilość",
    computed: FormDataSetFull.auto_computed_def(OBR_COLS.ilość, val => -Number(val))
});
src.auto_add_column_synced (OBR_COLS.cena_netto_sprzedaży,  {display: "Cena Netto Sprzedarzy", default: "0"});
src.auto_add_column        ("brutto",                       {
    display: "Brutto Łącznie", 
    sql: "decimal_mul(-1.23, decimal_mul(`ilość`,`cena netto sprzedaży`))",
    input_props: {
        type: 'decimal'
    }
});

//////////////// TOTAL ///////////////

const src_total = CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, {src: new FormQuerySourceSingle(), no_update_on_mounted: true, on_error: handle_err});
src_total.disable_offset();
src_total.set_no_disable_on_empty();
src_total.set_from_with_deps(OBR_TAB);
src.add_dep(src_total);
const total_zlec     = src_total.auto_add_value (OBR_COLS.rodzaj_dokumentu, {param: "zlec"});
const total_zlec_id  = src_total.auto_add_value (OBR_COLS.numer_dokumentu,  {param: param_id_zlecenia});
// const total_netto_pr = src_total.auto_add_value ("total_netto_profit",  {sql: "decimal_mul(-1,    decimal_sum(decimal_mul(`ilość`, decimal_sub(`cena netto sprzedaży`, `cena netto`))))"})
const total_netto    = src_total.auto_add_value ("total_netto",         {sql: "decimal_mul(-1,    decimal_sum(decimal_mul(`ilość`,`cena netto sprzedaży`)))"})
const total_brutto   = src_total.auto_add_value ("total_brutto",        {sql: "decimal_mul(-1.23, decimal_sum(decimal_mul(`ilość`,`cena netto sprzedaży`)))"})

const id_zlecenia = RefChangableValue.from_sqlvalue(param_id_zlecenia);

////////////////// FIND (DODAJ CZĘŚCI) ///////////////////

const QVFactory_parts_add = () => {
    const src = new QueryViewerSource();
    src.set_from_with_deps(CZ_TAB);
    src.auto_add_column('cena netto', {sql: "'0'"}); // TODO Cena Netto
    src.auto_add_column(CZ_COLS.numer_części, {display: "Numer"});
    src.auto_add_column(CZ_COLS.nazwa_części, {display: "Nazwa"});
    return src;
}

/**@type {import('../components/QueryViewer/QueryViewer').QueryViewerSelectHandler} */
function QVFactory_parts_add_select(columns, row, offset, close) {
    const new_row = src.dataset.add_or_swap_row_default_with_limit(Infinity); // TODO ADD LIMIT
    new_row.set_local(OBR_COLS.ilość,                  0);
    new_row.set_local(OBR_COLS.cena_netto_sprzedaży, "0");
    new_row.set_local(OBR_COLS.cena_netto,       row.get_local("cena netto")); // TODO Cena Netto
    new_row.set_local(OBR_COLS.numer_cz,         row.get_local(CZ_COLS.numer_części));
    new_row.set_local(CZ_COLS.nazwa_części,      row.get_local(CZ_COLS.nazwa_części));
};

///////////////////////////////////////////////////////


function handle_err(/**@type {Error} */ err) {
    msgManager.postError(err);
}

defineExpose({
    src
});

</script>

<template>

<form class="form" :ref="e => src.assoc_form(e)">

    <div class="obroty_list">
        <QueryViewerAdv 
            :src="src"
            inbeded
            saveable
            deletable
            @error="handle_err"
        />
    </div>


    <div class="obroty_panel">
        <label class="summary_part">
            <div>ID Zlecenia</div>
            <FormInput :value="id_zlecenia" readonly />
        </label>
        <!-- <label class="summary_part">
            <div>Zysk Netto</div>
            <FormInput type="decimal" :value="total_netto_pr" readonly />
        </label> -->
        <label class="summary_part">
            <div>Suma Netto</div>
            <FormInput type="decimal" :value="total_netto" readonly />
        </label>
        <label class="summary_part">
            <div>Suma Brutto</div>
            <FormInput type="decimal" :value="total_brutto" readonly />
        </label>
        <div class="spacer"></div>
        <QueryViewerAdvOpenBtn 
            style="padding: 1ch"
            text="Dodaj Części"
            :title="`Dodawanie Części Do Zlecenia nr ${id_zlecenia.get_local()}`"
            :src_factory="QVFactory_parts_add"
                 @select="QVFactory_parts_add_select"
            selectable
            @error="handle_err"
        />
    </div>
</form>


</template>

<style scoped>

    .form{
        height: 100%;
        display: flex;
        flex-direction: column;
    }
    .obroty_list {
        border-bottom: 2px solid black;
        flex-grow: 1;
        flex-shrink: 1;
        min-height: 30px;
    }
    .obroty_panel{
        padding: 4px;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
    }
    .obroty_panel > .summary_part {
        text-align: center;
    }
    .obroty_panel > .spacer {
        flex-grow: 1;
    }


</style>