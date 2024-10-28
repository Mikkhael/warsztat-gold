import {DatabaseNode, TableNode, Column} from '../components/Dataset';
/**@type {DatabaseNode & {tabs: {
    "CENNIK__GM": TableNode & {cols: {
        "ID_cennin_GM": Column,
        "CATALOG_NO": Column,
        "DESC_GER1": Column,
        "DESC_GER2": Column,
        "PRICE": Column,
    }},
    "czynność": TableNode & {cols: {
        "ID_cynności": Column,
        "czynność": Column,
    }},
    "dane_do_zaświadczenie_o_sprawności_inst": TableNode & {cols: {
        "ID_typów": Column,
        "Producent": Column,
        "Typ/Nr": Column,
        "E-_": Column,
        "67R-_": Column,
        "Ważność_legalizacji_zbiornika_do": Column,
        "ID_obrotów_mag": Column,
    }},
    "dokumenty_sprzedaży": TableNode & {cols: {
        "ID_dokumentu": Column,
        "nazwa_dokumentu": Column,
        "nr_dokumentu": Column,
        "ID_zlecenia": Column,
        "data_wystawienia": Column,
    }},
    "dokumenty_sprzedaży_chwilówk": TableNode & {cols: {
        "nazwa_dokumentu": Column,
        "nr_dokumentu": Column,
        "ID_zlecenia": Column,
        "data_wystawienia": Column,
    }},
    "dostawcy": TableNode & {cols: {
        "ID_dostawcy_-_producenta": Column,
        "Nazwa": Column,
        "kod_pocztowy": Column,
        "miejscowość": Column,
        "ulica_nr_domu": Column,
        "tel_1": Column,
        "tel_2": Column,
        "fax": Column,
        "konto_bank": Column,
        "nr_konta": Column,
        "przedstawiciel": Column,
        "@-maill": Column,
        "NIP": Column,
        "otrzymany_rabat_%": Column,
    }},
    "faktura_szczegóły_chwilówka": TableNode & {cols: {
        "nazwa_części_lub_czynności": Column,
        "jednostka": Column,
        "ilość": Column,
        "cena_netto": Column,
        "numer": Column,
    }},
    "inwentaryzacja": TableNode & {cols: {
        "numer_cz": Column,
        "ilość": Column,
        "data_zapisu": Column,
        "rodzaj_dokumentu": Column,
        "numer_dokumentu": Column,
    }},
    "inwentaryzacja_nr_3": TableNode & {cols: {
        "numer_cz": Column,
        "ilość": Column,
        "data_zapisu": Column,
        "rodzaj_dokumentu": Column,
        "numer_dokumentu": Column,
    }},
    "jamar": TableNode & {cols: {
        "nazwa_części_lub_czynności": Column,
        "jednostka": Column,
        "ilość": Column,
        "cena_netto": Column,
        "numer": Column,
    }},
    "klienci": TableNode & {cols: {
        "ID": Column,
        "NAZWA": Column,
        "MIASTO": Column,
        "ULICA": Column,
        "KOD_POCZT": Column,
        "TELEFON1": Column,
        "TELEFON2": Column,
        "NIP": Column,
        "KTO": Column,
        "KIEDY": Column,
        "UPUST": Column,
        "odbierający_fakturę": Column,
        "list": Column,
    }},
    "liczby_słownie": TableNode & {cols: {
        "liczba": Column,
        "słownie": Column,
    }},
    "modele_sam": TableNode & {cols: {
        "ID_modelu": Column,
        "Model:": Column,
        "Typ:": Column,
        "Nadw:": Column,
        "Rok_produkcji:": Column,
        "Silnik:": Column,
        "Kod:": Column,
    }},
    "nazwy_części": TableNode & {cols: {
        "numer_części": Column,
        "nazwa_części": Column,
        "jednostka": Column,
        "grupa": Column,
        "VAT": Column,
        "ilość_w_opakowaniu_zbiorczym": Column,
        "lokalizacja_w_magazynie": Column,
        "odpowiedniki": Column,
    }},
    "obroty_magazynowe": TableNode & {cols: {
        "ID": Column,
        "numer_cz": Column,
        "ilość": Column,
        "cena_netto": Column,
        "data_przyjęcia": Column,
        "rodzaj_dokumentu": Column,
        "numer_dokumentu": Column,
        "cena_netto_sprzedaży": Column,
    }},
    "płace": TableNode & {cols: {
        "ID_płac": Column,
        "ID_pracownika": Column,
        "data": Column,
        "kwota": Column,
        "podstawa": Column,
        "miesiąc_płacenia": Column,
    }},
    "pracownicy": TableNode & {cols: {
        "ID_pracownika": Column,
        "nazwisko": Column,
        "imię": Column,
        "inię_II": Column,
        "nazwisko_rodowe": Column,
        "imię_ojca": Column,
        "imię_matki": Column,
        "nazwisko_rodowe_matki": Column,
        "data_urodzenia": Column,
        "miejsce_urodzenia": Column,
        "obywatelstwo": Column,
        "nr_PESEL": Column,
        "nr_NIP": Column,
        "ul_i_nr_domu": Column,
        "kod": Column,
        "miejscowość": Column,
        "tel_domowy": Column,
        "wykształcenie": Column,
        "wykształcenie_uzupełniające": Column,
        "dodatkowe_uprawnienia": Column,
        "stanowisko": Column,
    }},
    "przyjęcia_PZ": TableNode & {cols: {
        "numer_cz": Column,
        "ilość": Column,
        "cena_netto": Column,
        "data_przyjęcia": Column,
        "rodzaj_dokumentu": Column,
        "numer_dokumentu": Column,
    }},
    "rodzaje_dokumentów": TableNode & {cols: {
        "rodzaj_dokumentu": Column,
    }},
    "samochody_klientów": TableNode & {cols: {
        "ID": Column,
        "kalkulacja": Column,
        "marka": Column,
        "model": Column,
        "nr_rej": Column,
        "ID_klienta": Column,
        "nr_silnika": Column,
        "nr_nadwozia": Column,
    }},
    "sposób_zapłaty": TableNode & {cols: {
        "sposób_zapłaty": Column,
    }},
    "sprzedaż": TableNode & {cols: {
        "numer_cz": Column,
        "ilość": Column,
        "cena_netto_sprzedaży": Column,
        "cena_netto": Column,
        "rodzaj_dokumentu": Column,
        "numer_dokumentu": Column,
        "data_przyjęcia": Column,
    }},
    "zamówienia_części": TableNode & {cols: {
        "numer_części": Column,
        "ilość": Column,
        "data_zamówienia": Column,
        "uwagi_/_przeznaczenie": Column,
    }},
    "zamówienia_części_archiwum": TableNode & {cols: {
        "numer_części": Column,
        "ilość": Column,
        "data_zamówienia": Column,
        "data_realizacji": Column,
        "uwagi_/_przeznaczenie": Column,
        "zlealizowane": Column,
    }},
    "zlecenia_czynności": TableNode & {cols: {
        "ID_zlecenia": Column,
        "ID_czynności": Column,
        "krotność_wykonania": Column,
        "cena_netto": Column,
    }},
    "zlecenia_gaz": TableNode & {cols: {
        "ID_zlecenia": Column,
        "ID_czynności": Column,
        "krotność_wykonania": Column,
        "cena_netto": Column,
    }},
    "zlecenia_instalacji_gazowej": TableNode & {cols: {
        "ID": Column,
        "ID_klienta": Column,
        "ID_samochodu": Column,
        "data_otwarcia": Column,
        "data_zamknięcia": Column,
        "zysk_z_części": Column,
        "zysk_z_robocizny": Column,
        "mechanik_prowadzący": Column,
        "%_udziału": Column,
        "pomocnik_1": Column,
        "%_udziału_p1": Column,
        "pomocnik_2": Column,
        "%_udziału_p2": Column,
        "zgłoszone_naprawy": Column,
        "uwagi_o_naprawie": Column,
    }},
    "zlecenia_naprawy": TableNode & {cols: {
        "ID": Column,
        "ID_klienta": Column,
        "ID_samochodu": Column,
        "data_otwarcia": Column,
        "data_zamknięcia": Column,
        "zysk_z_części": Column,
        "zysk_z_robocizny": Column,
        "mechanik_prowadzący": Column,
        "%_udziału": Column,
        "pomocnik_1": Column,
        "%_udziału_p1": Column,
        "pomocnik_2": Column,
        "%_udziału_p2": Column,
        "zgłoszone_naprawy": Column,
        "uwagi_o_naprawie": Column,
    }},
}}}*/
const DB = new DatabaseNode([
    {name: "CENNIK  GM", cols: [
        {"name":"ID cennin GM","type":"INTEGER","attr":"pan"},
        {"name":"CATALOG_NO","type":"VARCHAR","targ":"7","attr":"nq"},
        {"name":"DESC_GER1","type":"VARCHAR","targ":"10","attr":""},
        {"name":"DESC_GER2","type":"VARCHAR","targ":"10","attr":""},
        {"name":"PRICE","type":"DOUBLE","attr":""},
    ]},
    {name: "czynność", cols: [
        {"name":"ID cynności","type":"INTEGER","attr":"pan"},
        {"name":"czynność","type":"VARCHAR","targ":"50","attr":"nq"},
    ]},
    {name: "dane do zaświadczenie o sprawności inst", cols: [
        {"name":"ID typów","type":"INTEGER","attr":"pan"},
        {"name":"Producent","type":"VARCHAR","targ":"15","attr":""},
        {"name":"Typ/Nr","type":"VARCHAR","targ":"15","attr":"n"},
        {"name":"E-_","type":"TINYINT","targ":"3","def":"0","attr":"un"},
        {"name":"67R-_","type":"VARCHAR","targ":"15","attr":"n"},
        {"name":"Ważność legalizacji zbiornika do","type":"DATETIME","attr":""},
        {"name":"ID obrotów mag","type":"INTEGER","def":"0","attr":"n"},
    ]},
    {name: "dokumenty sprzedaży", cols: [
        {"name":"ID dokumentu","type":"INTEGER","attr":"pan"},
        {"name":"nazwa dokumentu","type":"VARCHAR","targ":"50","attr":"n"},
        {"name":"nr dokumentu","type":"VARCHAR","targ":"15","attr":"nq"},
        {"name":"ID zlecenia","type":"INTEGER","def":"0","attr":"n"},
        {"name":"data wystawienia","type":"TIMESTAMP","def":"CURRENT_TIMESTAMP","attr":""},
    ]},
    {name: "dokumenty sprzedaży chwilówk", cols: [
        {"name":"nazwa dokumentu","type":"VARCHAR","targ":"50","attr":"n"},
        {"name":"nr dokumentu","type":"VARCHAR","targ":"15","attr":"nq"},
        {"name":"ID zlecenia","type":"INTEGER","def":"0","attr":"n"},
        {"name":"data wystawienia","type":"TIMESTAMP","def":"CURRENT_TIMESTAMP","attr":""},
    ]},
    {name: "dostawcy", cols: [
        {"name":"ID dostawcy - producenta","type":"INTEGER","attr":"pan"},
        {"name":"Nazwa","type":"VARCHAR","targ":"50","attr":"nq"},
        {"name":"kod pocztowy","type":"VARCHAR","targ":"6","attr":"n"},
        {"name":"miejscowość","type":"VARCHAR","targ":"20","attr":"n"},
        {"name":"ulica nr domu","type":"VARCHAR","targ":"30","attr":""},
        {"name":"tel 1","type":"VARCHAR","targ":"15","attr":""},
        {"name":"tel 2","type":"VARCHAR","targ":"15","attr":""},
        {"name":"fax","type":"VARCHAR","targ":"15","attr":""},
        {"name":"konto bank","type":"VARCHAR","targ":"50","attr":""},
        {"name":"nr konta","type":"VARCHAR","targ":"50","attr":""},
        {"name":"przedstawiciel","type":"VARCHAR","targ":"50","attr":""},
        {"name":"@-maill","type":"VARCHAR","targ":"30","attr":"q"},
        {"name":"NIP","type":"VARCHAR","targ":"14","attr":""},
        {"name":"otrzymany rabat %","type":"TINYINT","targ":"3","def":"0","attr":"un"},
    ]},
    {name: "faktura szczegóły chwilówka", cols: [
        {"name":"nazwa części lub czynności","type":"VARCHAR","targ":"50","attr":""},
        {"name":"jednostka","type":"VARCHAR","targ":"5","attr":""},
        {"name":"ilość","type":"FLOAT","def":"0","attr":""},
        {"name":"cena netto","type":"DECIMAL","targ":"19,4","def":"0","attr":""},
        {"name":"numer","type":"VARCHAR","targ":"10","attr":""},
    ]},
    {name: "inwentaryzacja", cols: [
        {"name":"numer cz","type":"VARCHAR","targ":"15","attr":"n"},
        {"name":"ilość","type":"DOUBLE","attr":""},
        {"name":"data zapisu","type":"TIMESTAMP","def":"CURRENT_TIMESTAMP","attr":"n"},
        {"name":"rodzaj dokumentu","type":"VARCHAR","targ":"5","def":"'inwen'","attr":"n"},
        {"name":"numer dokumentu","type":"INTEGER","def":"4","attr":""},
    ]},
    {name: "inwentaryzacja nr 3", cols: [
        {"name":"numer cz","type":"VARCHAR","targ":"15","attr":"n"},
        {"name":"ilość","type":"DOUBLE","attr":""},
        {"name":"data zapisu","type":"TIMESTAMP","def":"CURRENT_TIMESTAMP","attr":"n"},
        {"name":"rodzaj dokumentu","type":"VARCHAR","targ":"5","def":"'inwen'","attr":"n"},
        {"name":"numer dokumentu","type":"INTEGER","def":"3","attr":""},
    ]},
    {name: "jamar", cols: [
        {"name":"nazwa części lub czynności","type":"VARCHAR","targ":"50","attr":""},
        {"name":"jednostka","type":"VARCHAR","targ":"5","attr":""},
        {"name":"ilość","type":"FLOAT","def":"0","attr":""},
        {"name":"cena netto","type":"DECIMAL","targ":"19,4","def":"0","attr":""},
        {"name":"numer","type":"VARCHAR","targ":"10","attr":""},
    ]},
    {name: "klienci", cols: [
        {"name":"ID","type":"INTEGER","attr":"pan"},
        {"name":"NAZWA","type":"VARCHAR","targ":"60","attr":"nq"},
        {"name":"MIASTO","type":"VARCHAR","targ":"20","attr":"n"},
        {"name":"ULICA","type":"VARCHAR","targ":"30","attr":"n"},
        {"name":"KOD_POCZT","type":"VARCHAR","targ":"10","attr":"n"},
        {"name":"TELEFON1","type":"VARCHAR","targ":"17","attr":""},
        {"name":"TELEFON2","type":"VARCHAR","targ":"17","attr":""},
        {"name":"NIP","type":"VARCHAR","targ":"13","attr":"q"},
        {"name":"KTO","type":"VARCHAR","targ":"8","attr":""},
        {"name":"KIEDY","type":"TIMESTAMP","def":"CURRENT_TIMESTAMP","attr":""},
        {"name":"UPUST","type":"TINYINT","targ":"3","def":"0","attr":"u"},
        {"name":"odbierający fakturę","type":"VARCHAR","targ":"50","attr":""},
        {"name":"list","type":"TINYINT","targ":"1","attr":""},
    ]},
    {name: "liczby słownie", cols: [
        {"name":"liczba","type":"DOUBLE","attr":"pn"},
        {"name":"słownie","type":"VARCHAR","targ":"100","attr":"nq"},
    ]},
    {name: "modele sam", cols: [
        {"name":"ID modelu","type":"INTEGER","attr":"pan"},
        {"name":"Model:","type":"VARCHAR","targ":"15","attr":""},
        {"name":"Typ:","type":"VARCHAR","targ":"15","attr":"q"},
        {"name":"Nadw:","type":"VARCHAR","targ":"7","attr":""},
        {"name":"Rok produkcji:","type":"VARCHAR","targ":"7","attr":""},
        {"name":"Silnik:","type":"VARCHAR","targ":"10","attr":""},
        {"name":"Kod:","type":"VARCHAR","targ":"15","attr":""},
    ]},
    {name: "nazwy części", cols: [
        {"name":"numer części","type":"VARCHAR","targ":"15","attr":"pnq"},
        {"name":"nazwa części","type":"VARCHAR","targ":"255","attr":""},
        {"name":"jednostka","type":"VARCHAR","targ":"50","def":"'szt.'","attr":""},
        {"name":"grupa","type":"FLOAT","def":"0","attr":""},
        {"name":"VAT","type":"FLOAT","def":".22","attr":""},
        {"name":"ilość w opakowaniu zbiorczym","type":"TINYINT","targ":"3","def":"0","attr":"u"},
        {"name":"lokalizacja w magazynie","type":"VARCHAR","targ":"10","attr":""},
        {"name":"odpowiedniki","type":"VARCHAR","targ":"50","attr":""},
    ]},
    {name: "obroty magazynowe", cols: [
        {"name":"ID","type":"INTEGER","attr":"a"},
        {"name":"numer cz","type":"VARCHAR","targ":"15","attr":"n"},
        {"name":"ilość","type":"DOUBLE","attr":"n"},
        {"name":"cena netto","type":"DECIMAL","targ":"19,4","def":"0","attr":""},
        {"name":"data przyjęcia","type":"TIMESTAMP","def":"CURRENT_TIMESTAMP","attr":"n"},
        {"name":"rodzaj dokumentu","type":"VARCHAR","targ":"5","attr":"n"},
        {"name":"numer dokumentu","type":"INTEGER","def":"0","attr":""},
        {"name":"cena netto sprzedaży","type":"DECIMAL","targ":"19,4","def":"0","attr":""},
    ]},
    {name: "płace", cols: [
        {"name":"ID płac","type":"INTEGER","attr":"pan"},
        {"name":"ID pracownika","type":"INTEGER","def":"0","attr":""},
        {"name":"data","type":"VARCHAR","targ":"10","attr":""},
        {"name":"kwota","type":"FLOAT","def":"0","attr":""},
        {"name":"podstawa","type":"VARCHAR","targ":"15","attr":""},
        {"name":"miesiąc płacenia","type":"DATETIME","attr":""},
    ]},
    {name: "pracownicy", cols: [
        {"name":"ID pracownika","type":"INTEGER","attr":"pan"},
        {"name":"nazwisko","type":"VARCHAR","targ":"15","attr":""},
        {"name":"imię","type":"VARCHAR","targ":"15","attr":""},
        {"name":"inię II","type":"VARCHAR","targ":"15","attr":""},
        {"name":"nazwisko rodowe","type":"VARCHAR","targ":"15","attr":""},
        {"name":"imię ojca","type":"VARCHAR","targ":"15","attr":""},
        {"name":"imię matki","type":"VARCHAR","targ":"15","attr":""},
        {"name":"nazwisko rodowe matki","type":"VARCHAR","targ":"15","attr":""},
        {"name":"data urodzenia","type":"DATETIME","attr":"n"},
        {"name":"miejsce urodzenia","type":"VARCHAR","targ":"15","attr":""},
        {"name":"obywatelstwo","type":"VARCHAR","targ":"15","attr":""},
        {"name":"nr PESEL","type":"VARCHAR","targ":"12","attr":""},
        {"name":"nr NIP","type":"VARCHAR","targ":"15","attr":""},
        {"name":"ul i nr domu","type":"VARCHAR","targ":"20","attr":""},
        {"name":"kod","type":"VARCHAR","targ":"7","attr":""},
        {"name":"miejscowość","type":"VARCHAR","targ":"15","attr":""},
        {"name":"tel domowy","type":"VARCHAR","targ":"15","attr":""},
        {"name":"wykształcenie","type":"VARCHAR","targ":"15","attr":""},
        {"name":"wykształcenie uzupełniające","type":"LONGTEXT","attr":""},
        {"name":"dodatkowe uprawnienia","type":"LONGTEXT","attr":""},
        {"name":"stanowisko","type":"VARCHAR","targ":"15","attr":""},
    ]},
    {name: "przyjęcia PZ", cols: [
        {"name":"numer cz","type":"VARCHAR","targ":"15","attr":"n"},
        {"name":"ilość","type":"DOUBLE","attr":""},
        {"name":"cena netto","type":"DECIMAL","targ":"19,4","def":"0","attr":""},
        {"name":"data przyjęcia","type":"TIMESTAMP","def":"CURRENT_TIMESTAMP","attr":"n"},
        {"name":"rodzaj dokumentu","type":"VARCHAR","targ":"5","def":"'dosta'","attr":"n"},
        {"name":"numer dokumentu","type":"INTEGER","def":"0","attr":""},
    ]},
    {name: "rodzaje dokumentów", cols: [
        {"name":"rodzaj dokumentu","type":"VARCHAR","targ":"5","attr":""},
    ]},
    {name: "samochody klientów", cols: [
        {"name":"ID","type":"INTEGER","attr":"pan"},
        {"name":"kalkulacja","type":"INTEGER","def":"0","attr":""},
        {"name":"marka","type":"VARCHAR","targ":"15","attr":"n"},
        {"name":"model","type":"VARCHAR","targ":"15","attr":"n"},
        {"name":"nr rej","type":"VARCHAR","targ":"15","attr":"n"},
        {"name":"ID klienta","type":"INTEGER","def":"0","attr":""},
        {"name":"nr silnika","type":"VARCHAR","targ":"20","attr":"n"},
        {"name":"nr nadwozia","type":"VARCHAR","targ":"25","attr":"n"},
    ]},
    {name: "sposób zapłaty", cols: [
        {"name":"sposób zapłaty","type":"VARCHAR","targ":"15","attr":""},
    ]},
    {name: "sprzedaż", cols: [
        {"name":"numer cz","type":"VARCHAR","targ":"15","attr":"nq"},
        {"name":"ilość","type":"DOUBLE","attr":""},
        {"name":"cena netto sprzedaży","type":"DECIMAL","targ":"19,4","attr":""},
        {"name":"cena netto","type":"DECIMAL","targ":"19,4","def":"0","attr":""},
        {"name":"rodzaj dokumentu","type":"VARCHAR","targ":"5","attr":"n"},
        {"name":"numer dokumentu","type":"INTEGER","attr":"n"},
        {"name":"data przyjęcia","type":"TIMESTAMP","def":"CURRENT_TIMESTAMP","attr":"n"},
    ]},
    {name: "zamówienia części", cols: [
        {"name":"numer części","type":"VARCHAR","targ":"15","attr":""},
        {"name":"ilość","type":"DOUBLE","def":"0","attr":""},
        {"name":"data zamówienia","type":"TIMESTAMP","def":"CURRENT_TIMESTAMP","attr":""},
        {"name":"uwagi / przeznaczenie","type":"VARCHAR","targ":"50","attr":""},
    ]},
    {name: "zamówienia części archiwum", cols: [
        {"name":"numer części","type":"VARCHAR","targ":"15","attr":""},
        {"name":"ilość","type":"DOUBLE","def":"0","attr":""},
        {"name":"data zamówienia","type":"TIMESTAMP","def":"CURRENT_TIMESTAMP","attr":""},
        {"name":"data realizacji","type":"DATETIME","attr":""},
        {"name":"uwagi / przeznaczenie","type":"VARCHAR","targ":"50","attr":""},
        {"name":"zlealizowane","type":"TINYINT","targ":"1","attr":""},
    ]},
    {name: "zlecenia czynności", cols: [
        {"name":"ID zlecenia","type":"INTEGER","def":"0","attr":""},
        {"name":"ID czynności","type":"INTEGER","def":"0","attr":""},
        {"name":"krotność wykonania","type":"FLOAT","def":"0","attr":""},
        {"name":"cena netto","type":"DECIMAL","targ":"19,4","def":"0","attr":""},
    ]},
    {name: "zlecenia gaz", cols: [
        {"name":"ID zlecenia","type":"INTEGER","def":"0","attr":""},
        {"name":"ID czynności","type":"INTEGER","def":"0","attr":""},
        {"name":"krotność wykonania","type":"FLOAT","def":"0","attr":""},
        {"name":"cena netto","type":"DECIMAL","targ":"19,4","def":"0","attr":""},
    ]},
    {name: "zlecenia instalacji gazowej", cols: [
        {"name":"ID","type":"INTEGER","attr":"pan"},
        {"name":"ID klienta","type":"INTEGER","def":"0","attr":""},
        {"name":"ID samochodu","type":"INTEGER","def":"0","attr":""},
        {"name":"data otwarcia","type":"TIMESTAMP","def":"CURRENT_TIMESTAMP","attr":""},
        {"name":"data zamknięcia","type":"DATETIME","attr":""},
        {"name":"zysk z części","type":"DECIMAL","targ":"19,4","def":"0","attr":""},
        {"name":"zysk z robocizny","type":"DECIMAL","targ":"19,4","def":"0","attr":""},
        {"name":"mechanik prowadzący","type":"VARCHAR","targ":"30","attr":""},
        {"name":"% udziału","type":"TINYINT","targ":"3","def":"0","attr":"u"},
        {"name":"pomocnik 1","type":"VARCHAR","targ":"30","attr":""},
        {"name":"% udziału p1","type":"TINYINT","targ":"3","def":"0","attr":"u"},
        {"name":"pomocnik 2","type":"VARCHAR","targ":"30","attr":""},
        {"name":"% udziału p2","type":"TINYINT","targ":"3","def":"0","attr":"u"},
        {"name":"zgłoszone naprawy","type":"LONGTEXT","attr":""},
        {"name":"uwagi o naprawie","type":"INTEGER","def":"0","attr":"n"},
    ]},
    {name: "zlecenia naprawy", cols: [
        {"name":"ID","type":"INTEGER","attr":"pan"},
        {"name":"ID klienta","type":"INTEGER","def":"0","attr":""},
        {"name":"ID samochodu","type":"INTEGER","def":"0","attr":""},
        {"name":"data otwarcia","type":"TIMESTAMP","def":"CURRENT_TIMESTAMP","attr":""},
        {"name":"data zamknięcia","type":"DATETIME","attr":""},
        {"name":"zysk z części","type":"DECIMAL","targ":"19,4","def":"0","attr":""},
        {"name":"zysk z robocizny","type":"DECIMAL","targ":"19,4","def":"0","attr":""},
        {"name":"mechanik prowadzący","type":"VARCHAR","targ":"30","attr":""},
        {"name":"% udziału","type":"TINYINT","targ":"3","def":"0","attr":"u"},
        {"name":"pomocnik 1","type":"VARCHAR","targ":"30","attr":""},
        {"name":"% udziału p1","type":"TINYINT","targ":"3","def":"0","attr":"u"},
        {"name":"pomocnik 2","type":"VARCHAR","targ":"30","attr":""},
        {"name":"% udziału p2","type":"TINYINT","targ":"3","def":"0","attr":"u"},
        {"name":"zgłoszone naprawy","type":"LONGTEXT","attr":""},
        {"name":"uwagi o naprawie","type":"LONGTEXT","attr":""},
    ]},
]);

export {DB};