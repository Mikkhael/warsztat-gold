<script setup>
//@ts-check

import { reactive, ref, computed, watch, toRef, watchEffect } from 'vue';
import { FA3_DaneKontaktowe, FA3_Faktura } from './fa3';

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

const Podmiot2_Nip_Checkbox = computed( {
    get()  { return !fa3.Podmiot2.DaneIdentyfikacyjne.NoID; },
    set(x) { fa3.Podmiot2.DaneIdentyfikacyjne.NoID = !x;    }
});
// const Podmiot1_Kontakt = ref(fa3.Podmiot1.DaneKontaktowe[0] ?? new FA3_DaneKontaktowe());
// const Podmiot1_Kontakt = ref(fa3.Podmiot2.DaneKontaktowe[0] ?? new FA3_DaneKontaktowe());

async function generate_xml_file() {
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

const show_advanced = ref(false);

</script>


<template>

<div class="content">

    
    <fieldset class="main_fieldset">
        <legend>Wyróżnione informacje</legend>
        <input type="button" value="GENERUJ" @click="generate_xml_file()">
        
        <div class="field">
            <label> Suma Netto </label>
            <input type="text" v-model="fa3.Fa.suma_netto_22_23" @change.lazy="tyy_update_single_wiersz">
        </div>
        <div class="field">
            <label> Suma Podatku </label>
            <input type="text" v-model="fa3.Fa.suma_tax_22_23">
        </div>
        <div class="field">
            <label> Suma Brutto </label>
            <input type="text" v-model="fa3.Fa.suma_brutto">
        </div>
        <!-- <div class="note full_row" v-if="is_faktura_simple">
            Poniważ faktura składa się z wyłącznie 1 pozycji z polami "ilość" równym "1" oraz "stawka podatku" równym "23", modyfikacja pola "Suma Netto" automatycznie ustawi odpowiednie pola ceny netto w sekcji "Wiersze"
        </div>
        <div class="note full_row warning" v-else>
            Poniważ faktura NIE składa się z wyłącznie 1 pozycji z polami "ilość" równym "1" oraz "stawka podatku" równym "23", modyfikacja pola "Suma Netto" wymaga również ręcznej modyfikacji wszystkich pozycji w sekcji "Weirsze" !
        </div> -->
    </fieldset>

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
        <fieldset>
            <legend>TEST</legend>
        </fieldset>

        
        <fieldset class="sprzedaz simplegrid">
            <legend>Sprzedaż</legend>

            <label> Kod Waluty          </label> <input type="text" v-model="fa3.Fa.KodWaluty">
            <label> Suma Netto          </label> <input type="text" v-model="fa3.Fa.suma_netto_22_23">
            <label> Suma Podatku        </label> <input type="text" v-model="fa3.Fa.suma_tax_22_23">
            <label> Suma Brutto         </label> <input type="text" v-model="fa3.Fa.suma_brutto">

            <div class="wiersze_grid">
                <div class="header">
                    <div>Lp.</div>
                    <div>Nazwa</div>
                    <div>Miara</div>
                    <div>Ilosc</div>
                    <div>Cena Jednostkowa Netto</div>
                    <div>Cena Łączna Netto</div>
                    <div></div><!-- <div>Stawka Podatku</div> -->
                    <div>VAT</div>
                    <div>Brutto</div>
                </div>
                <div class="row" v-for="(row, row_index) in fa3.Fa.Wiersze">
                    <!-- <input type="text" class="minim"   v-model="row.NrWierszaFa" disabled> -->
                    <input type="text" class="minim"   :value="row_index+1" disabled>
                    <input type="text" class="fill"    v-model="row.Nazwa">
                    <input type="text" class="short r" v-model="row.Miara">
                    <input type="text" class="short r" v-model="row.Ilosc">
                    <input type="text" class="r"       v-model="row.CenaJednostkowaNetto">
                    <input type="text" class="r"       v-model="row.TotalNetto">
                    <input type="text" class="minim r" v-model="row.StawkaPodatku" disabled>
                    <input type="text" class="r" value="123" disabled> <!-- TODO -->
                    <input type="text" class="r" value="123" disabled> <!-- TODO -->
                </div>
            </div>
        </fieldset>
        <fieldset>
            <legend>Pozostałe Informacje</legend>
            <div class="field" v-for="(value, index) in fa3.Stopka.Infos">
                <label> Linijka {{ index + 1 }} </label>
                <input type="text" v-model="fa3.Stopka.Infos[index]">
            </div>
        </fieldset>
    </div>
    
    <fieldset :class="{hidden: !show_advanced}" >
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

    
    .form {
        display: grid;
        grid-template: auto / auto auto;
    }
    .form > .maininfo {
        grid-column: span 2;
    }
    .form > .sprzedawca {
        grid-row: span 2;
    }
    .form > .sprzedaz {
        grid-column: span 2;
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
    .sprzedaz > .wiersze_grid {
        grid-column: 1 / -1;
        display: grid;
        grid-template: auto / auto 1fr auto auto auto auto auto auto auto ;
    }
    .wiersze_grid > .header,
    .wiersze_grid > .row {
        display: contents;
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



</style>