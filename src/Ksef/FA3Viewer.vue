<script setup>
//@ts-check

import { ref } from 'vue';
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

async function generate_xml_file() {
    const settings_ksef = settings.get_reactive_settings_raw('ksef');
    const path = settings_ksef.xml_file_path;
    const data = props.data.to_xml();

    try {
        await ipc.save_ksef_faktura(path, data);
        msgManager.post( "info", `Utworzono fakturę KSEF: '${path}'`, 5000 );
    } catch ( err ) {
        msgManager.postError("Błąd podczas generowanie faktury KSEF! " + err);
    }

}


</script>


<template>

<div>

    <input type="button" value="GENERUJ" @click="generate_xml_file()">

    <fieldset>
        <legend>Nagłówek</legend>
        <div class="field adv">
            <label> Kod Systemowy </label>
            <input type="text" v-model="data.Naglowek.KodFormularza.kodSystemowy">
        </div>
        <div class="field adv">
            <label> Wersja Schemy </label>
            <input type="text" v-model="data.Naglowek.KodFormularza.wersjaSchemy">
        </div>
        <div class="field adv">
            <label> Wariant Formularza </label>
            <input type="text" v-model="data.Naglowek.WariantFormularza">
        </div>
        <div class="field">
            <label> Data Wytworzenia Faktury </label>
            <input type="text" v-model="data.Naglowek.DataWytworzeniaFa">
        </div>
    </fieldset>
    
    <fieldset>
        <legend>Sprzedawca</legend>
        <div class="field">
            <label> NIP </label>
            <input type="text" v-model="data.Podmiot1.DaneIdentyfikacyjne.NIP">
        </div>
        <div class="field">
            <label> Nazwa </label>
            <input type="text" v-model="data.Podmiot1.DaneIdentyfikacyjne.Nazwa">
        </div>
        <fieldset>
            <legend>Adres</legend>
            <div class="field">
                <label> Kod Kraju </label>
                <input type="text" v-model="data.Podmiot1.Adres.KodKraju">
            </div>
            <div class="field">
                <label> Linijka 1 </label>
                <input type="text" v-model="data.Podmiot1.Adres.AdresL1">
            </div>
            <div class="field">
                <label> Linijka 2 </label>
                <input type="text" v-model="data.Podmiot1.Adres.AdresL2">
            </div>
        </fieldset>
        <!-- TODO adres koresp switch -->
        <fieldset> 
            <legend>Adres Korespondencyjny</legend>
            <div class="field">
                <label> Kod Kraju </label>
                <input type="text" v-model="data.Podmiot1.AdresKoresp.KodKraju">
            </div>
            <div class="field">
                <label> Linijka 1 </label>
                <input type="text" v-model="data.Podmiot1.AdresKoresp.AdresL1">
            </div>
            <div class="field">
                <label> Linijka 2 </label>
                <input type="text" v-model="data.Podmiot1.AdresKoresp.AdresL2">
            </div>
        </fieldset>
        <fieldset v-for="(value, index) in data.Podmiot1.DaneKontaktowe">
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
        <!-- TODO has NIP -->
        <div class="field">
            <label> NIP </label>
            <input type="text" v-model="data.Podmiot2.DaneIdentyfikacyjne.NIP">
        </div>
        <div class="field">
            <label> Nazwa </label>
            <input type="text" v-model="data.Podmiot2.DaneIdentyfikacyjne.Nazwa">
        </div>
        <!-- TODO has adres -->
        <fieldset>
            <legend>Adres</legend>
            <div class="field">
                <label> Kod Kraju </label>
                <input type="text" v-model="data.Podmiot2.Adres.KodKraju">
            </div>
            <div class="field">
                <label> Linijka 1 </label>
                <input type="text" v-model="data.Podmiot2.Adres.AdresL1">
            </div>
            <div class="field">
                <label> Linijka 2 </label>
                <input type="text" v-model="data.Podmiot2.Adres.AdresL2">
            </div>
        </fieldset>
        <!-- TODO adres koresp switch -->
        <fieldset> 
            <legend>Adres Korespondencyjny</legend>
            <div class="field">
                <label> Kod Kraju </label>
                <input type="text" v-model="data.Podmiot2.AdresKoresp.KodKraju">
            </div>
            <div class="field">
                <label> Linijka 1 </label>
                <input type="text" v-model="data.Podmiot2.AdresKoresp.AdresL1">
            </div>
            <div class="field">
                <label> Linijka 2 </label>
                <input type="text" v-model="data.Podmiot2.AdresKoresp.AdresL2">
            </div>
        </fieldset>
        <fieldset v-for="(value, index) in data.Podmiot2.DaneKontaktowe">
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
            <input type="text" v-model="data.Fa.KodWaluty">
        </div>
        <div class="field">
            <label> Data Wystawienia </label>
            <input type="text" v-model="data.Fa.DataWystawienia">
            <!-- TODO data input field? -->
        </div>
        <div class="field">
            <label> Miejsce Wystawienia </label>
            <input type="text" v-model="data.Fa.MiejsceWystawienia">
        </div>
        <div class="field">
            <label> Numer Faktury </label>
            <input type="text" v-model="data.Fa.NumerFaktury">
        </div>
        <div class="field">
            <label> Data Sprzedaży </label>
            <input type="text" v-model="data.Fa.DataSprzedazy">
        </div>
        <div class="field">
            <label> Suma Netto </label>
            <input type="text" v-model="data.Fa.suma_netto_22_23">
        </div>
        <div class="field">
            <label> Suma Podatku </label>
            <input type="text" v-model="data.Fa.suma_tax_22_23">
        </div>
        <div class="field">
            <label> Suma Brutto </label>
            <input type="text" v-model="data.Fa.suma_brutto">
        </div>
        <fieldset>
            <legend>Wiersze</legend>
            <table>
                <tr>
                    <th>Lp.</th>
                    <th>Nazwa</th>
                    <th>Miara</th>
                    <th>Ilosc</th>
                    <th>Cena Jednostkowa Netto</th>
                    <th>Cena Łączna Netto</th>
                    <th>Stawka Podatku</th>
                </tr>
                <tr v-for="(row, row_index) in data.Fa.Wiersze">
                    <td><input type="text" v-model="row.NrWierszaFa"></td>
                    <td><input type="text" v-model="row.Nazwa"></td>
                    <td><input type="text" v-model="row.Miara"></td>
                    <td><input type="text" v-model="row.Ilosc"></td>
                    <td><input type="text" v-model="row.CenaJednostkowaNetto"></td>
                    <td><input type="text" v-model="row.TotalNetto"></td>
                    <td><input type="text" v-model="row.StawkaPodatku"></td>
                </tr>
            </table>
        </fieldset>
        <fieldset>
            <legend>Płatność - Rachunek Bankowy</legend>
            <div class="field">
                <label> Numer Konta </label>
                <input type="text" v-model="data.Fa.Platnosc.RachunekBankowy.NrRB">
            </div>
            <div class="field">
                <label> Nazwa Banku </label>
                <input type="text" v-model="data.Fa.Platnosc.RachunekBankowy.NazwaBanku">
            </div>
        </fieldset>
    </fieldset>

    <fieldset>
        <legend>Pozostałe Informacje</legend>
        <div class="field" v-for="(value, index) in data.Stopka.Infos">
            <label> Linijka {{ index + 1 }} </label>
            <input type="text" v-model="data.Stopka.Infos[index]">
        </div>
    </fieldset>
    
</div>

</template>

<style scoped>

    fieldset {
        display: grid;
        grid-template-columns: max-content 1fr;
        grid-column: 1 / -1;
    }

    .field {
        display: contents;
    }
    .field > label {
        padding-left:  3px;
        padding-right: 3px;
    }

</style>