



CREATE TABLE IF NOT EXISTS `CENNIK  GM` (
  `ID cennin GM` INTEGER NOT NULL ,
  `CATALOG_NO` TEXT CHECK (length(`CATALOG_NO`) <= 7) NOT NULL,
  `DESC_GER1` TEXT CHECK (length(`DESC_GER1`) <= 10),
  `DESC_GER2` TEXT CHECK (length(`DESC_GER2`) <= 10),
  `PRICE` REAL NULL,
  UNIQUE (`CATALOG_NO`), 
  PRIMARY KEY (`ID cennin GM`)
) STRICT;



CREATE TABLE IF NOT EXISTS `czynność` (
  `ID cynności` INTEGER NOT NULL ,
  `czynność` TEXT CHECK (length(`czynność`) <= 50) NOT NULL,
  UNIQUE (`czynność`), 
  PRIMARY KEY (`ID cynności`)
) STRICT;



CREATE TABLE IF NOT EXISTS `dane do zaświadczenie o sprawności inst` (
  `ID typów` INTEGER NOT NULL ,
  `Producent` TEXT CHECK (length(`Producent`) <= 15),
  `Typ/Nr` TEXT CHECK (length(`Typ/Nr`) <= 15) NOT NULL,
  `E-_` INTEGER CHECK (`E-_` <= 255) CHECK (`E-_` >= 0) NOT NULL DEFAULT 0,
  `67R-_` TEXT CHECK (length(`67R-_`) <= 15) NOT NULL,
  `Ważność legalizacji zbiornika do` TEXT CHECK (datetime(`Ważność legalizacji zbiornika do`) IS NOT NULL),
  `ID obrotów mag` INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (`ID typów`)
) STRICT;
CREATE INDEX IF NOT EXISTS `dane do zaświadczenie o sprawności inst IDX ID obrotów mag` ON `dane do zaświadczenie o sprawności inst` (`ID obrotów mag`);



CREATE TABLE IF NOT EXISTS `dokumenty sprzedaży` (
  `ID dokumentu` INTEGER NOT NULL ,
  `nazwa dokumentu` TEXT CHECK (length(`nazwa dokumentu`) <= 50) NOT NULL,
  `nr dokumentu` TEXT CHECK (length(`nr dokumentu`) <= 15) NOT NULL,
  `ID zlecenia` INTEGER NOT NULL DEFAULT 0,
  `data wystawienia` TEXT CHECK (datetime(`data wystawienia`) IS NOT NULL) DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (`nr dokumentu`), 
  PRIMARY KEY (`ID dokumentu`)
) STRICT;
CREATE INDEX IF NOT EXISTS `dokumenty sprzedaży IDX ID zlecenia` ON `dokumenty sprzedaży` (`ID zlecenia`);



CREATE TABLE IF NOT EXISTS `dokumenty sprzedaży chwilówk` (
  `nazwa dokumentu` TEXT CHECK (length(`nazwa dokumentu`) <= 50) NOT NULL,
  `nr dokumentu` TEXT CHECK (length(`nr dokumentu`) <= 15) NOT NULL,
  `ID zlecenia` INTEGER NOT NULL DEFAULT 0,
  `data wystawienia` TEXT CHECK (datetime(`data wystawienia`) IS NOT NULL) DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (`nr dokumentu`)
) STRICT;
CREATE INDEX IF NOT EXISTS `dokumenty sprzedaży chwilówk IDX ID zlecenia` ON `dokumenty sprzedaży chwilówk` (`ID zlecenia`);



CREATE TABLE IF NOT EXISTS `dostawcy` (
  `ID dostawcy - producenta` INTEGER NOT NULL ,
  `Nazwa` TEXT CHECK (length(`Nazwa`) <= 50) NOT NULL,
  `kod pocztowy` TEXT CHECK (length(`kod pocztowy`) <= 6) NOT NULL,
  `miejscowość` TEXT CHECK (length(`miejscowość`) <= 20) NOT NULL,
  `ulica nr domu` TEXT CHECK (length(`ulica nr domu`) <= 30),
  `tel 1` TEXT CHECK (length(`tel 1`) <= 15),
  `tel 2` TEXT CHECK (length(`tel 2`) <= 15),
  `fax` TEXT CHECK (length(`fax`) <= 15),
  `konto bank` TEXT CHECK (length(`konto bank`) <= 50),
  `nr konta` TEXT CHECK (length(`nr konta`) <= 50),
  `przedstawiciel` TEXT CHECK (length(`przedstawiciel`) <= 50),
  `@-maill` TEXT CHECK (length(`@-maill`) <= 30),
  `NIP` TEXT CHECK (length(`NIP`) <= 14),
  `otrzymany rabat %` INTEGER CHECK (`otrzymany rabat %` <= 255) CHECK (`otrzymany rabat %` >= 0) NOT NULL DEFAULT 0,
  UNIQUE (`@-maill`), 
  UNIQUE (`Nazwa`), 
  PRIMARY KEY (`ID dostawcy - producenta`)
) STRICT;
CREATE INDEX IF NOT EXISTS `dostawcy IDX kod pocztowy` ON `dostawcy` (`kod pocztowy`);



CREATE TABLE IF NOT EXISTS `faktura szczegóły chwilówka` (
  `nazwa części lub czynności` TEXT CHECK (length(`nazwa części lub czynności`) <= 50),
  `jednostka` TEXT CHECK (length(`jednostka`) <= 5),
  `ilość` REAL NULL DEFAULT 0,
  `cena netto` TEXT CHECK (decimal(`cena netto`) IS NOT NULL) DEFAULT 0,
  `numer` TEXT CHECK (length(`numer`) <= 10)
) STRICT;
CREATE INDEX IF NOT EXISTS `faktura szczegóły chwilówka IDX numer` ON `faktura szczegóły chwilówka` (`numer`);



CREATE TABLE IF NOT EXISTS `inwentaryzacja` (
  `numer cz` TEXT CHECK (length(`numer cz`) <= 15) NOT NULL,
  `ilość` REAL NULL,
  `data zapisu` TEXT CHECK (datetime(`data zapisu`) IS NOT NULL) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rodzaj dokumentu` TEXT CHECK (length(`rodzaj dokumentu`) <= 5) NOT NULL DEFAULT 'inwen',
  `numer dokumentu` INTEGER DEFAULT 4
) STRICT;
CREATE INDEX IF NOT EXISTS `inwentaryzacja IDX numer dokumentu` ON `inwentaryzacja` (`numer dokumentu`);
CREATE INDEX IF NOT EXISTS `inwentaryzacja IDX numer cz` ON `inwentaryzacja` (`numer cz`);



CREATE TABLE IF NOT EXISTS `inwentaryzacja nr 3` (
  `numer cz` TEXT CHECK (length(`numer cz`) <= 15) NOT NULL,
  `ilość` REAL NULL,
  `data zapisu` TEXT CHECK (datetime(`data zapisu`) IS NOT NULL) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rodzaj dokumentu` TEXT CHECK (length(`rodzaj dokumentu`) <= 5) NOT NULL DEFAULT 'inwen',
  `numer dokumentu` INTEGER DEFAULT 3
) STRICT;
CREATE INDEX IF NOT EXISTS `inwentaryzacja nr 3 IDX numer dokumentu` ON `inwentaryzacja nr 3` (`numer dokumentu`);
CREATE INDEX IF NOT EXISTS `inwentaryzacja nr 3 IDX numer cz` ON `inwentaryzacja nr 3` (`numer cz`);



CREATE TABLE IF NOT EXISTS `jamar` (
  `nazwa części lub czynności` TEXT CHECK (length(`nazwa części lub czynności`) <= 50),
  `jednostka` TEXT CHECK (length(`jednostka`) <= 5),
  `ilość` REAL NULL DEFAULT 0,
  `cena netto` TEXT CHECK (decimal(`cena netto`) IS NOT NULL) DEFAULT 0,
  `numer` TEXT CHECK (length(`numer`) <= 10)
) STRICT;
CREATE INDEX IF NOT EXISTS `jamar IDX numer` ON `jamar` (`numer`);



CREATE TABLE IF NOT EXISTS `klienci` (
  `ID` INTEGER NOT NULL ,
  `NAZWA` TEXT CHECK (length(`NAZWA`) <= 60) NOT NULL,
  `MIASTO` TEXT CHECK (length(`MIASTO`) <= 20) NOT NULL,
  `ULICA` TEXT CHECK (length(`ULICA`) <= 30) NOT NULL,
  `KOD_POCZT` TEXT CHECK (length(`KOD_POCZT`) <= 10) NOT NULL,
  `TELEFON1` TEXT CHECK (length(`TELEFON1`) <= 17),
  `TELEFON2` TEXT CHECK (length(`TELEFON2`) <= 17),
  `NIP` TEXT CHECK (length(`NIP`) <= 13),
  `KTO` TEXT CHECK (length(`KTO`) <= 8),
  `KIEDY` TEXT CHECK (datetime(`KIEDY`) IS NOT NULL) DEFAULT CURRENT_TIMESTAMP,
  `UPUST` INTEGER CHECK (`UPUST` <= 255) CHECK (`UPUST` >= 0) DEFAULT 0,
  `odbierający fakturę` TEXT CHECK (length(`odbierający fakturę`) <= 50),
  `list` INTEGER,
  UNIQUE (`NAZWA`), 
  UNIQUE (`NIP`), 
  PRIMARY KEY (`ID`)
) STRICT;
CREATE INDEX IF NOT EXISTS `klienci IDX KOD_POCZT` ON `klienci` (`KOD_POCZT`);



CREATE TABLE IF NOT EXISTS `liczby słownie` (
  `liczba` REAL NOT NULL,
  `słownie` TEXT CHECK (length(`słownie`) <= 100) NOT NULL,
  PRIMARY KEY (`liczba`), 
  UNIQUE (`słownie`)
) STRICT;



CREATE TABLE IF NOT EXISTS `modele sam` (
  `ID modelu` INTEGER NOT NULL ,
  `Model:` TEXT CHECK (length(`Model:`) <= 15),
  `Typ:` TEXT CHECK (length(`Typ:`) <= 15),
  `Nadw:` TEXT CHECK (length(`Nadw:`) <= 7),
  `Rok produkcji:` TEXT CHECK (length(`Rok produkcji:`) <= 7),
  `Silnik:` TEXT CHECK (length(`Silnik:`) <= 10),
  `Kod:` TEXT CHECK (length(`Kod:`) <= 15),
  PRIMARY KEY (`ID modelu`), 
  UNIQUE (`Typ:`)
) STRICT;
CREATE INDEX IF NOT EXISTS `modele sam IDX Kod:` ON `modele sam` (`Kod:`);



CREATE TABLE IF NOT EXISTS `nazwy części` (
  `numer części` TEXT CHECK (length(`numer części`) <= 15) NOT NULL,
  `nazwa części` TEXT CHECK (length(`nazwa części`) <= 255),
  `jednostka` TEXT CHECK (length(`jednostka`) <= 50) DEFAULT 'szt.',
  `grupa` REAL NULL DEFAULT 0,
  `VAT` REAL NULL DEFAULT .22,
  `ilość w opakowaniu zbiorczym` INTEGER CHECK (`ilość w opakowaniu zbiorczym` <= 255) CHECK (`ilość w opakowaniu zbiorczym` >= 0) DEFAULT 0,
  `lokalizacja w magazynie` TEXT CHECK (length(`lokalizacja w magazynie`) <= 10),
  `odpowiedniki` TEXT CHECK (length(`odpowiedniki`) <= 50),
  UNIQUE (`numer części`), 
  PRIMARY KEY (`numer części`)
) STRICT;



CREATE TABLE IF NOT EXISTS `obroty magazynowe` (
  `ID` INTEGER ,
  `numer cz` TEXT CHECK (length(`numer cz`) <= 15) NOT NULL,
  `ilość` REAL NOT NULL,
  `cena netto` TEXT CHECK (decimal(`cena netto`) IS NOT NULL) DEFAULT 0,
  `data przyjęcia` TEXT CHECK (datetime(`data przyjęcia`) IS NOT NULL) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rodzaj dokumentu` TEXT CHECK (length(`rodzaj dokumentu`) <= 5) NOT NULL,
  `numer dokumentu` INTEGER DEFAULT 0,
  `cena netto sprzedaży` TEXT CHECK (decimal(`cena netto sprzedaży`) IS NOT NULL) DEFAULT 0
) STRICT;
CREATE INDEX IF NOT EXISTS `obroty magazynowe IDX ilość` ON `obroty magazynowe` (`ilość`);
CREATE INDEX IF NOT EXISTS `obroty magazynowe IDX numer dokumentu` ON `obroty magazynowe` (`numer dokumentu`);
CREATE INDEX IF NOT EXISTS `obroty magazynowe IDX numer cz` ON `obroty magazynowe` (`numer cz`);
CREATE INDEX IF NOT EXISTS `obroty magazynowe IDX rodzaj dokumentu` ON `obroty magazynowe` (`rodzaj dokumentu`);
CREATE INDEX IF NOT EXISTS `obroty magazynowe IDX rodzaj dokumentu,numer dokumentu` ON `obroty magazynowe` (`rodzaj dokumentu`, `numer dokumentu`);



CREATE TABLE IF NOT EXISTS `płace` (
  `ID płac` INTEGER NOT NULL ,
  `ID pracownika` INTEGER DEFAULT 0,
  `data` TEXT CHECK (length(`data`) <= 10),
  `kwota` REAL NULL DEFAULT 0,
  `podstawa` TEXT CHECK (length(`podstawa`) <= 15),
  `miesiąc płacenia` TEXT CHECK (datetime(`miesiąc płacenia`) IS NOT NULL),
  PRIMARY KEY (`ID płac`)
) STRICT;
CREATE INDEX IF NOT EXISTS `płace IDX ID pracownika` ON `płace` (`ID pracownika`);



CREATE TABLE IF NOT EXISTS `pracownicy` (
  `ID pracownika` INTEGER NOT NULL ,
  `nazwisko` TEXT CHECK (length(`nazwisko`) <= 15),
  `imię` TEXT CHECK (length(`imię`) <= 15),
  `inię II` TEXT CHECK (length(`inię II`) <= 15),
  `nazwisko rodowe` TEXT CHECK (length(`nazwisko rodowe`) <= 15),
  `imię ojca` TEXT CHECK (length(`imię ojca`) <= 15),
  `imię matki` TEXT CHECK (length(`imię matki`) <= 15),
  `nazwisko rodowe matki` TEXT CHECK (length(`nazwisko rodowe matki`) <= 15),
  `data urodzenia` TEXT CHECK (datetime(`data urodzenia`) IS NOT NULL) NOT NULL,
  `miejsce urodzenia` TEXT CHECK (length(`miejsce urodzenia`) <= 15),
  `obywatelstwo` TEXT CHECK (length(`obywatelstwo`) <= 15),
  `nr PESEL` TEXT CHECK (length(`nr PESEL`) <= 12),
  `nr NIP` TEXT CHECK (length(`nr NIP`) <= 15),
  `ul i nr domu` TEXT CHECK (length(`ul i nr domu`) <= 20),
  `kod` TEXT CHECK (length(`kod`) <= 7),
  `miejscowość` TEXT CHECK (length(`miejscowość`) <= 15),
  `tel domowy` TEXT CHECK (length(`tel domowy`) <= 15),
  `wykształcenie` TEXT CHECK (length(`wykształcenie`) <= 15),
  `wykształcenie uzupełniające` TEXT,
  `dodatkowe uprawnienia` TEXT,
  `stanowisko` TEXT CHECK (length(`stanowisko`) <= 15),
  PRIMARY KEY (`ID pracownika`)
) STRICT;
CREATE INDEX IF NOT EXISTS `pracownicy IDX kod` ON `pracownicy` (`kod`);
CREATE INDEX IF NOT EXISTS `pracownicy IDX nazwisko` ON `pracownicy` (`nazwisko`);



CREATE TABLE IF NOT EXISTS `przyjęcia PZ` (
  `numer cz` TEXT CHECK (length(`numer cz`) <= 15) NOT NULL,
  `ilość` REAL NULL,
  `cena netto` TEXT CHECK (decimal(`cena netto`) IS NOT NULL) DEFAULT 0,
  `data przyjęcia` TEXT CHECK (datetime(`data przyjęcia`) IS NOT NULL) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rodzaj dokumentu` TEXT CHECK (length(`rodzaj dokumentu`) <= 5) NOT NULL DEFAULT 'dosta',
  `numer dokumentu` INTEGER DEFAULT 0
) STRICT;
CREATE INDEX IF NOT EXISTS `przyjęcia PZ IDX numer dokumentu` ON `przyjęcia PZ` (`numer dokumentu`);
CREATE INDEX IF NOT EXISTS `przyjęcia PZ IDX numer cz` ON `przyjęcia PZ` (`numer cz`);



CREATE TABLE IF NOT EXISTS `rodzaje dokumentów` (
  `rodzaj dokumentu` TEXT CHECK (length(`rodzaj dokumentu`) <= 5)
) STRICT;
CREATE INDEX IF NOT EXISTS `rodzaje dokumentów IDX rodzaj dokumentu` ON `rodzaje dokumentów` (`rodzaj dokumentu`);



CREATE TABLE IF NOT EXISTS `samochody klientów` (
  `ID` INTEGER NOT NULL ,
  `kalkulacja` INTEGER DEFAULT 0,
  `marka` TEXT CHECK (length(`marka`) <= 15) NOT NULL,
  `model` TEXT CHECK (length(`model`) <= 15) NOT NULL,
  `nr rej` TEXT CHECK (length(`nr rej`) <= 15) NOT NULL,
  `ID klienta` INTEGER DEFAULT 0,
  `nr silnika` TEXT CHECK (length(`nr silnika`) <= 20) NOT NULL,
  `nr nadwozia` TEXT CHECK (length(`nr nadwozia`) <= 25) NOT NULL,
  PRIMARY KEY (`ID`)
) STRICT;
CREATE INDEX IF NOT EXISTS `samochody klientów IDX ID klienta` ON `samochody klientów` (`ID klienta`);
CREATE INDEX IF NOT EXISTS `samochody klientów IDX nr rej` ON `samochody klientów` (`nr rej`);



CREATE TABLE IF NOT EXISTS `sposób zapłaty` (
  `sposób zapłaty` TEXT CHECK (length(`sposób zapłaty`) <= 15)
) STRICT;



CREATE TABLE IF NOT EXISTS `sprzedaż` (
  `numer cz` TEXT CHECK (length(`numer cz`) <= 15) NOT NULL,
  `ilość` REAL NULL,
  `cena netto sprzedaży` TEXT CHECK (decimal(`cena netto sprzedaży`) IS NOT NULL),
  `cena netto` TEXT CHECK (decimal(`cena netto`) IS NOT NULL) DEFAULT 0,
  `rodzaj dokumentu` TEXT CHECK (length(`rodzaj dokumentu`) <= 5) NOT NULL,
  `numer dokumentu` INTEGER NOT NULL,
  `data przyjęcia` TEXT CHECK (datetime(`data przyjęcia`) IS NOT NULL) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (`numer cz`)
) STRICT;
CREATE INDEX IF NOT EXISTS `sprzedaż IDX numer dokumentu` ON `sprzedaż` (`numer dokumentu`);
CREATE INDEX IF NOT EXISTS `sprzedaż IDX rodzaj dokumentu` ON `sprzedaż` (`rodzaj dokumentu`);



CREATE TABLE IF NOT EXISTS `zamówienia części` (
  `numer części` TEXT CHECK (length(`numer części`) <= 15),
  `ilość` REAL NULL DEFAULT 0,
  `data zamówienia` TEXT CHECK (datetime(`data zamówienia`) IS NOT NULL) DEFAULT CURRENT_TIMESTAMP,
  `uwagi / przeznaczenie` TEXT CHECK (length(`uwagi / przeznaczenie`) <= 50)
) STRICT;
CREATE INDEX IF NOT EXISTS `zamówienia części IDX numer części` ON `zamówienia części` (`numer części`);



CREATE TABLE IF NOT EXISTS `zamówienia części archiwum` (
  `numer części` TEXT CHECK (length(`numer części`) <= 15),
  `ilość` REAL NULL DEFAULT 0,
  `data zamówienia` TEXT CHECK (datetime(`data zamówienia`) IS NOT NULL) DEFAULT CURRENT_TIMESTAMP,
  `data realizacji` TEXT CHECK (datetime(`data realizacji`) IS NOT NULL),
  `uwagi / przeznaczenie` TEXT CHECK (length(`uwagi / przeznaczenie`) <= 50),
  `zlealizowane` INTEGER
) STRICT;
CREATE INDEX IF NOT EXISTS `zamówienia części archiwum IDX data zamówienia` ON `zamówienia części archiwum` (`data zamówienia`);
CREATE INDEX IF NOT EXISTS `zamówienia części archiwum IDX numer części` ON `zamówienia części archiwum` (`numer części`);
CREATE INDEX IF NOT EXISTS `zamówienia części archiwum IDX zlealizowane` ON `zamówienia części archiwum` (`zlealizowane`);



CREATE TABLE IF NOT EXISTS `zlecenia czynności` (
  `ID zlecenia` INTEGER DEFAULT 0,
  `ID czynności` INTEGER DEFAULT 0,
  `krotność wykonania` REAL NULL DEFAULT 0,
  `cena netto` TEXT CHECK (decimal(`cena netto`) IS NOT NULL) DEFAULT 0
) STRICT;
CREATE INDEX IF NOT EXISTS `zlecenia czynności IDX ID czynności` ON `zlecenia czynności` (`ID czynności`);
CREATE INDEX IF NOT EXISTS `zlecenia czynności IDX ID zlecenia` ON `zlecenia czynności` (`ID zlecenia`);



CREATE TABLE IF NOT EXISTS `zlecenia gaz` (
  `ID zlecenia` INTEGER DEFAULT 0,
  `ID czynności` INTEGER DEFAULT 0,
  `krotność wykonania` REAL NULL DEFAULT 0,
  `cena netto` TEXT CHECK (decimal(`cena netto`) IS NOT NULL) DEFAULT 0
) STRICT;
CREATE INDEX IF NOT EXISTS `zlecenia gaz IDX ID czynności` ON `zlecenia gaz` (`ID czynności`);
CREATE INDEX IF NOT EXISTS `zlecenia gaz IDX ID zlecenia` ON `zlecenia gaz` (`ID zlecenia`);



CREATE TABLE IF NOT EXISTS `zlecenia instalacji gazowej` (
  `ID` INTEGER NOT NULL ,
  `ID klienta` INTEGER DEFAULT 0,
  `ID samochodu` INTEGER DEFAULT 0,
  `data otwarcia` TEXT CHECK (datetime(`data otwarcia`) IS NOT NULL) DEFAULT CURRENT_TIMESTAMP,
  `data zamknięcia` TEXT CHECK (datetime(`data zamknięcia`) IS NOT NULL),
  `zysk z części` TEXT CHECK (decimal(`zysk z części`) IS NOT NULL) DEFAULT 0,
  `zysk z robocizny` TEXT CHECK (decimal(`zysk z robocizny`) IS NOT NULL) DEFAULT 0,
  `mechanik prowadzący` TEXT CHECK (length(`mechanik prowadzący`) <= 30),
  `% udziału` INTEGER CHECK (`% udziału` <= 255) CHECK (`% udziału` >= 0) DEFAULT 0,
  `pomocnik 1` TEXT CHECK (length(`pomocnik 1`) <= 30),
  `% udziału p1` INTEGER CHECK (`% udziału p1` <= 255) CHECK (`% udziału p1` >= 0) DEFAULT 0,
  `pomocnik 2` TEXT CHECK (length(`pomocnik 2`) <= 30),
  `% udziału p2` INTEGER CHECK (`% udziału p2` <= 255) CHECK (`% udziału p2` >= 0) DEFAULT 0,
  `zgłoszone naprawy` TEXT,
  `uwagi o naprawie` INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (`ID`)
) STRICT;
CREATE INDEX IF NOT EXISTS `zlecenia instalacji gazowej IDX data zamknięcia` ON `zlecenia instalacji gazowej` (`data zamknięcia`);
CREATE INDEX IF NOT EXISTS `zlecenia instalacji gazowej IDX ID klienta` ON `zlecenia instalacji gazowej` (`ID klienta`);
CREATE INDEX IF NOT EXISTS `zlecenia instalacji gazowej IDX ID samochodu` ON `zlecenia instalacji gazowej` (`ID samochodu`);



CREATE TABLE IF NOT EXISTS `zlecenia naprawy` (
  `ID` INTEGER NOT NULL ,
  `ID klienta` INTEGER DEFAULT 0,
  `ID samochodu` INTEGER DEFAULT 0,
  `data otwarcia` TEXT CHECK (datetime(`data otwarcia`) IS NOT NULL) DEFAULT CURRENT_TIMESTAMP,
  `data zamknięcia` TEXT CHECK (datetime(`data zamknięcia`) IS NOT NULL),
  `zysk z części` TEXT CHECK (decimal(`zysk z części`) IS NOT NULL) DEFAULT 0,
  `zysk z robocizny` TEXT CHECK (decimal(`zysk z robocizny`) IS NOT NULL) DEFAULT 0,
  `mechanik prowadzący` TEXT CHECK (length(`mechanik prowadzący`) <= 30),
  `% udziału` INTEGER CHECK (`% udziału` <= 255) CHECK (`% udziału` >= 0) DEFAULT 0,
  `pomocnik 1` TEXT CHECK (length(`pomocnik 1`) <= 30),
  `% udziału p1` INTEGER CHECK (`% udziału p1` <= 255) CHECK (`% udziału p1` >= 0) DEFAULT 0,
  `pomocnik 2` TEXT CHECK (length(`pomocnik 2`) <= 30),
  `% udziału p2` INTEGER CHECK (`% udziału p2` <= 255) CHECK (`% udziału p2` >= 0) DEFAULT 0,
  `zgłoszone naprawy` TEXT,
  `uwagi o naprawie` TEXT,
  PRIMARY KEY (`ID`)
) STRICT;
CREATE INDEX IF NOT EXISTS `zlecenia naprawy IDX data zamknięcia` ON `zlecenia naprawy` (`data zamknięcia`);
CREATE INDEX IF NOT EXISTS `zlecenia naprawy IDX ID klienta` ON `zlecenia naprawy` (`ID klienta`);
CREATE INDEX IF NOT EXISTS `zlecenia naprawy IDX ID samochodu` ON `zlecenia naprawy` (`ID samochodu`);

