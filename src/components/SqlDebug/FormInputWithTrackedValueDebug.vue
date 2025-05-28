<script setup>
//@ts-check

import FormInput from '../Controls/FormInput.vue';

import useWarsztatDatabase from '../../DBStructure/db_warsztat_structure';

import { date_now, computed_JSON, DecimalFormatPreset, datetime_now } from '../../utils';
import { ref, toRef, computed, unref, reactive, toValue } from 'vue';
import { TrackedValue } from '../Dataset/TrackedValue';

const {TABS} = useWarsztatDatabase();

const REFS_num  = [ref(0), ref(1), ref(2)];
const REFS_str  = [ref("ala"),ref("ala2"),ref("ala3")];
const REFS_date = [ref(datetime_now()),ref(datetime_now()),ref(datetime_now())];
const REFS_dec  = [ref("0.01"), ref("0.02"), ref("0.03")];


/**@type {import('vue').Ref<import('../../utils').DecimalFormat>} */
const CUSTOM_DEC_FORMAT = ref({
    precission: 3,
    sep: "|a|",
    suffix: "units",
    trip_sep: "_",
});
const CUSTOM_DEC_FORMAT_str = computed_JSON(CUSTOM_DEC_FORMAT);

const LOOKUP_ALL = computed(() => { return {
    num : REFS_num .map(x => unref(x)),
    str : REFS_str .map(x => unref(x)),
    date: REFS_date.map(x => unref(x)),
    dec : REFS_dec .map(x => unref(x)),
}});

function tri(r) {
    switch(unref(r)){
        case '1': case 1: return true;
        case '0': case 0: return false;
    }
    return undefined;
 }

const REFS_I = ref(0);
const FORCE_CHANGED  = ref(2);
const FORCE_TEXTAREA = ref(2);
const FORCE_READONLY = ref(2);
const FORCE_NONULL   = ref(2);
const common_forces = reactive({
    changed:  computed(() => tri(FORCE_CHANGED) ),
    textarea: computed(() => tri(FORCE_TEXTAREA)),
    readonly: computed(() => tri(FORCE_READONLY)),
    nonull:   computed(() => tri(FORCE_NONULL)  ),
})
const FORCE_LEN = ref(5);
const FORCE_MIN = ref(2);
const FORCE_MAX = ref(10);

const FORCE_COLUMN_TNAME = ref('płace');
const FORCE_COLUMN_CNAME = ref('podstawa');

const TAB_NAMES = computed(() => Object.keys(TABS));
const COL_NAMES = computed(() => Object.keys(TABS[FORCE_COLUMN_TNAME.value]?.cols ?? {}));
const FORCE_COLUMN = computed(() => {
    return TABS[FORCE_COLUMN_TNAME.value]?.cols?.[FORCE_COLUMN_CNAME.value] ?? undefined;
});


const OLD_num  = ref(0);
const OLD_str  = ref("ala");
const OLD_date = ref(date_now());
const OLD_dec  = ref("0.01");



const REFS_num_comp  = computed({get(){return REFS_num [REFS_I.value].value}, set(v){REFS_num [REFS_I.value].value = v;}});
const REFS_dec_comp  = computed({get(){return REFS_dec [REFS_I.value].value}, set(v){REFS_dec [REFS_I.value].value = v;}});
const REFS_str_comp  = computed({get(){return REFS_str [REFS_I.value].value}, set(v){REFS_str [REFS_I.value].value = v;}});
const REFS_date_comp = computed({get(){return REFS_date[REFS_I.value].value}, set(v){REFS_date[REFS_I.value].value = v;}});


// TrackedValue tests

const VAR_I = ref(0);
const VAR_num  = [TrackedValue.Create(REFS_num_comp,  OLD_num ), TrackedValue.Create(REFS_num[1],  OLD_num ), TrackedValue.Create(REFS_num[2],  OLD_num ), TrackedValue.Create(100,   OLD_num )];
const VAR_str  = [TrackedValue.Create(REFS_str_comp,  OLD_str ), TrackedValue.Create(REFS_str[1],  OLD_str ), TrackedValue.Create(REFS_str[2],  OLD_str ), TrackedValue.Create("100", OLD_str )];
const VAR_date = [TrackedValue.Create(REFS_date_comp, OLD_date), TrackedValue.Create(REFS_date[1], OLD_date), TrackedValue.Create(REFS_date[2], OLD_date), TrackedValue.Create("1000-10-10 00:00:00", OLD_date)];
const VAR_dec  = [TrackedValue.Create(REFS_dec_comp,  OLD_dec ), TrackedValue.Create(REFS_dec[1],  OLD_dec ), TrackedValue.Create(REFS_dec[2],  OLD_dec ), TrackedValue.Create("100.10", OLD_dec )];


const VAR_num_comp  = computed(() => VAR_num [VAR_I.value]);
const VAR_dec_comp  = computed(() => VAR_dec [VAR_I.value]);
const VAR_str_comp  = computed(() => VAR_str [VAR_I.value]);
const VAR_date_comp = computed(() => VAR_date[VAR_I.value]);

const VAR_column = computed(() => TrackedValue.FromColumn(FORCE_COLUMN.value));

</script>


<template>
    

<fieldset>
    <legend>LOOKUP</legend>
    <pre class="lookup">{{ LOOKUP_ALL }}</pre>
</fieldset>

I:     <input type="number" v-model="REFS_I"> <br>
VAR I: <input type="number" v-model="VAR_I"> <br>
FORCE_CHANGED:  <input type="number" min="0" max="2" step="1" v-model="FORCE_CHANGED">  <br>
FORCE_TEXTAREA: <input type="number" min="0" max="2" step="1" v-model="FORCE_TEXTAREA"> <br>
FORCE_READONLY: <input type="number" min="0" max="2" step="1" v-model="FORCE_READONLY"> <br>
FORCE_NONULL:   <input type="number" min="0" max="2" step="1" v-model="FORCE_NONULL"  > <br>
<br>
FORCE_LEN: <input type="number" step="1" v-model="FORCE_LEN"> <br>
FORCE_MIN: <input type="number" v-model="FORCE_MIN"> <br>
FORCE_MAX: <input type="number" v-model="FORCE_MAX"> <br>



OLD NUM: <input type="text" v-model="OLD_str" > <br>
OLD STR: <input type="number" v-model="OLD_num" > <br>
OLD DAT: <input type="text" v-model="OLD_date" > <br>
OLD DEC: <input type="text" v-model="OLD_dec" > <br>

<div class="tested_forms_container">

<form onsubmit="return false" class="form">

<h2>TRACKED VALUES</h2>

STR TRACK:         <FormInput type="text" :value="VAR_str_comp"                                  _debug_on               v-bind="common_forces"/> <br>
STR TRACK NO OLD:  <FormInput type="text" :value="VAR_str_comp" :oldvalue="REFS_str[0].value"                   v-bind="common_forces"/> <br>
STR TRACK LEN:     <FormInput type="text" :value="VAR_str_comp"                               :len="FORCE_LEN"  v-bind="common_forces"/> <br>
<!-- // NOTE length warning isn't updated, if value changed from some other place -->
<br>
NUM TRACK:         <FormInput type="number" :value="VAR_num_comp"                                                 v-bind="common_forces"/> <br>
NUM TRACK NO OLD:  <FormInput type="number" :value="VAR_num_comp" :oldvalue="REFS_num[0].value"                   v-bind="common_forces"/> <br>
NUM TRACK MIN MAX: <FormInput type="number" :value="VAR_num_comp"                               :min="FORCE_MIN" :max="FORCE_MAX" v-bind="common_forces"/> <br>
<br>
INT TRACK:         <FormInput type="integer" :value="VAR_num_comp"                                                 v-bind="common_forces"/> <br>
INT TRACK NO OLD:  <FormInput type="integer" :value="VAR_num_comp" :oldvalue="REFS_num[0].value"                   v-bind="common_forces"/> <br>
INT TRACK MIN MAX: <FormInput type="integer" :value="VAR_num_comp"                               :min="FORCE_MIN" :max="FORCE_MAX" v-bind="common_forces"/> <br>
<br>
DEC TRACK:         <FormInput type="decimal" :value="VAR_dec_comp"                                                 v-bind="common_forces"/> <br>
DEC TRACK NO OLD:  <FormInput type="decimal" :value="VAR_dec_comp" :oldvalue="REFS_dec[0].value"                   v-bind="common_forces"/> <br>
DEC TRACK MIN MAX: <FormInput type="decimal" :value="VAR_dec_comp"                               :min="FORCE_MIN" :max="FORCE_MAX" v-bind="common_forces"/> <br>
<br>
MON TRACK:         <FormInput type="money" :value="VAR_dec_comp"                                                  v-bind="common_forces"/> <br>
MON TRACK NO OLD:  <FormInput type="money" :value="VAR_dec_comp" :oldvalue="REFS_dec[0].value"                    v-bind="common_forces"/> <br>
MON TRACK MIN MAX: <FormInput type="money" :value="VAR_dec_comp"                                :min="FORCE_MIN" :max="FORCE_MAX" v-bind="common_forces"/> <br>
<br>
CUSTOM DEC TRACK:         <FormInput type="decimal" :value="VAR_dec_comp"                                                                 :decimal_format="CUSTOM_DEC_FORMAT" v-bind="common_forces"/> <br>
CUSTOM DEC TRACK NO OLD:  <FormInput type="decimal" :value="VAR_dec_comp" :oldvalue="REFS_dec[0].value"                                   :decimal_format="CUSTOM_DEC_FORMAT" v-bind="common_forces"/> <br>
CUSTOM DEC TRACK MIN MAX: <FormInput type="decimal" :value="VAR_dec_comp"                               :min="FORCE_MIN" :max="FORCE_MAX" :decimal_format="CUSTOM_DEC_FORMAT" v-bind="common_forces"/> <br>
<textarea v-model="CUSTOM_DEC_FORMAT_str"></textarea> <br>
RAW DATE: <input type="text" v-model="REFS_date_comp"> <br>
<br>
DATE TRACK:         <FormInput type="date"           :value="VAR_date_comp"                                v-bind="common_forces"/> <br>
DATE TRACK NO OLD:  <FormInput type="date"           :value="VAR_date_comp" :oldvalue="REFS_date[0].value" v-bind="common_forces"/> <br>
<!-- DT   TRACK:         <FormInput type="datetime"       :value="VAR_date_comp"                                v-bind="common_forces"/> <br>
DT   TRACK NO OLD:  <FormInput type="datetime"       :value="VAR_date_comp" :oldvalue="REFS_date[0].value" v-bind="common_forces"/> <br>
DTL  TRACK:         <FormInput type="datetime-local" :value="VAR_date_comp"                                v-bind="common_forces"/> <br>
DTL  TRACK NO OLD:  <FormInput type="datetime-local" :value="VAR_date_comp" :oldvalue="REFS_date[0].value" v-bind="common_forces"/> <br> -->
<br>
TABLE:  <select v-model="FORCE_COLUMN_TNAME">
    <option v-for="name in TAB_NAMES" :value="name">{{name}}</option>
</select> <br>
COLUMN: <select v-model="FORCE_COLUMN_CNAME">
    <option v-for="name in COL_NAMES" :value="name">{{name}}</option>
</select> <br>
COLUMN METADATA TRACK:   <FormInput                        :decimal_format="CUSTOM_DEC_FORMAT" :value="VAR_column" v-bind="common_forces"/> <br>
COLUMN RAW      TRACK:   <FormInput :column="FORCE_COLUMN" :decimal_format="CUSTOM_DEC_FORMAT" :value="VAR_date_comp" v-bind="common_forces"/> <br>
<!-- COLUMN TRACK 2: <FormInput :type="FORCE_COLUMN?.type === 'DATETIME' ? 'date' : 'text'" :rawvalue="'2222-10-1x0'" v-bind="common_forces" :_debug_on="true"/> <br> -->
<br>

    
</form>

<form onsubmit="return false" class="form">

<h2>REFS</h2>

STR MODEL:         <FormInput type="text" v-model:rawvalue="REFS_str_comp" :oldvalue="OLD_str"                   v-bind="common_forces"/> <br>
STR MODEL NO OLD:  <FormInput type="text" v-model:rawvalue="REFS_str_comp"                                       v-bind="common_forces"/> <br>
STR MODEL LEN:     <FormInput type="text" v-model:rawvalue="REFS_str_comp" :oldvalue="OLD_str" :len="FORCE_LEN"  v-bind="common_forces"/> <br>
<!-- // NOTE length warning isn't updated, if value changed from some other place -->
<br>
NUM MODEL:         <FormInput type="number" v-model:rawvalue="REFS_num_comp" :oldvalue="OLD_num"                   v-bind="common_forces"/> <br>
NUM MODEL NO OLD:  <FormInput type="number" v-model:rawvalue="REFS_num_comp"                                       v-bind="common_forces"/> <br>
NUM MODEL MIN MAX: <FormInput type="number" v-model:rawvalue="REFS_num_comp" :oldvalue="OLD_num" :min="FORCE_MIN" :max="FORCE_MAX" v-bind="common_forces"/> <br>
<br>
INT MODEL:         <FormInput type="integer" v-model:rawvalue="REFS_num_comp" :oldvalue="OLD_num"                   v-bind="common_forces"/> <br>
INT MODEL NO OLD:  <FormInput type="integer" v-model:rawvalue="REFS_num_comp"                                       v-bind="common_forces"/> <br>
INT MODEL MIN MAX: <FormInput type="integer" v-model:rawvalue="REFS_num_comp" :oldvalue="OLD_num" :min="FORCE_MIN" :max="FORCE_MAX" v-bind="common_forces"/> <br>
<br>
DEC MODEL:         <FormInput type="decimal" v-model:rawvalue="REFS_dec_comp" :oldvalue="OLD_dec"                   v-bind="common_forces"/> <br>
DEC MODEL NO OLD:  <FormInput type="decimal" v-model:rawvalue="REFS_dec_comp"                                       v-bind="common_forces"/> <br>
DEC MODEL MIN MAX: <FormInput type="decimal" v-model:rawvalue="REFS_dec_comp" :oldvalue="OLD_dec" :min="FORCE_MIN" :max="FORCE_MAX" v-bind="common_forces"/> <br>
<br>
MON MODEL:         <FormInput type="money" v-model:rawvalue="REFS_dec_comp" :oldvalue="OLD_dec"                   v-bind="common_forces"/> <br>
MON MODEL NO OLD:  <FormInput type="money" v-model:rawvalue="REFS_dec_comp"                                       v-bind="common_forces"/> <br>
MON MODEL MIN MAX: <FormInput type="money" v-model:rawvalue="REFS_dec_comp" :oldvalue="OLD_dec" :min="FORCE_MIN" :max="FORCE_MAX" v-bind="common_forces"/> <br>
<br>
CUSTOM DEC MODEL:         <FormInput type="decimal" v-model:rawvalue="REFS_dec_comp" :oldvalue="OLD_dec"                                   :decimal_format="CUSTOM_DEC_FORMAT" v-bind="common_forces"/> <br>
CUSTOM DEC MODEL NO OLD:  <FormInput type="decimal" v-model:rawvalue="REFS_dec_comp"                                                       :decimal_format="CUSTOM_DEC_FORMAT" v-bind="common_forces"/> <br>
CUSTOM DEC MODEL MIN MAX: <FormInput type="decimal" v-model:rawvalue="REFS_dec_comp" :oldvalue="OLD_dec" :min="FORCE_MIN" :max="FORCE_MAX" :decimal_format="CUSTOM_DEC_FORMAT" v-bind="common_forces"/> <br>
<textarea v-model="CUSTOM_DEC_FORMAT_str"></textarea> <br>
RAW DATE: <input type="text" v-model="REFS_date_comp"> <br>
<br>
DATE MODEL:         <FormInput type="date"           v-model:rawvalue="REFS_date_comp" :oldvalue="OLD_date" v-bind="common_forces"/> <br>
DATE MODEL NO OLD:  <FormInput type="date"           v-model:rawvalue="REFS_date_comp"                      v-bind="common_forces"/> <br>
<!-- DT   MODEL:         <FormInput type="datetime"       v-model:rawvalue="REFS_date_comp" :oldvalue="OLD_date" v-bind="common_forces"/> <br> -->
<!-- DT   MODEL NO OLD:  <FormInput type="datetime"       v-model:rawvalue="REFS_date_comp"                      v-bind="common_forces"/> <br> -->
<!-- DTL  MODEL:         <FormInput type="datetime-local" v-model:rawvalue="REFS_date_comp" :oldvalue="OLD_date" v-bind="common_forces"/> <br> -->
<!-- DTL  MODEL NO OLD:  <FormInput type="datetime-local" v-model:rawvalue="REFS_date_comp"                      v-bind="common_forces"/> <br> -->
<br>
TABLE:  <select v-model="FORCE_COLUMN_TNAME">
    <option v-for="name in TAB_NAMES" :value="name">{{name}}</option>
</select> <br>
COLUMN: <select v-model="FORCE_COLUMN_CNAME">
    <option v-for="name in COL_NAMES" :value="name">{{name}}</option>
</select> <br>
COLUMN MODEL:   <FormInput :column="FORCE_COLUMN" :decimal_format="CUSTOM_DEC_FORMAT" v-model:rawvalue="REFS_date_comp" v-bind="common_forces" /> <br>
<!-- COLUMN MODEL 2: <FormInput :type="FORCE_COLUMN?.type === 'DATETIME' ? 'date' : 'text'" :rawvalue="'2222-10-1x0'" v-bind="common_forces" :_debug_on="true"/> <br> -->
<br>

    
</form>


</div>



</template>

<style scoped>
.lookup {
    column-count: 3;
    border: 1px solid red;
}
.tested_forms_container {
    display: flex;
    flex-direction: row;
}
.tested_forms_container > * {
    flex-grow: 1;
}
</style>