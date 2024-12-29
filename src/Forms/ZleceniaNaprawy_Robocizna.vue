<script setup>
//@ts-check
import QuerySourceOffsetScroller from '../components/Scroller/QuerySourceOffsetScroller.vue';
import { FormDataSetFull, FormDataSetFull_LocalRow, FormDataSetSingle, FormDefaultProps, FormParamProp, FormQuerySourceSingle, param_from_prop, RefChangableValue } from '../components/Dataset';
import { QueryViewerSource } from '../components/QueryViewer/QueryViewer';
import QueryViewerAdv from '../components/QueryViewer/QueryViewerAdv.vue';
import QueryViewerAdvOpenBtn from '../components/QueryViewer/QueryViewerAdvOpenBtn.vue';

import FormInput from '../components/Controls/FormInput.vue';

import useWarsztatDatabase from '../DBStructure/db_warsztat_structure';
import useMainMsgManager from '../components/Msg/MsgManager';

import { CREATE_FORM_QUERY_SOURCE_IN_COMPONENT } from './FormCommon';




const props = defineProps({
    ...FormDefaultProps,
    id_zlecenia: FormParamProp,
});

const msgManager = useMainMsgManager();

//      ID	    numer cz	ilość	cena netto	data przyjęcia	        rodzaj dokumentu	numer dokumentu	    cena netto sprzedaży
// 0:	124336	p4	        -1	    0.00	    2020-10-14 00:00:00	    zlec	            64434	            26.00

const db = useWarsztatDatabase();
const MAIN_TAB  = db.TABS.zlecenia_czynności;
const MAIN_COLS = db.TABS.zlecenia_czynności.cols;
const CZYN_TAB  = db.TABS.czynność;
const CZYN_COLS = db.TABS.czynność.cols;
const ZLEC_TAB  = db.TABS.zlecenia_naprawy;
const ZLEC_COLS = db.TABS.zlecenia_naprawy.cols;

const param_id_zlecenia = param_from_prop(props, 'id_zlecenia');

const src  = CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, {src: new QueryViewerSource(), no_update_on_mounted: true, on_error: handle_err});
src.set_from_with_deps(MAIN_TAB);
// src.add_join(OBR_COLS.numer_dokumentu, ZLEC_COLS.ID, "LEFT");
src.add_join(MAIN_COLS.ID_czynności, CZYN_COLS.ID_cynności, 'LEFT');

src.auto_add_column_synced (MAIN_TAB.rowid);
src.auto_add_column_synced (MAIN_COLS.ID_zlecenia, {param: param_id_zlecenia});
src.auto_add_column_synced (MAIN_COLS.cena_netto);
src.auto_add_column_synced (MAIN_COLS.ID_czynności);
src.auto_add_column        (CZYN_COLS.czynność,           {display: "Czynność", readonly: true});
src.auto_add_column_synced (MAIN_COLS.krotność_wykonania, {display: "Krotność", default: 0});
src.auto_add_column_synced (MAIN_COLS.cena_netto,         {display: "Netto",    default: "0.00"});
src.auto_add_column        ("brutto",                       {
    display: "Brutto Łącznie", 
    sql: "decimal_mul(1.23, decimal_mul(`krotność wykonania`,`cena netto`))",
    input_props: {
        type: 'decimal'
    }
});

//////////////// TOTAL ///////////////

const src_total = CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, {src: new FormQuerySourceSingle(), no_update_on_mounted: true, on_error: handle_err});
src.add_aux_query(src_total);
src_total.disable_offset();
src_total.set_from_with_deps(MAIN_TAB);
const total_zlec_id  = src_total.auto_add_value (MAIN_COLS.ID_zlecenia,  {param: param_id_zlecenia});
const total_netto    = src_total.auto_add_value ("total_netto",          {sql:                   "decimal_sum(decimal_mul(`krotność wykonania`,`cena netto`))" , default: '0'});
const total_brutto   = src_total.auto_add_value ("total_brutto",         {sql: "decimal_mul(1.23, decimal_sum(decimal_mul(`krotność wykonania`,`cena netto`)))", default: '0'});

const id_zlecenia = RefChangableValue.from_sqlvalue(param_id_zlecenia);

////////////////// FIND (DODAJ CZĘŚCI) ///////////////////

const src_list = new QueryViewerSource();
src_list.set_from_with_deps(CZYN_TAB);
src_list.auto_add_column_synced(CZYN_COLS.ID_cynności);
src_list.auto_add_column_synced(CZYN_COLS.czynność, {display: "Nazwa Czynności"});
src_list.set_order(CZYN_COLS.czynność, 1);
src.add_aux_query(src_list);

/**
 * @param {string[]} columns 
 * @param {FormDataSetFull_LocalRow} row 
 */
function QVFactory_czyn_add_select(columns, row) {
    const new_row = src.dataset.add_or_swap_row_default_with_limit(src.get_limit());
    new_row.set_local(MAIN_COLS.krotność_wykonania, 0);
    new_row.set_local(MAIN_COLS.ID_czynności,  row.get_local(CZYN_COLS.ID_cynności));
    new_row.set_local(CZYN_COLS.czynność,      row.get_local(CZYN_COLS.czynność));
};

///////////////////////////////////////////////////////


function handle_err(/**@type {Error} */ err) {
    msgManager.postError(err);
}

QueryViewerSource.window_resize_on_columns_fixed([src, src_list], props.parent_window);

defineExpose({
    src
});

</script>

<template>

<div class="zlec_robot_form">
    <form onsubmit="return false" class="form mod_robots" :ref="e => src.assoc_form(e)">

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
            <label class="summary_part">
                <div>Suma Netto</div>
                <FormInput type="decimal" :value="total_netto" readonly />
            </label>
            <label class="summary_part">
                <div>Suma Brutto</div>
                <FormInput type="decimal" :value="total_brutto" readonly />
            </label>
            <div class="spacer"></div>
        </div>
    </form>

    <fieldset class="add_robots">
        <legend>Dopisywanie Czynności</legend>
        <QueryViewerAdv
            :src="src_list"
            inbeded
            insertable
            saveable
            selectable
            editable
            @error="handle_err"
            @select="QVFactory_czyn_add_select"
        />
    </fieldset>

</div>


</template>

<style scoped>

    .zlec_robot_form {
        display: flex;
        flex-direction: row;
        justify-content: stretch;
        height: 100%;
    }
    .zlec_robot_form > .mod_robots {
        flex-grow: 1;
    }
    .zlec_robot_form > .add_robots {
        flex-grow: 1;
        min-width: 50px;
    }

    .add_robots > legend {
        font-size: 1.4em;
    }

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