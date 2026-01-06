<script setup>
//@ts-check

import { reactive, ref, computed } from 'vue';
import { FA3_Faktura } from './fa3';

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
const is_faktura_simple = computed(() => {
    if(fa3.Fa.Wiersze.length !== 1) return false;
    if(fa3.Fa.Wiersze[0].Ilosc !== "1") return false;
    if(fa3.Fa.Wiersze[0].StawkaPodatku !== "23") return false;
    return true;
})

function tyy_update_single_wiersz() {
    if(!is_faktura_simple.value) return;
    fa3.Fa.Wiersze[0].CenaJednostkowaNetto = fa3.Fa.suma_netto_22_23;
    fa3.Fa.Wiersze[0].TotalNetto           = fa3.Fa.suma_netto_22_23;
}

</script>


<template>

<div>

    
    <fieldset class="main_fieldset">
        <legend>Wyróżnione informacje</legend>
        <input type="button" value="GENERUJ" @click="generate_xml_file()">
        <div class="field">
            <label> Numer Faktury </label>
            <input type="text" v-model="fa3.Fa.NumerFaktury">
        </div>
        <div class="field">
            <label> Data Wystawienia Faktury </label>
            <input type="text" v-model="fa3.Fa.DataWystawienia">
        </div>
        <div class="field">
            <label> Data Sprzedaży / Wykonania usługi</label>
            <input type="text" v-model="fa3.Fa.DataSprzedazy">
        </div>
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
        <div class="note full_row" v-if="is_faktura_simple">
            Poniważ faktura składa się z wyłącznie 1 pozycji z polami "ilość" równym "1" oraz "stawka podatku" równym "23", modyfikacja pola "Suma Netto" automatycznie ustawi odpowiednie pola ceny netto w sekcji "Wiersze"
        </div>
        <div class="note full_row warning" v-else>
            Poniważ faktura NIE składa się z wyłącznie 1 pozycji z polami "ilość" równym "1" oraz "stawka podatku" równym "23", modyfikacja pola "Suma Netto" wymaga również ręcznej modyfikacji wszystkich pozycji w sekcji "Weirsze" !
        </div>
    </fieldset>

    <fieldset>
        <legend>Sprzedawca</legend>
        <div class="field">
            <label> NIP </label>
            <input type="text" v-model="fa3.Podmiot1.DaneIdentyfikacyjne.NIP">
        </div>
        <div class="field">
            <label> Nazwa </label>
            <input type="text" v-model="fa3.Podmiot1.DaneIdentyfikacyjne.Nazwa">
        </div>
        <fieldset>
            <legend>Adres</legend>
            <div class="field">
                <label> Kod Kraju </label>
                <input type="text" v-model="fa3.Podmiot1.Adres.KodKraju">
            </div>
            <div class="field">
                <label> Linijka 1 </label>
                <input type="text" v-model="fa3.Podmiot1.Adres.AdresL1">
            </div>
            <div class="field">
                <label> Linijka 2 </label>
                <input type="text" v-model="fa3.Podmiot1.Adres.AdresL2">
            </div>
        </fieldset>
        <fieldset :class="{hidden: !fa3.Podmiot1.HasAdresKoresp}"> 
            <legend>Adres Korespondencyjny <input type="checkbox" v-model="fa3.Podmiot1.HasAdresKoresp"> </legend>
            <div class="field">
                <label> Kod Kraju </label>
                <input type="text" v-model="fa3.Podmiot1.AdresKoresp.KodKraju">
            </div>
            <div class="field">
                <label> Linijka 1 </label>
                <input type="text" v-model="fa3.Podmiot1.AdresKoresp.AdresL1">
            </div>
            <div class="field">
                <label> Linijka 2 </label>
                <input type="text" v-model="fa3.Podmiot1.AdresKoresp.AdresL2">
            </div>
        </fieldset>
        <fieldset v-for="(value, index) in fa3.Podmiot1.DaneKontaktowe">
            <legend> Dane Kontaktowe {{ index + 1 }} </legend>
            <div class="field">
                <label> Email </label>
                <input type="text" v-model="value.Email">
            </div>
            <div class="field">
                <label> Telefon </label>
                <input type="text" v-model="value.Telefon">
            </div>
        </fieldset>
    </fieldset>

    
    <fieldset>
        <legend>Nabywca</legend>
        <div class="field">
            <label> Brak numeru NIP </label>
            <input type="checkbox" v-model="fa3.Podmiot2.DaneIdentyfikacyjne.NoID">
        </div>
        <div class="field">
            <label> NIP </label>
            <input type="text" v-model="fa3.Podmiot2.DaneIdentyfikacyjne.NIP" :disabled="fa3.Podmiot2.DaneIdentyfikacyjne.NoID">
        </div>
        <div class="field">
            <label> Nazwa </label>
            <input type="text" v-model="fa3.Podmiot2.DaneIdentyfikacyjne.Nazwa">
        </div>
        <fieldset :class="{hidden: !fa3.Podmiot2.HasAdres}" > 
            <legend>Adres <input type="checkbox" v-model="fa3.Podmiot2.HasAdres"></legend>
            <div class="field">
                <label> Kod Kraju </label>
                <input type="text" v-model="fa3.Podmiot2.Adres.KodKraju">
            </div>
            <div class="field">
                <label> Linijka 1 </label>
                <input type="text" v-model="fa3.Podmiot2.Adres.AdresL1">
            </div>
            <div class="field">
                <label> Linijka 2 </label>
                <input type="text" v-model="fa3.Podmiot2.Adres.AdresL2">
            </div>
        </fieldset>
        <fieldset :class="{hidden: !fa3.Podmiot2.HasAdresKoresp}" > 
            <legend>Adres Korespondencyjny <input type="checkbox" v-model="fa3.Podmiot2.HasAdresKoresp"></legend>
            <div class="field">
                <label> Kod Kraju </label>
                <input type="text" v-model="fa3.Podmiot2.AdresKoresp.KodKraju">
            </div>
            <div class="field">
                <label> Linijka 1 </label>
                <input type="text" v-model="fa3.Podmiot2.AdresKoresp.AdresL1">
            </div>
            <div class="field">
                <label> Linijka 2 </label>
                <input type="text" v-model="fa3.Podmiot2.AdresKoresp.AdresL2">
            </div>
        </fieldset>
        <fieldset v-for="(value, index) in fa3.Podmiot2.DaneKontaktowe">
            <legend> Dane Kontaktowe {{ index + 1 }} </legend>
            <div class="field">
                <label> Email </label>
                <input type="text" v-model="value.Email">
            </div>
            <div class="field">
                <label> Telefon </label>
                <input type="text" v-model="value.Telefon">
            </div>
        </fieldset>
    </fieldset>
    
    <fieldset>
        <legend>Sprzedaż</legend>
        <div class="field">
            <label> Kod Waluty </label>
            <input type="text" v-model="fa3.Fa.KodWaluty">
        </div>
        <div class="field">
            <label> Data Wystawienia </label>
            <input type="text" v-model="fa3.Fa.DataWystawienia">
        </div>
        <div class="field">
            <label> Miejsce Wystawienia </label>
            <input type="text" v-model="fa3.Fa.MiejsceWystawienia">
        </div>
        <div class="field">
            <label> Numer Faktury </label>
            <input type="text" v-model="fa3.Fa.NumerFaktury">
        </div>
        <div class="field">
            <label> Data Sprzedaży </label>
            <input type="text" v-model="fa3.Fa.DataSprzedazy">
        </div>
        <div class="field">
            <label> Suma Netto </label>
            <input type="text" v-model="fa3.Fa.suma_netto_22_23">
        </div>
        <div class="field">
            <label> Suma Podatku </label>
            <input type="text" v-model="fa3.Fa.suma_tax_22_23">
        </div>
        <div class="field">
            <label> Suma Brutto </label>
            <input type="text" v-model="fa3.Fa.suma_brutto">
        </div>
        <fieldset>
            <legend>Wiersze</legend>
            <div class="wiersze_grid">
                <div class="header">
                    <div>Lp.</div>
                    <div>Nazwa</div>
                    <div>Miara</div>
                    <div>Ilosc</div>
                    <div>Cena Jednostkowa Netto</div>
                    <div>Cena Łączna Netto</div>
                    <div>Stawka Podatku</div>
                </div>
                <div class="row" v-for="(row, row_index) in fa3.Fa.Wiersze">
                    <input type="text" v-model="row.NrWierszaFa">
                    <input type="text" class="fill" v-model="row.Nazwa">
                    <input type="text" v-model="row.Miara">
                    <input type="text" v-model="row.Ilosc">
                    <input type="text" v-model="row.CenaJednostkowaNetto">
                    <input type="text" v-model="row.TotalNetto">
                    <input type="text" v-model="row.StawkaPodatku" disabled>
                </div>
            </div>
        </fieldset>
        <fieldset>
            <legend>Płatność - Rachunek Bankowy</legend>
            <div class="field">
                <label> Numer Konta </label>
                <input type="text" v-model="fa3.Fa.Platnosc.RachunekBankowy.NrRB">
            </div>
            <div class="field">
                <label> Nazwa Banku </label>
                <input type="text" v-model="fa3.Fa.Platnosc.RachunekBankowy.NazwaBanku">
            </div>
        </fieldset>
    </fieldset>

    <fieldset>
        <legend>Pozostałe Informacje</legend>
        <div class="field" v-for="(value, index) in fa3.Stopka.Infos">
            <label> Linijka {{ index + 1 }} </label>
            <input type="text" v-model="fa3.Stopka.Infos[index]">
        </div>
    </fieldset>
    
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

    fieldset.hidden > div,
    fieldset.hidden > fieldset {
        display: none;
    }

    .full_row {
        grid-column: 1 / -1;
    }

    .note {
        font-size: 0.8em;
    }

    .warning {
        color: red;
    }

    fieldset {
        display: grid;
        grid-template-columns: max-content 1fr;
        grid-column: 1 / -1;
    }

    .main_fieldset {
        font-size: 1.1em;
        background-color: #fef3ca;
    }
    .main_fieldset input[type="button"] {
        grid-column: 1 / -1;
        font-size: 1.5em;
        background-color: #c6e6c4;
    }

    .field {
        display: contents;
    }
    .field > label {
        padding-left:  3px;
        padding-right: 3px;
    }
    .field > input[type="checkbox"] {
        justify-self: left;
    }

    .wiersze_grid {
        display: grid;
        grid-template-columns: auto 1fr auto auto auto auto auto;
        grid-column: 1 / -1;
    }
    .wiersze_grid > .header {
        font-weight: bold;
    }
    .wiersze_grid input {
        min-width: 5ch;
    }
    .wiersze_grid input.fill {
        min-width: unset;
    }

    .wiersze_grid > .header,
    .wiersze_grid > .row {
        display: contents;
    }


</style>