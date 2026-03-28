<script setup>
//@ts-check

import { reactive, ref, computed, watch, toRef, watchEffect } from 'vue';
import { FA3_DaneKontaktowe, FA3_FA_Wiersz, FA3_Faktura } from './fa3';

import { decimal_add, decimal_mul, DecimalNumber } from '../Maths/decimal';

import { useMainSettings } from '../components/Settings/Settings';
import useMainMsgManager from '../components/Msg/MsgManager';
import ipc from '../ipc';

const props = defineProps({
    data: {
        /**@type {import('vue').PropType<FA3_Faktura>} */
        //@ts-ignore
        type: Object,
        required: true
    },
})

const msgManager = useMainMsgManager();

const settings = useMainSettings();

const fa3 = reactive(props.data);

console.log("RECEIVED FA3:", fa3);

//////////// Custrom FA3 controls ///////////////////////////

const Podmiot2_Nip_Checkbox = computed( {
    get()  { return !fa3.Podmiot2.DaneIdentyfikacyjne.NoID; },
    set(x) { fa3.Podmiot2.DaneIdentyfikacyjne.NoID = !x;    }
});

const Fa_Infos = computed({
    get(){
        return fa3.Stopka.Infos[0] ?? '';
    },
    set(x){
        if(x.trim().length == 0) fa3.Stopka.Infos = [];
        else                     fa3.Stopka.Infos = [x];
    }
});
// const Podmiot1_Kontakt = ref(fa3.Podmiot1.DaneKontaktowe[0] ?? new FA3_DaneKontaktowe());
// const Podmiot1_Kontakt = ref(fa3.Podmiot2.DaneKontaktowe[0] ?? new FA3_DaneKontaktowe());

const calculated_wiersze = computed(() => {
    const vat_percent = DecimalNumber.from("0.23");
    const res = fa3.Fa.Wiersze.map(row => {
        const ilosc            = DecimalNumber.from(row.Ilosc);
        const cena_jednostkowa = DecimalNumber.from(row.CenaJednostkowaNetto).rounded(8);
        const cena_all         = decimal_mul( ilosc,    cena_jednostkowa ).rounded(2);
        const cena_vat         = decimal_mul( cena_all, vat_percent      ).rounded(2);
        const cena_brutto      = decimal_add( cena_all, cena_vat         ).rounded(2);
        // const short_ilosc      = DecimalNumber.from(row.Ilosc).simplify_to(0);
        // const short_cena_all   = cena_all.copy().simplify_to(0);
        const bad_gtu          = row.GTU.match(/^(?:GTU_\d\d)?$/) === null;
        return {
            cena_all,
            cena_vat,
            cena_brutto,
            // short_ilosc,
            // short_cena_all,
            bad_gtu
        };
    });
    return res;
});

const all_good_gtu = computed(() => {
    return !calculated_wiersze.value.some(x => x.bad_gtu);
});


const calculated_summary = computed(() => {
    const total_netto  = DecimalNumber.from(0);
    const total_vat    = DecimalNumber.from(0);
    const total_brutto = DecimalNumber.from(0);
    for(const row of calculated_wiersze.value) {
        total_netto  .add( row.cena_all    );
        total_vat    .add( row.cena_vat    );
        total_brutto .add( row.cena_brutto );
    }
    return {
        total_netto,
        total_vat,
        total_brutto
    }
});


function finalize_fa3() {
    for(let i = 0; i<fa3.Fa.Wiersze.length; i++) {
        fa3.Fa.Wiersze[i].NrWierszaFa = (i+1).toString();
        fa3.Fa.Wiersze[i].TotalNetto  = calculated_wiersze.value[i].cena_all.as_string(2);
        // fa3.Fa.Wiersze[i].TotalNetto  = calculated_wiersze.value[i].short_cena_all.toString();
        // fa3.Fa.Wiersze[i].Ilosc       = calculated_wiersze.value[i].short_ilosc.toString();
    }
    fa3.Fa.suma_netto_22_23 = calculated_summary.value.total_netto .as_string(2);
    fa3.Fa.suma_tax_22_23   = calculated_summary.value.total_vat   .as_string(2);
    fa3.Fa.suma_brutto      = calculated_summary.value.total_brutto.as_string(2);
    console.log("FINALIZED FA3:", fa3);
}


////////////////////////////////////

async function generate_xml_file() {
    if(!all_good_gtu.value) {
        msgManager.postError("Niekture pola mają błędne GTU!");
        return;
    }
    finalize_fa3();
    const settings_ksef = settings.get_reactive_settings_raw('ksef');
    const path = settings_ksef.xml_file_path;
    const data = fa3.to_xml();

    try {
        await ipc.save_ksef_faktura(path, data);
        msgManager.post( "info", `Utworzono fakturę KSEF: '${path}'`, 10000 );
    } catch ( err ) {
        msgManager.postError("Błąd podczas generowanie faktury KSEF! " + err);
    }

}

function delete_wiersz(row_index) {
    fa3.Fa.Wiersze = fa3.Fa.Wiersze.filter((x,i) => i != row_index);
}
function add_wiersz() {
    const new_row = new FA3_FA_Wiersz();
    new_row.Nazwa = "";
    new_row.Miara = "szt.";
    new_row.Ilosc = "0";
    new_row.CenaJednostkowaNetto = "0";
    new_row.TotalNetto = "0";
    fa3.Fa.Wiersze.push(new_row);
}

const show_advanced = ref(false);

</script>


<template>

<div class="content">

    <div class="form">

        <fieldset class="maininfo">
            <legend>Główne Informacje</legend>

            <div class="field highlight">
                <label> Numer Faktury </label>
                <input type="text" v-model="fa3.Fa.NumerFaktury">
            </div>
            <div class="field">
                <label> Data Wystawienia Faktury </label>
                <input type="date" v-model="fa3.Fa.DataWystawienia">
            </div>
            <div class="field">
                <label> Data Sprzedaży / Wykonania usługi</label>
                <input type="date" v-model="fa3.Fa.DataSprzedazy">
            </div>
            <div class="field">
                <label> Miejsce Wystawienia </label>
                <input type="text" v-model="fa3.Fa.MiejsceWystawienia">
            </div>
        </fieldset>

        <fieldset class="sprzedawca addressgrid simplegrid">
            <legend>Sprzedawca</legend>
            
            <label> NIP                </label> <input type="text" v-model="fa3.Podmiot1.DaneIdentyfikacyjne.NIP">
            <label> Nazwa              </label> <input type="text" v-model="fa3.Podmiot1.DaneIdentyfikacyjne.Nazwa">
            <fieldset class="subaddress">
                <legend>Adres</legend>
                                      <input type="text" class="long"  v-model="fa3.Podmiot1.Adres.AdresL1">
                                      <input type="text"               v-model="fa3.Podmiot1.Adres.AdresL2">
                <label> Kraj </label> <input type="text" class="short" v-model="fa3.Podmiot1.Adres.KodKraju"> 
            </fieldset>
            <fieldset class="subaddress" :class="{collapsed: !fa3.Podmiot1.HasAdresKoresp}">
                <legend>Adres Koresp. <input type="checkbox" v-model="fa3.Podmiot1.HasAdresKoresp"> </legend>
                                      <input type="text" class="long"  v-model="fa3.Podmiot1.AdresKoresp.AdresL1">
                                      <input type="text"               v-model="fa3.Podmiot1.AdresKoresp.AdresL2">
                <label> Kraj </label> <input type="text" class="short" v-model="fa3.Podmiot1.AdresKoresp.KodKraju"> 
            </fieldset>
            <label> Email              </label> <input type="text" v-model="fa3.Podmiot1.DaneKontaktowe[0].Email">
            <label> Telefon            </label> <input type="text" v-model="fa3.Podmiot1.DaneKontaktowe[0].Telefon">
            
            <label> Numer Konta </label> <input type="text" v-model="fa3.Fa.Platnosc.RachunekBankowy.NrRB">
            <label> Nazwa Banku </label> <input type="text" v-model="fa3.Fa.Platnosc.RachunekBankowy.NazwaBanku">
        </fieldset>
        
        <fieldset class="nabywca addressgrid simplegrid" :class="{NoID: fa3.Podmiot2.DaneIdentyfikacyjne.NoID}" >
            <legend>Nabywca</legend>
            
            <label> NIP  <input type="checkbox" v-model="Podmiot2_Nip_Checkbox"> </label> 
                                                <input type="text" v-model="fa3.Podmiot2.DaneIdentyfikacyjne.NIP" class="ID">
                                                <input type="text" value="Brak" disabled class="NoID">
            <label> Nazwa              </label> <input type="text" v-model="fa3.Podmiot2.DaneIdentyfikacyjne.Nazwa">
            <fieldset class="subaddress">
                <legend>Adres</legend>
                                      <input type="text" class="long"  v-model="fa3.Podmiot2.Adres.AdresL1">
                                      <input type="text"               v-model="fa3.Podmiot2.Adres.AdresL2">
                <label> Kraj </label> <input type="text" class="short" v-model="fa3.Podmiot2.Adres.KodKraju"> 
            </fieldset>
            <fieldset class="subaddress" :class="{collapsed: !fa3.Podmiot2.HasAdresKoresp}">
                <legend>Adres Koresp. <input type="checkbox" v-model="fa3.Podmiot2.HasAdresKoresp"> </legend>
                                      <input type="text" class="long"  v-model="fa3.Podmiot2.AdresKoresp.AdresL1">
                                      <input type="text"               v-model="fa3.Podmiot2.AdresKoresp.AdresL2">
                <label> Kraj </label> <input type="text" class="short" v-model="fa3.Podmiot2.AdresKoresp.KodKraju"> 
            </fieldset>
            <!-- <label> Email              </label> <input type="text" v-model="fa3.Podmiot2.DaneKontaktowe[0].Email">
            <label> Telefon            </label> <input type="text" v-model="fa3.Podmiot2.DaneKontaktowe[0].Telefon"> -->
            
        </fieldset>
        <fieldset class="summarygrid">
            <legend>Podsumowanie</legend>
            <input type="text" class="long" v-model="Fa_Infos">
            <label> Suma Netto   </label> <div class="value"> {{calculated_summary.total_netto}}  {{ fa3.Fa.KodWaluty }}</div>
            <label> Suma Podatku </label> <div class="value"> {{calculated_summary.total_vat}}    {{ fa3.Fa.KodWaluty }}</div>
            <label> Suma Brutto  </label> <div class="value"> {{calculated_summary.total_brutto}} {{ fa3.Fa.KodWaluty }}</div>
        </fieldset>

        
        <fieldset class="sprzedaz simplegrid">
            <legend>Wiersze</legend>

            <div class="wiersze_grid">
                <div class="header">
                    <div></div> <!-- button -->
                    <div>Lp.</div>
                    <div>Nazwa</div>
                    <div>Miara</div>
                    <div>Ilosc</div>
                    <div>Cena Jednostkowa Netto</div>
                    <div>Cena Łączna Netto</div>
                    <div></div><!-- <div>Stawka Podatku</div> -->
                    <div>VAT</div>
                    <div>Brutto</div>
                    <div>GTU</div>
                </div>
                <div class="row" v-for="(row, row_index) in fa3.Fa.Wiersze">
                    <!-- <input type="text" class="minim"   v-model="row.NrWierszaFa" disabled> -->
                    <input type="button" class="del_btn" value="x" @click="delete_wiersz(row_index);">
                    <input type="text" class="minim"   :value="row_index+1" disabled>
                    <input type="text" class="fill"    v-model.lazy="row.Nazwa">
                    <input type="text" class="short r" v-model.lazy="row.Miara">
                    <input type="text" class="short r" v-model.lazy="row.Ilosc">
                    <input type="text" class="r"       v-model.lazy="row.CenaJednostkowaNetto">
                    <input type="text" class="r"       :value="calculated_wiersze[row_index].cena_all"    disabled >
                    <input type="text" class="minim r" v-model.lazy="row.StawkaPodatku"                   disabled >
                    <input type="text" class="r"       :value="calculated_wiersze[row_index].cena_vat"    disabled >
                    <input type="text" class="r"       :value="calculated_wiersze[row_index].cena_brutto" disabled >
                    <input type="text" class="l"       v-model.lazy="row.GTU" :class="{error: calculated_wiersze[row_index].bad_gtu}" >
                </div>
                <div class="row_full">
                    <input type="button" value="Dodaj wiersz" @click="add_wiersz();">
                </div>
                <div class="row_full error" :class="{hidden: all_good_gtu}">
                    Niekture pola nie mają ustawionego GTU. Ustaw je dla każdej z części. Należy to zrobić w okienku, gdzie dodaje się części
                    do zlecenia. Zmienienie GTU tutaj nie zapisze trwale tej zmiany!
                </div>
            </div>
        </fieldset>
        
        <input class="generuj_button" type="button" value="GENERUJ" @click="generate_xml_file()">
    </div>


    <fieldset :class="{collapsed: !show_advanced}" class="advanced" >
        <legend>Pokaż Opcje Zaawansowane <input type="checkbox" v-model="show_advanced"> </legend>
        
        <div class="field adv">
            <label> Kod Systemowy </label>
            <input type="text" v-model="fa3.Naglowek.KodFormularza.kodSystemowy">
        </div>
        <div class="field adv">
            <label> Wersja Schemy </label>
            <input type="text" v-model="fa3.Naglowek.KodFormularza.wersjaSchemy">
        </div>
        <div class="field adv">
            <label> Wariant Formularza </label>
            <input type="text" v-model="fa3.Naglowek.WariantFormularza">
        </div>
        <div class="field">
            <label> Data Wytworzenia Faktury </label>
            <input type="text" v-model="fa3.Naglowek.DataWytworzeniaFa">
        </div>
        <div class="field adv">
            <label> Kod Waluty  </label> 
            <input type="text" v-model="fa3.Fa.KodWaluty">
        </div>
    </fieldset>
</div>

</template>

<style scoped>

    fieldset.collapsed {
        padding-bottom: 0px;
        padding-top: 0px;
    }
    fieldset.collapsed > * {
        display: none;
    }
    fieldset.collapsed > legend {
        display: unset;
    }

    .error {
        color: red;
    }
    .hidden {
        display: none;
    }
    
    .form {
        display: grid;
        grid-template: auto / 1fr 1fr;
    }
    .form > .maininfo {
        grid-column: span 2;
    }
    .form > .sprzedawca {
        grid-row: span 2;
    }
    .form > .sprzedaz {
        grid-column: span 2;
        border-width: 3px;
        border-color: orange;
    }
    .form > * > legend {
        color: orange;
    }

    .maininfo {
        display: grid;
        grid-template-columns: auto auto auto auto;
        column-gap: 4ch;
    }
    .maininfo > .field {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        border-top:    1px solid black;
        border-bottom: 1px solid black;
        padding: 2px;
    }
    .maininfo > .field.highlight {
        background-color: rgb(212, 212, 212);
        font-weight: bold;
    }
    .maininfo > .field input { text-align: right; }
    .maininfo > .field label { text-align: center; }

    .addressgrid {
        display: grid;
        grid-template: auto / auto 1fr;
    }
    .addressgrid input {
        min-width: 2ch;
    }
    .addressgrid > .subaddress {
        grid-column: span 2;
        display: grid;
        grid-template: auto / 1fr auto auto;
    }
    .addressgrid > .subaddress > .long {
        grid-column: -1 / 1;
    }
    .addressgrid > .subaddress > .short {
        max-width: 3ch;
    }
    .addressgrid      .NoID { display: none;  }
    .addressgrid.NoID .NoID { display: block; }
    .addressgrid      .ID   { display: block; }
    .addressgrid.NoID .ID   { display: none;  }

    .simplegrid {
        display: grid;
        grid-template: auto / auto 1fr;
    }
    .simplegrid label {
        margin-left: 1ch;
        margin-right: 0.5ch;
    }

    .summarygrid {
        display: grid;
        grid-template: 1fr auto auto / auto auto auto;
        grid-auto-flow: column;
        column-gap: 3ch;
    }
    .summarygrid > .long {
        grid-column: 1 / -1;
    }
    .summarygrid > .value{
        font-family: monospace;
        text-align:  right;
        font-weight: bold;
        border-bottom: 1px solid blue;
        font-size: 1.2em;
    }

    .sprzedaz > .wiersze_grid {
        grid-column: 1 / -1;
        display: grid;
        grid-template: auto / min-content auto 1fr auto auto auto auto auto auto auto 8ch ;
    }
    .wiersze_grid > .header,
    .wiersze_grid > .row {
        display: contents;
    }
    .wiersze_grid > .row_full {
        grid-column: 1 / -1;
    }
    .wiersze_grid > .header {
        text-align: center;
    }
    .wiersze_grid > .row > input {
        min-width: 3ch;
    }
    .wiersze_grid > .row > input.fill {
        min-width: 40ch;
        width: 100%;
    }
    .wiersze_grid > .row > input.short {
        max-width: 6ch;
    }
    .wiersze_grid > .row > input.minim {
        max-width: 4ch;
    }
    .wiersze_grid > .row > input.r {
        font-family: monospace;
        text-align: right;
    }
    .wiersze_grid > .del_btn {
        width: 1ch;
        padding: 0px;
    }

    .generuj_button {
        height: 4ch;
        margin: 1ch;
        grid-column: 1 / span 2;
    }


</style>