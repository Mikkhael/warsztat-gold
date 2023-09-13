#
# DUMP FILE
#
# Database is ported from MS Access
#------------------------------------------------------------------
# Created using "MS Access to MySQL" form http://www.bullzip.com
# Program Version 5.5.282
#
# OPTIONS:
#   sourcefilename=C:/Users/Michau/Desktop/30.06.2022_usuniety.mdb
#   sourceusername=
#   sourcepassword=
#   sourcesystemdatabase=
#   destinationdatabase=access
#   storageengine=Maria
#   dropdatabase=0
#   createtables=1
#   unicode=1
#   autocommit=0
#   transferdefaultvalues=1
#   transferindexes=1
#   transferautonumbers=1
#   transferrecords=0
#   columnlist=1
#   tableprefix=
#   negativeboolean=0
#   ignorelargeblobs=0
#   memotype=LONGTEXT
#   datetimetype=DATETIME
#

CREATE DATABASE IF NOT EXISTS `access`;
USE `access`;

#
# Table structure for table 'CENNIK  GM'
#

DROP TABLE IF EXISTS `CENNIK  GM`;

CREATE TABLE `CENNIK  GM` (
  `ID cennin GM` INTEGER NOT NULL AUTO_INCREMENT, 
  `CATALOG_NO` VARCHAR(7) NOT NULL, 
  `DESC_GER1` VARCHAR(10), 
  `DESC_GER2` VARCHAR(10), 
  `PRICE` DOUBLE NULL, 
  UNIQUE (`CATALOG_NO`), 
  INDEX (`ID cennin GM`), 
  PRIMARY KEY (`ID cennin GM`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'czynność'
#

DROP TABLE IF EXISTS `czynność`;

CREATE TABLE `czynność` (
  `ID cynności` INTEGER NOT NULL AUTO_INCREMENT, 
  `czynność` VARCHAR(50) NOT NULL, 
  UNIQUE (`czynność`), 
  INDEX (`ID cynności`), 
  PRIMARY KEY (`ID cynności`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'dane do zaświadczenie o sprawności inst'
#

DROP TABLE IF EXISTS `dane do zaświadczenie o sprawności inst`;

CREATE TABLE `dane do zaświadczenie o sprawności inst` (
  `ID typów` INTEGER NOT NULL AUTO_INCREMENT, 
  `Producent` VARCHAR(15), 
  `Typ/Nr` VARCHAR(15) NOT NULL, 
  `E-_` TINYINT(3) UNSIGNED NOT NULL DEFAULT 0, 
  `67R-_` VARCHAR(15) NOT NULL, 
  `Ważność legalizacji zbiornika do` DATETIME, 
  `ID obrotów mag` INTEGER NOT NULL DEFAULT 0, 
  INDEX (`ID obrotów mag`), 
  INDEX (`ID typów`), 
  PRIMARY KEY (`ID typów`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'dokumenty sprzedaży'
#

DROP TABLE IF EXISTS `dokumenty sprzedaży`;

CREATE TABLE `dokumenty sprzedaży` (
  `ID dokumentu` INTEGER NOT NULL AUTO_INCREMENT, 
  `nazwa dokumentu` VARCHAR(50) NOT NULL, 
  `nr dokumentu` VARCHAR(15) NOT NULL, 
  `ID zlecenia` INTEGER NOT NULL DEFAULT 0, 
  `data wystawienia` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
  INDEX (`ID dokumentu`), 
  INDEX (`ID zlecenia`), 
  UNIQUE (`nr dokumentu`), 
  PRIMARY KEY (`ID dokumentu`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'dokumenty sprzedaży chwilówk'
#

DROP TABLE IF EXISTS `dokumenty sprzedaży chwilówk`;

CREATE TABLE `dokumenty sprzedaży chwilówk` (
  `nazwa dokumentu` VARCHAR(50) NOT NULL, 
  `nr dokumentu` VARCHAR(15) NOT NULL, 
  `ID zlecenia` INTEGER NOT NULL DEFAULT 0, 
  `data wystawienia` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
  INDEX (`ID zlecenia`), 
  UNIQUE (`nr dokumentu`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'dostawcy'
#

DROP TABLE IF EXISTS `dostawcy`;

CREATE TABLE `dostawcy` (
  `ID dostawcy - producenta` INTEGER NOT NULL AUTO_INCREMENT, 
  `Nazwa` VARCHAR(50) NOT NULL, 
  `kod pocztowy` VARCHAR(6) NOT NULL, 
  `miejscowość` VARCHAR(20) NOT NULL, 
  `ulica nr domu` VARCHAR(30), 
  `tel 1` VARCHAR(15), 
  `tel 2` VARCHAR(15), 
  `fax` VARCHAR(15), 
  `konto bank` VARCHAR(50), 
  `nr konta` VARCHAR(50), 
  `przedstawiciel` VARCHAR(50), 
  `@-maill` VARCHAR(30), 
  `NIP` VARCHAR(14), 
  `otrzymany rabat %` TINYINT(3) UNSIGNED NOT NULL DEFAULT 0, 
  UNIQUE (`@-maill`), 
  INDEX (`ID dostawcy - producenta`), 
  INDEX (`kod pocztowy`), 
  UNIQUE (`Nazwa`), 
  PRIMARY KEY (`ID dostawcy - producenta`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'faktura szczegóły chwilówka'
#

DROP TABLE IF EXISTS `faktura szczegóły chwilówka`;

CREATE TABLE `faktura szczegóły chwilówka` (
  `nazwa części lub czynności` VARCHAR(50), 
  `jednostka` VARCHAR(5), 
  `ilość` FLOAT NULL DEFAULT 0, 
  `cena netto` DECIMAL(19,4) DEFAULT 0, 
  `numer` VARCHAR(10), 
  INDEX (`numer`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'inwentaryzacja'
#

DROP TABLE IF EXISTS `inwentaryzacja`;

CREATE TABLE `inwentaryzacja` (
  `numer cz` VARCHAR(15) NOT NULL, 
  `ilość` DOUBLE NULL, 
  `data zapisu` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  `rodzaj dokumentu` VARCHAR(5) NOT NULL DEFAULT 'inwen', 
  `numer dokumentu` INTEGER DEFAULT 4, 
  INDEX (`numer dokumentu`), 
  INDEX (`numer cz`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'inwentaryzacja nr 3'
#

DROP TABLE IF EXISTS `inwentaryzacja nr 3`;

CREATE TABLE `inwentaryzacja nr 3` (
  `numer cz` VARCHAR(15) NOT NULL, 
  `ilość` DOUBLE NULL, 
  `data zapisu` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  `rodzaj dokumentu` VARCHAR(5) NOT NULL DEFAULT 'inwen', 
  `numer dokumentu` INTEGER DEFAULT 3, 
  INDEX (`numer dokumentu`), 
  INDEX (`numer cz`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'jamar'
#

DROP TABLE IF EXISTS `jamar`;

CREATE TABLE `jamar` (
  `nazwa części lub czynności` VARCHAR(50), 
  `jednostka` VARCHAR(5), 
  `ilość` FLOAT NULL DEFAULT 0, 
  `cena netto` DECIMAL(19,4) DEFAULT 0, 
  `numer` VARCHAR(10), 
  INDEX (`numer`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'klienci'
#

DROP TABLE IF EXISTS `klienci`;

CREATE TABLE `klienci` (
  `ID` INTEGER NOT NULL AUTO_INCREMENT, 
  `NAZWA` VARCHAR(60) NOT NULL, 
  `MIASTO` VARCHAR(20) NOT NULL, 
  `ULICA` VARCHAR(30) NOT NULL, 
  `KOD_POCZT` VARCHAR(10) NOT NULL, 
  `TELEFON1` VARCHAR(17), 
  `TELEFON2` VARCHAR(17), 
  `NIP` VARCHAR(13), 
  `KTO` VARCHAR(8), 
  `KIEDY` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
  `UPUST` TINYINT(3) UNSIGNED DEFAULT 0, 
  `odbierający fakturę` VARCHAR(50), 
  `list` TINYINT(1), 
  INDEX (`ID`), 
  INDEX (`KOD_POCZT`), 
  UNIQUE (`NAZWA`), 
  UNIQUE (`NIP`), 
  PRIMARY KEY (`ID`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'liczby słownie'
#

DROP TABLE IF EXISTS `liczby słownie`;

CREATE TABLE `liczby słownie` (
  `liczba` DOUBLE NOT NULL, 
  `słownie` VARCHAR(100) NOT NULL, 
  PRIMARY KEY (`liczba`), 
  UNIQUE (`słownie`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'modele sam'
#

DROP TABLE IF EXISTS `modele sam`;

CREATE TABLE `modele sam` (
  `ID modelu` INTEGER NOT NULL AUTO_INCREMENT, 
  `Model:` VARCHAR(15), 
  `Typ:` VARCHAR(15), 
  `Nadw:` VARCHAR(7), 
  `Rok produkcji:` VARCHAR(7), 
  `Silnik:` VARCHAR(10), 
  `Kod:` VARCHAR(15), 
  INDEX (`ID modelu`), 
  INDEX (`Kod:`), 
  PRIMARY KEY (`ID modelu`), 
  UNIQUE (`Typ:`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'nazwy części'
#

DROP TABLE IF EXISTS `nazwy części`;

CREATE TABLE `nazwy części` (
  `numer części` VARCHAR(15) NOT NULL, 
  `nazwa części` VARCHAR(255), 
  `jednostka` VARCHAR(50) DEFAULT 'szt.', 
  `grupa` FLOAT NULL DEFAULT 0, 
  `VAT` FLOAT NULL DEFAULT .22, 
  `ilość w opakowaniu zbiorczym` TINYINT(3) UNSIGNED DEFAULT 0, 
  `lokalizacja w magazynie` VARCHAR(10), 
  `odpowiedniki` VARCHAR(50), 
  UNIQUE (`numer części`), 
  PRIMARY KEY (`numer części`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'obroty magazynowe'
#

DROP TABLE IF EXISTS `obroty magazynowe`;

CREATE TABLE `obroty magazynowe` (
  `ID` INTEGER AUTO_INCREMENT, 
  `numer cz` VARCHAR(15) NOT NULL, 
  `ilość` DOUBLE NOT NULL, 
  `cena netto` DECIMAL(19,4) DEFAULT 0, 
  `data przyjęcia` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  `rodzaj dokumentu` VARCHAR(5) NOT NULL, 
  `numer dokumentu` INTEGER DEFAULT 0, 
  `cena netto sprzedaży` DECIMAL(19,4) DEFAULT 0, 
  INDEX (`ID`), 
  INDEX (`ilość`), 
  INDEX (`numer dokumentu`), 
  INDEX (`numer cz`), 
  INDEX (`rodzaj dokumentu`), 
  INDEX (`rodzaj dokumentu`, `numer dokumentu`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'płace'
#

DROP TABLE IF EXISTS `płace`;

CREATE TABLE `płace` (
  `ID płac` INTEGER NOT NULL AUTO_INCREMENT, 
  `ID pracownika` INTEGER DEFAULT 0, 
  `data` VARCHAR(10), 
  `kwota` FLOAT NULL DEFAULT 0, 
  `podstawa` VARCHAR(15), 
  `miesiąc płacenia` DATETIME, 
  INDEX (`ID płac`), 
  INDEX (`ID pracownika`), 
  PRIMARY KEY (`ID płac`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'pracownicy'
#

DROP TABLE IF EXISTS `pracownicy`;

CREATE TABLE `pracownicy` (
  `ID pracownika` INTEGER NOT NULL AUTO_INCREMENT, 
  `nazwisko` VARCHAR(15), 
  `imię` VARCHAR(15), 
  `inię II` VARCHAR(15), 
  `nazwisko rodowe` VARCHAR(15), 
  `imię ojca` VARCHAR(15), 
  `imię matki` VARCHAR(15), 
  `nazwisko rodowe matki` VARCHAR(15), 
  `data urodzenia` DATETIME NOT NULL, 
  `miejsce urodzenia` VARCHAR(15), 
  `obywatelstwo` VARCHAR(15), 
  `nr PESEL` VARCHAR(12), 
  `nr NIP` VARCHAR(15), 
  `ul i nr domu` VARCHAR(20), 
  `kod` VARCHAR(7), 
  `miejscowość` VARCHAR(15), 
  `tel domowy` VARCHAR(15), 
  `wykształcenie` VARCHAR(15), 
  `wykształcenie uzupełniające` LONGTEXT, 
  `dodatkowe uprawnienia` LONGTEXT, 
  `stanowisko` VARCHAR(15), 
  INDEX (`ID pracownika`), 
  INDEX (`kod`), 
  INDEX (`nazwisko`), 
  PRIMARY KEY (`ID pracownika`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'przyjęcia PZ'
#

DROP TABLE IF EXISTS `przyjęcia PZ`;

CREATE TABLE `przyjęcia PZ` (
  `numer cz` VARCHAR(15) NOT NULL, 
  `ilość` DOUBLE NULL, 
  `cena netto` DECIMAL(19,4) DEFAULT 0, 
  `data przyjęcia` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  `rodzaj dokumentu` VARCHAR(5) NOT NULL DEFAULT 'dosta', 
  `numer dokumentu` INTEGER DEFAULT 0, 
  INDEX (`numer dokumentu`), 
  INDEX (`numer cz`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'rodzaje dokumentów'
#

DROP TABLE IF EXISTS `rodzaje dokumentów`;

CREATE TABLE `rodzaje dokumentów` (
  `rodzaj dokumentu` VARCHAR(5), 
  INDEX (`rodzaj dokumentu`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'samochody klientów'
#

DROP TABLE IF EXISTS `samochody klientów`;

CREATE TABLE `samochody klientów` (
  `ID` INTEGER NOT NULL AUTO_INCREMENT, 
  `kalkulacja` INTEGER DEFAULT 0, 
  `marka` VARCHAR(15) NOT NULL, 
  `model` VARCHAR(15) NOT NULL, 
  `nr rej` VARCHAR(15) NOT NULL, 
  `ID klienta` INTEGER DEFAULT 0, 
  `nr silnika` VARCHAR(20) NOT NULL, 
  `nr nadwozia` VARCHAR(25) NOT NULL, 
  INDEX (`ID`), 
  INDEX (`ID klienta`), 
  INDEX (`nr rej`), 
  PRIMARY KEY (`ID`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'sposób zapłaty'
#

DROP TABLE IF EXISTS `sposób zapłaty`;

CREATE TABLE `sposób zapłaty` (
  `sposób zapłaty` VARCHAR(15)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'sprzedaż'
#

DROP TABLE IF EXISTS `sprzedaż`;

CREATE TABLE `sprzedaż` (
  `numer cz` VARCHAR(15) NOT NULL, 
  `ilość` DOUBLE NULL, 
  `cena netto sprzedaży` DECIMAL(19,4), 
  `cena netto` DECIMAL(19,4) DEFAULT 0, 
  `rodzaj dokumentu` VARCHAR(5) NOT NULL, 
  `numer dokumentu` INTEGER NOT NULL, 
  `data przyjęcia` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  INDEX (`numer dokumentu`), 
  UNIQUE (`numer cz`), 
  INDEX (`rodzaj dokumentu`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'zamówienia części'
#

DROP TABLE IF EXISTS `zamówienia części`;

CREATE TABLE `zamówienia części` (
  `numer części` VARCHAR(15), 
  `ilość` DOUBLE NULL DEFAULT 0, 
  `data zamówienia` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
  `uwagi / przeznaczenie` VARCHAR(50), 
  INDEX (`numer części`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'zamówienia części archiwum'
#

DROP TABLE IF EXISTS `zamówienia części archiwum`;

CREATE TABLE `zamówienia części archiwum` (
  `numer części` VARCHAR(15), 
  `ilość` DOUBLE NULL DEFAULT 0, 
  `data zamówienia` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
  `data realizacji` DATETIME, 
  `uwagi / przeznaczenie` VARCHAR(50), 
  `zlealizowane` TINYINT(1), 
  INDEX (`data zamówienia`), 
  INDEX (`numer części`), 
  INDEX (`zlealizowane`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'zlecenia czynności'
#

DROP TABLE IF EXISTS `zlecenia czynności`;

CREATE TABLE `zlecenia czynności` (
  `ID zlecenia` INTEGER DEFAULT 0, 
  `ID czynności` INTEGER DEFAULT 0, 
  `krotność wykonania` FLOAT NULL DEFAULT 0, 
  `cena netto` DECIMAL(19,4) DEFAULT 0, 
  INDEX (`ID czynności`), 
  INDEX (`ID zlecenia`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'zlecenia gaz'
#

DROP TABLE IF EXISTS `zlecenia gaz`;

CREATE TABLE `zlecenia gaz` (
  `ID zlecenia` INTEGER DEFAULT 0, 
  `ID czynności` INTEGER DEFAULT 0, 
  `krotność wykonania` FLOAT NULL DEFAULT 0, 
  `cena netto` DECIMAL(19,4) DEFAULT 0, 
  INDEX (`ID czynności`), 
  INDEX (`ID zlecenia`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'zlecenia instalacji gazowej'
#

DROP TABLE IF EXISTS `zlecenia instalacji gazowej`;

CREATE TABLE `zlecenia instalacji gazowej` (
  `ID` INTEGER NOT NULL AUTO_INCREMENT, 
  `ID klienta` INTEGER DEFAULT 0, 
  `ID samochodu` INTEGER DEFAULT 0, 
  `data otwarcia` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
  `data zamknięcia` DATETIME, 
  `zysk z części` DECIMAL(19,4) DEFAULT 0, 
  `zysk z robocizny` DECIMAL(19,4) DEFAULT 0, 
  `mechanik prowadzący` VARCHAR(30), 
  `% udziału` TINYINT(3) UNSIGNED DEFAULT 0, 
  `pomocnik 1` VARCHAR(30), 
  `% udziału p1` TINYINT(3) UNSIGNED DEFAULT 0, 
  `pomocnik 2` VARCHAR(30), 
  `% udziału p2` TINYINT(3) UNSIGNED DEFAULT 0, 
  `zgłoszone naprawy` LONGTEXT, 
  `uwagi o naprawie` INTEGER NOT NULL DEFAULT 0, 
  INDEX (`data zamknięcia`), 
  INDEX (`ID`), 
  INDEX (`ID klienta`), 
  INDEX (`ID samochodu`), 
  PRIMARY KEY (`ID`)
) ENGINE=maria DEFAULT CHARSET=utf8;

#
# Table structure for table 'zlecenia naprawy'
#

DROP TABLE IF EXISTS `zlecenia naprawy`;

CREATE TABLE `zlecenia naprawy` (
  `ID` INTEGER NOT NULL AUTO_INCREMENT, 
  `ID klienta` INTEGER DEFAULT 0, 
  `ID samochodu` INTEGER DEFAULT 0, 
  `data otwarcia` TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
  `data zamknięcia` DATETIME, 
  `zysk z części` DECIMAL(19,4) DEFAULT 0, 
  `zysk z robocizny` DECIMAL(19,4) DEFAULT 0, 
  `mechanik prowadzący` VARCHAR(30), 
  `% udziału` TINYINT(3) UNSIGNED DEFAULT 0, 
  `pomocnik 1` VARCHAR(30), 
  `% udziału p1` TINYINT(3) UNSIGNED DEFAULT 0, 
  `pomocnik 2` VARCHAR(30), 
  `% udziału p2` TINYINT(3) UNSIGNED DEFAULT 0, 
  `zgłoszone naprawy` LONGTEXT, 
  `uwagi o naprawie` LONGTEXT, 
  INDEX (`data zamknięcia`), 
  INDEX (`ID`), 
  INDEX (`ID klienta`), 
  INDEX (`ID samochodu`), 
  PRIMARY KEY (`ID`)
) ENGINE=maria DEFAULT CHARSET=utf8;

