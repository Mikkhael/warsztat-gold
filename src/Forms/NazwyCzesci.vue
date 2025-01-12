<script setup>
//@ts-check
import QuerySourceOffsetScroller from '../components/Scroller/QuerySourceOffsetScroller.vue';
import { FormDefaultProps } from '../components/Dataset';
import { QueryViewerSource } from '../components/QueryViewer/QueryViewer';
import QueryViewerAdvOpenBtn from '../components/QueryViewer/QueryViewerAdvOpenBtn.vue';

import FormInput from '../components/Controls/FormInput.vue';

import useWarsztatDatabase from '../DBStructure/db_warsztat_structure';
import useMainMsgManager from '../components/Msg/MsgManager';

import { CREATE_FORM_QUERY_SOURCE_IN_COMPONENT } from './FormCommon';




const props = defineProps({
    ...FormDefaultProps,
});

const msgManager = useMainMsgManager();


// #	numer części	nazwa części	                        jednostka	grupa	VAT	    ilość w opakowaniu zbiorczym	lokalizacja w magazynie	    odpowiedniki
// 0:	r5436	        drążek kierowniczy pr, str, Reno 19	    szt.	    1.3	    0.22	0	                            ~NULL~	                    ~NULL~

const db = useWarsztatDatabase();
const TAB  = db.TABS.nazwy_części;
const COLS = TAB.cols;

const src  = CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, {on_error: handle_err});
src.set_from_with_deps(TAB);

const numer = src.auto_add_value_synced(COLS.numer_części);
const nazwa = src.auto_add_value_synced(COLS.nazwa_części);
const unit  = src.auto_add_value_synced(COLS.jednostka, {default: "szt."});
const group = src.auto_add_value_synced(COLS.grupa,     {default: 0});
const vat   = src.auto_add_value_synced(COLS.VAT,       {default: 0.22});
const ilosc = src.auto_add_value_synced(COLS.ilość_w_opakowaniu_zbiorczym, {default: 0});
const lokal = src.auto_add_value_synced(COLS.lokalizacja_w_magazynie);
const odpow = src.auto_add_value_synced(COLS.odpowiedniki);


// FIND

const QVFactory_find = () => {
    const src = new QueryViewerSource();
    src.set_from_with_deps(TAB);

    src.auto_add_column(TAB.rowid);
    src.auto_add_column(COLS.numer_części,                 {display: "Numer"});
    src.auto_add_column(COLS.nazwa_części,                 {display: "Nazwa"});
    src.auto_add_column(COLS.VAT,                          {display: "VAT"});
    src.auto_add_column(COLS.ilość_w_opakowaniu_zbiorczym, {display: "Ilość"});
    src.auto_add_column(COLS.jednostka,                    {display: "Jedn."});
    src.auto_add_column(COLS.lokalizacja_w_magazynie,      {display: "lok. w magazynie"});
    src.auto_add_column(COLS.odpowiedniki,                 {display: "Odpowiedniki"});
    src.auto_add_column(COLS.grupa,                        {display: "Grupa"});
    return src;
}
const QVFactory_find_select = QueryViewerSource.create_default_select_handler([[src, 0]], handle_err, {focus_window: props.parent_window});


function handle_err(/**@type {Error} */ err) {
    msgManager.postError(err);
}

defineExpose({
    src
});

</script>

<template>



<div class="form_container" :class="src.form_style.value">

<form onsubmit="return false" class="form_content form" :ref="e => src.assoc_form(e)">
    <label class="label">Numer                  </label> <FormInput :value="numer" auto />
    <div></div>
    <QueryViewerAdvOpenBtn 
        :parent_window="props.parent_window"
        text="Znajdź Część"
        selectable
        :src_factory="QVFactory_find"
             @select="QVFactory_find_select"
             @error="handle_err"
    />
    <label class="label">Nazwa                  </label> <FormInput :value="nazwa" auto textarea rows="3"/>
    <label class="label">Odpowiedniki           </label> <FormInput :value="odpow" auto textarea rows="3"/>
    <label class="label">jednostka              </label> <FormInput :value="unit " auto />
    <label class="label">Ilość w opakowaniu     </label> <FormInput :value="ilosc" auto />
    <label class="label">VAT                    </label> <FormInput :value="vat  " auto />
    <label class="label">Grupa                  </label> <FormInput :value="group" auto />
    <label class="label">Lokalizacja w magazynie</label> <FormInput :value="lokal" auto />
</form>
<QuerySourceOffsetScroller
    :src="src"
    insertable
    saveable
    @error="handle_err"
/> 

</div>



</template>

<style scoped>

.form {
    padding: 3px;
    display: grid;
    grid: auto 1fr 1fr auto auto auto / auto 1fr auto 1fr;
    gap: 1px 2px;
    justify-self:  start;
    justify-items: stretch;
    align-items:   stretch;
}
.form > label {
    align-self:    center;
}
.form > ::v-deep(textarea) {
    grid-column: 2 / span 3;
}

</style>