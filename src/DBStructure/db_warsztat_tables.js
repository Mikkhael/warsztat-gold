//@ts-check

import {ColumnType, ColumnStructure, TableStructure} from "./api";

const PRACOWNICY = new TableStructure('pracownicy', {
    ID                     : new ColumnStructure(`ID pracownika`              , ColumnType.Integer(true), true),     // INTEGER NOT NULL AUTO_INCREMENT, 
    nazwisko               : new ColumnStructure(`nazwisko`                   , ColumnType.Text(15)),                // VARCHAR(15), 
    imie                   : new ColumnStructure(`imię`                       , ColumnType.Text(15)),                // VARCHAR(15), 
    imie2                  : new ColumnStructure(`inię II`                    , ColumnType.Text(15)),                // VARCHAR(15), 
    nazwisko_rodowe        : new ColumnStructure(`nazwisko rodowe`            , ColumnType.Text(15)),                // VARCHAR(15), 
    imie_ojca              : new ColumnStructure(`imię ojca`                  , ColumnType.Text(15)),                // VARCHAR(15), 
    imie_matki             : new ColumnStructure(`imię matki`                 , ColumnType.Text(15)),                // VARCHAR(15), 
    nazwisko_rodowe_matki  : new ColumnStructure(`nazwisko rodowe matki`      , ColumnType.Text(15)),                // VARCHAR(15), 
    data_urodzenia         : new ColumnStructure(`data urodzenia`             , ColumnType.Datetime(true)),          // DATETIME NOT NULL, 
    miejsce_urodzenia      : new ColumnStructure(`miejsce urodzenia`          , ColumnType.Text(15)),                // VARCHAR(15), 
    obywatelstwo           : new ColumnStructure(`obywatelstwo`               , ColumnType.Text(15)),                // VARCHAR(15), 
    nr_PESEL               : new ColumnStructure(`nr PESEL`                   , ColumnType.Text(12)),                // VARCHAR(12), 
    nr_NIP                 : new ColumnStructure(`nr NIP`                     , ColumnType.Text(15)),                // VARCHAR(15), 
    adres                  : new ColumnStructure(`ul i nr domu`               , ColumnType.Text(20)),                // VARCHAR(20), 
    kod                    : new ColumnStructure(`kod`                        , ColumnType.Text(7)),                 // VARCHAR(7), 
    miejscowosc            : new ColumnStructure(`miejscowość`                , ColumnType.Text(15)),                // VARCHAR(15), 
    tel                    : new ColumnStructure(`tel domowy`                 , ColumnType.Text(15)),                // VARCHAR(15), 
    wykszt                 : new ColumnStructure(`wykształcenie`              , ColumnType.Text(15)),                // VARCHAR(15), 
    wykszt_uzu             : new ColumnStructure(`wykształcenie uzupełniające`, ColumnType.Text()),                  // LONGTEXT, 
    uprawnienia            : new ColumnStructure(`dodatkowe uprawnienia`      , ColumnType.Text()),                  // LONGTEXT, 
    stanowisko             : new ColumnStructure(`stanowisko`                 , ColumnType.Text(15)),                // VARCHAR(15), 
});

// const PLACE = new TableStructure('płace', [
//     new ColumnStructure(`ID płac`         , ColumnType.Integer(true), true),     //  INTEGER NOT NULL AUTO_INCREMENT, 
//     new ColumnStructure(`ID pracownika`   , ColumnType.Integer()),               //  INTEGER DEFAULT 0, 
//     new ColumnStructure(`data`            , ColumnType.Text(10)),                //  VARCHAR(10), 
//     new ColumnStructure(`kwota`           , ColumnType.Number()),                //  FLOAT NULL DEFAULT 0, 
//     new ColumnStructure(`podstawa`        , ColumnType.Text(15)),                //  VARCHAR(15), 
//     new ColumnStructure(`miesiąc płacenia`, ColumnType.Datetime()),              //  DATETIME, 
// ]);


export {
    PRACOWNICY,
    // PLACE
};