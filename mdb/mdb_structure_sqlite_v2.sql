
DROP VIEW IF EXISTS `DB_STRUCTURE_INFO`;
CREATE VIEW `DB_STRUCTURE_INFO` (`version_int`) AS SELECT 1 AS 'version_int';

DROP TABLE IF EXISTS `CENNIK  GM_migration`; CREATE TABLE `CENNIK  GM_migration` (
  `ID cennin GM` INTEGER NOT NULL PRIMARY KEY,
  `CATALOG_NO` TEXT CHECK (length(`CATALOG_NO`) <= 7) NOT NULL UNIQUE,
  `DESC_GER1` TEXT CHECK (length(`DESC_GER1`) <= 10),
  `DESC_GER2` TEXT CHECK (length(`DESC_GER2`) <= 10),
  `PRICE` REAL
) STRICT;
DROP VIEW IF EXISTS `CENNIK  GM_csv_view`;
CREATE TABlE IF NOT EXISTS `CENNIK  GM` AS SELECT * FROM `CENNIK  GM_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('CENNIK  GM')) INSERT INTO `CENNIK  GM_migration` SELECT
    iif('ID cennin GM' IN `migration_cols`, "ID cennin GM", NULL) as 'ID cennin GM',
    iif('CATALOG_NO' IN `migration_cols`, "CATALOG_NO", NULL) as 'CATALOG_NO',
    iif('DESC_GER1' IN `migration_cols`, "DESC_GER1", NULL) as 'DESC_GER1',
    iif('DESC_GER2' IN `migration_cols`, "DESC_GER2", NULL) as 'DESC_GER2',
    iif('PRICE' IN `migration_cols`, "PRICE", NULL) as 'PRICE'
  FROM `CENNIK  GM`;
DROP TABLE `CENNIK  GM`;
ALTER TABLE `CENNIK  GM_migration` RENAME TO `CENNIK  GM`;

DROP INDEX IF EXISTS `CENNIK  GM IDX ID cennin GM`; CREATE INDEX `CENNIK  GM IDX ID cennin GM` ON `CENNIK  GM` (`ID cennin GM`);
CREATE VIEW `CENNIK  GM_csv_view` (`ID cennin GM`, `CATALOG_NO`, `DESC_GER1`, `DESC_GER2`, `PRICE`) AS SELECT 
  CAST(`ID cennin GM` AS TEXT),
  `CATALOG_NO`,
  `DESC_GER1`,
  `DESC_GER2`,
  REPLACE(CAST(`PRICE` AS TEXT),".",",")
FROM `CENNIK  GM`;



DROP TABLE IF EXISTS `czynność_migration`; CREATE TABLE `czynność_migration` (
  `ID cynności` INTEGER NOT NULL PRIMARY KEY,
  `czynność` TEXT CHECK (length(`czynność`) <= 50) NOT NULL UNIQUE
) STRICT;
DROP VIEW IF EXISTS `czynność_csv_view`;
CREATE TABlE IF NOT EXISTS `czynność` AS SELECT * FROM `czynność_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('czynność')) INSERT INTO `czynność_migration` SELECT
    iif('ID cynności' IN `migration_cols`, "ID cynności", NULL) as 'ID cynności',
    iif('czynność' IN `migration_cols`, "czynność", NULL) as 'czynność'
  FROM `czynność`;
DROP TABLE `czynność`;
ALTER TABLE `czynność_migration` RENAME TO `czynność`;

DROP INDEX IF EXISTS `czynność IDX ID cynności`; CREATE INDEX `czynność IDX ID cynności` ON `czynność` (`ID cynności`);
CREATE VIEW `czynność_csv_view` (`ID cynności`, `czynność`) AS SELECT 
  CAST(`ID cynności` AS TEXT),
  `czynność`
FROM `czynność`;



DROP TABLE IF EXISTS `dane do zaświadczenie o sprawności inst_migration`; CREATE TABLE `dane do zaświadczenie o sprawności inst_migration` (
  `ID typów` INTEGER NOT NULL PRIMARY KEY,
  `Producent` TEXT CHECK (length(`Producent`) <= 15),
  `Typ/Nr` TEXT CHECK (length(`Typ/Nr`) <= 15) NOT NULL,
  `E-_` INTEGER CHECK (`E-_` <= 255 AND `E-_` >= 0) NOT NULL DEFAULT 0,
  `67R-_` TEXT CHECK (length(`67R-_`) <= 15) NOT NULL,
  `Ważność legalizacji zbiornika do` TEXT CHECK (`Ważność legalizacji zbiornika do` IS NULL OR datetime(`Ważność legalizacji zbiornika do`) IS NOT NULL),
  `ID obrotów mag` INTEGER NOT NULL DEFAULT 0
) STRICT;
DROP VIEW IF EXISTS `dane do zaświadczenie o sprawności inst_csv_view`;
CREATE TABlE IF NOT EXISTS `dane do zaświadczenie o sprawności inst` AS SELECT * FROM `dane do zaświadczenie o sprawności inst_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('dane do zaświadczenie o sprawności inst')) INSERT INTO `dane do zaświadczenie o sprawności inst_migration` SELECT
    iif('ID typów' IN `migration_cols`, "ID typów", NULL) as 'ID typów',
    iif('Producent' IN `migration_cols`, "Producent", NULL) as 'Producent',
    iif('Typ/Nr' IN `migration_cols`, "Typ/Nr", NULL) as 'Typ/Nr',
    iif('E-_' IN `migration_cols`, "E-_", NULL) as 'E-_',
    iif('67R-_' IN `migration_cols`, "67R-_", NULL) as '67R-_',
    iif('Ważność legalizacji zbiornika do' IN `migration_cols`, "Ważność legalizacji zbiornika do", NULL) as 'Ważność legalizacji zbiornika do',
    iif('ID obrotów mag' IN `migration_cols`, "ID obrotów mag", NULL) as 'ID obrotów mag'
  FROM `dane do zaświadczenie o sprawności inst`;
DROP TABLE `dane do zaświadczenie o sprawności inst`;
ALTER TABLE `dane do zaświadczenie o sprawności inst_migration` RENAME TO `dane do zaświadczenie o sprawności inst`;

DROP INDEX IF EXISTS `dane do zaświadczenie o sprawności inst IDX ID obrotów mag`; CREATE INDEX `dane do zaświadczenie o sprawności inst IDX ID obrotów mag` ON `dane do zaświadczenie o sprawności inst` (`ID obrotów mag`);
DROP INDEX IF EXISTS `dane do zaświadczenie o sprawności inst IDX ID typów`; CREATE INDEX `dane do zaświadczenie o sprawności inst IDX ID typów` ON `dane do zaświadczenie o sprawności inst` (`ID typów`);
CREATE VIEW `dane do zaświadczenie o sprawności inst_csv_view` (`ID typów`, `Producent`, `Typ/Nr`, `E-_`, `67R-_`, `Ważność legalizacji zbiornika do`, `ID obrotów mag`) AS SELECT 
  CAST(`ID typów` AS TEXT),
  `Producent`,
  `Typ/Nr`,
  CAST(`E-_` AS TEXT),
  `67R-_`,
  DATETIME(`Ważność legalizacji zbiornika do`),
  CAST(`ID obrotów mag` AS TEXT)
FROM `dane do zaświadczenie o sprawności inst`;



DROP TABLE IF EXISTS `dokumenty sprzedaży_migration`; CREATE TABLE `dokumenty sprzedaży_migration` (
  `ID dokumentu` INTEGER NOT NULL PRIMARY KEY,
  `nazwa dokumentu` TEXT CHECK (length(`nazwa dokumentu`) <= 50) NOT NULL,
  `nr dokumentu` TEXT CHECK (length(`nr dokumentu`) <= 15) NOT NULL UNIQUE,
  `ID zlecenia` INTEGER NOT NULL DEFAULT 0,
  `data wystawienia` TEXT CHECK (`data wystawienia` IS NULL OR datetime(`data wystawienia`) IS NOT NULL) DEFAULT CURRENT_TIMESTAMP
) STRICT;
DROP VIEW IF EXISTS `dokumenty sprzedaży_csv_view`;
CREATE TABlE IF NOT EXISTS `dokumenty sprzedaży` AS SELECT * FROM `dokumenty sprzedaży_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('dokumenty sprzedaży')) INSERT INTO `dokumenty sprzedaży_migration` SELECT
    iif('ID dokumentu' IN `migration_cols`, "ID dokumentu", NULL) as 'ID dokumentu',
    iif('nazwa dokumentu' IN `migration_cols`, "nazwa dokumentu", NULL) as 'nazwa dokumentu',
    iif('nr dokumentu' IN `migration_cols`, "nr dokumentu", NULL) as 'nr dokumentu',
    iif('ID zlecenia' IN `migration_cols`, "ID zlecenia", NULL) as 'ID zlecenia',
    iif('data wystawienia' IN `migration_cols`, "data wystawienia", NULL) as 'data wystawienia'
  FROM `dokumenty sprzedaży`;
DROP TABLE `dokumenty sprzedaży`;
ALTER TABLE `dokumenty sprzedaży_migration` RENAME TO `dokumenty sprzedaży`;

DROP INDEX IF EXISTS `dokumenty sprzedaży IDX ID dokumentu`; CREATE INDEX `dokumenty sprzedaży IDX ID dokumentu` ON `dokumenty sprzedaży` (`ID dokumentu`);
DROP INDEX IF EXISTS `dokumenty sprzedaży IDX ID zlecenia`; CREATE INDEX `dokumenty sprzedaży IDX ID zlecenia` ON `dokumenty sprzedaży` (`ID zlecenia`);
CREATE VIEW `dokumenty sprzedaży_csv_view` (`ID dokumentu`, `nazwa dokumentu`, `nr dokumentu`, `ID zlecenia`, `data wystawienia`) AS SELECT 
  CAST(`ID dokumentu` AS TEXT),
  `nazwa dokumentu`,
  `nr dokumentu`,
  CAST(`ID zlecenia` AS TEXT),
  DATETIME(`data wystawienia`)
FROM `dokumenty sprzedaży`;



DROP TABLE IF EXISTS `dokumenty sprzedaży chwilówk_migration`; CREATE TABLE `dokumenty sprzedaży chwilówk_migration` (
  `nazwa dokumentu` TEXT CHECK (length(`nazwa dokumentu`) <= 50) NOT NULL,
  `nr dokumentu` TEXT CHECK (length(`nr dokumentu`) <= 15) NOT NULL UNIQUE,
  `ID zlecenia` INTEGER NOT NULL DEFAULT 0,
  `data wystawienia` TEXT CHECK (`data wystawienia` IS NULL OR datetime(`data wystawienia`) IS NOT NULL) DEFAULT CURRENT_TIMESTAMP
) STRICT;
DROP VIEW IF EXISTS `dokumenty sprzedaży chwilówk_csv_view`;
CREATE TABlE IF NOT EXISTS `dokumenty sprzedaży chwilówk` AS SELECT * FROM `dokumenty sprzedaży chwilówk_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('dokumenty sprzedaży chwilówk')) INSERT INTO `dokumenty sprzedaży chwilówk_migration` SELECT
    iif('nazwa dokumentu' IN `migration_cols`, "nazwa dokumentu", NULL) as 'nazwa dokumentu',
    iif('nr dokumentu' IN `migration_cols`, "nr dokumentu", NULL) as 'nr dokumentu',
    iif('ID zlecenia' IN `migration_cols`, "ID zlecenia", NULL) as 'ID zlecenia',
    iif('data wystawienia' IN `migration_cols`, "data wystawienia", NULL) as 'data wystawienia'
  FROM `dokumenty sprzedaży chwilówk`;
DROP TABLE `dokumenty sprzedaży chwilówk`;
ALTER TABLE `dokumenty sprzedaży chwilówk_migration` RENAME TO `dokumenty sprzedaży chwilówk`;

DROP INDEX IF EXISTS `dokumenty sprzedaży chwilówk IDX ID zlecenia`; CREATE INDEX `dokumenty sprzedaży chwilówk IDX ID zlecenia` ON `dokumenty sprzedaży chwilówk` (`ID zlecenia`);
CREATE VIEW `dokumenty sprzedaży chwilówk_csv_view` (`nazwa dokumentu`, `nr dokumentu`, `ID zlecenia`, `data wystawienia`) AS SELECT 
  `nazwa dokumentu`,
  `nr dokumentu`,
  CAST(`ID zlecenia` AS TEXT),
  DATETIME(`data wystawienia`)
FROM `dokumenty sprzedaży chwilówk`;



DROP TABLE IF EXISTS `dostawcy_migration`; CREATE TABLE `dostawcy_migration` (
  `ID dostawcy - producenta` INTEGER NOT NULL PRIMARY KEY,
  `Nazwa` TEXT CHECK (length(`Nazwa`) <= 50) NOT NULL UNIQUE,
  `kod pocztowy` TEXT CHECK (length(`kod pocztowy`) <= 6) NOT NULL,
  `miejscowość` TEXT CHECK (length(`miejscowość`) <= 20) NOT NULL,
  `ulica nr domu` TEXT CHECK (length(`ulica nr domu`) <= 30),
  `tel 1` TEXT CHECK (length(`tel 1`) <= 15),
  `tel 2` TEXT CHECK (length(`tel 2`) <= 15),
  `fax` TEXT CHECK (length(`fax`) <= 15),
  `konto bank` TEXT CHECK (length(`konto bank`) <= 50),
  `nr konta` TEXT CHECK (length(`nr konta`) <= 50),
  `przedstawiciel` TEXT CHECK (length(`przedstawiciel`) <= 50),
  `@-maill` TEXT CHECK (length(`@-maill`) <= 30) UNIQUE,
  `NIP` TEXT CHECK (length(`NIP`) <= 14),
  `otrzymany rabat %` INTEGER CHECK (`otrzymany rabat %` <= 255 AND `otrzymany rabat %` >= 0) NOT NULL DEFAULT 0
) STRICT;
DROP VIEW IF EXISTS `dostawcy_csv_view`;
CREATE TABlE IF NOT EXISTS `dostawcy` AS SELECT * FROM `dostawcy_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('dostawcy')) INSERT INTO `dostawcy_migration` SELECT
    iif('ID dostawcy - producenta' IN `migration_cols`, "ID dostawcy - producenta", NULL) as 'ID dostawcy - producenta',
    iif('Nazwa' IN `migration_cols`, "Nazwa", NULL) as 'Nazwa',
    iif('kod pocztowy' IN `migration_cols`, "kod pocztowy", NULL) as 'kod pocztowy',
    iif('miejscowość' IN `migration_cols`, "miejscowość", NULL) as 'miejscowość',
    iif('ulica nr domu' IN `migration_cols`, "ulica nr domu", NULL) as 'ulica nr domu',
    iif('tel 1' IN `migration_cols`, "tel 1", NULL) as 'tel 1',
    iif('tel 2' IN `migration_cols`, "tel 2", NULL) as 'tel 2',
    iif('fax' IN `migration_cols`, "fax", NULL) as 'fax',
    iif('konto bank' IN `migration_cols`, "konto bank", NULL) as 'konto bank',
    iif('nr konta' IN `migration_cols`, "nr konta", NULL) as 'nr konta',
    iif('przedstawiciel' IN `migration_cols`, "przedstawiciel", NULL) as 'przedstawiciel',
    iif('@-maill' IN `migration_cols`, "@-maill", NULL) as '@-maill',
    iif('NIP' IN `migration_cols`, "NIP", NULL) as 'NIP',
    iif('otrzymany rabat %' IN `migration_cols`, "otrzymany rabat %", NULL) as 'otrzymany rabat %'
  FROM `dostawcy`;
DROP TABLE `dostawcy`;
ALTER TABLE `dostawcy_migration` RENAME TO `dostawcy`;

DROP INDEX IF EXISTS `dostawcy IDX ID dostawcy - producenta`; CREATE INDEX `dostawcy IDX ID dostawcy - producenta` ON `dostawcy` (`ID dostawcy - producenta`);
DROP INDEX IF EXISTS `dostawcy IDX kod pocztowy`; CREATE INDEX `dostawcy IDX kod pocztowy` ON `dostawcy` (`kod pocztowy`);
CREATE VIEW `dostawcy_csv_view` (`ID dostawcy - producenta`, `Nazwa`, `kod pocztowy`, `miejscowość`, `ulica nr domu`, `tel 1`, `tel 2`, `fax`, `konto bank`, `nr konta`, `przedstawiciel`, `@-maill`, `NIP`, `otrzymany rabat %`) AS SELECT 
  CAST(`ID dostawcy - producenta` AS TEXT),
  `Nazwa`,
  `kod pocztowy`,
  `miejscowość`,
  `ulica nr domu`,
  `tel 1`,
  `tel 2`,
  `fax`,
  `konto bank`,
  `nr konta`,
  `przedstawiciel`,
  `@-maill`,
  `NIP`,
  CAST(`otrzymany rabat %` AS TEXT)
FROM `dostawcy`;



DROP TABLE IF EXISTS `faktura szczegóły chwilówka_migration`; CREATE TABLE `faktura szczegóły chwilówka_migration` (
  `nazwa części lub czynności` TEXT CHECK (length(`nazwa części lub czynności`) <= 50),
  `jednostka` TEXT CHECK (length(`jednostka`) <= 5),
  `ilość` REAL DEFAULT 0,
  `cena netto` TEXT CHECK (`cena netto` IS NULL OR ((`cena netto` IS decimal(`cena netto`) OR `cena netto` LIKE (decimal(`cena netto`) || ' z_')) AND decimal_cmp(`cena netto`,"922337203685477,5808") < 0 AND decimal_cmp(`cena netto`,"-922337203685477,5808") > 0)) DEFAULT 0,
  `numer` TEXT CHECK (length(`numer`) <= 10)
) STRICT;
DROP VIEW IF EXISTS `faktura szczegóły chwilówka_csv_view`;
CREATE TABlE IF NOT EXISTS `faktura szczegóły chwilówka` AS SELECT * FROM `faktura szczegóły chwilówka_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('faktura szczegóły chwilówka')) INSERT INTO `faktura szczegóły chwilówka_migration` SELECT
    iif('nazwa części lub czynności' IN `migration_cols`, "nazwa części lub czynności", NULL) as 'nazwa części lub czynności',
    iif('jednostka' IN `migration_cols`, "jednostka", NULL) as 'jednostka',
    iif('ilość' IN `migration_cols`, "ilość", NULL) as 'ilość',
    iif('cena netto' IN `migration_cols`, "cena netto", NULL) as 'cena netto',
    iif('numer' IN `migration_cols`, "numer", NULL) as 'numer'
  FROM `faktura szczegóły chwilówka`;
DROP TABLE `faktura szczegóły chwilówka`;
ALTER TABLE `faktura szczegóły chwilówka_migration` RENAME TO `faktura szczegóły chwilówka`;

DROP INDEX IF EXISTS `faktura szczegóły chwilówka IDX numer`; CREATE INDEX `faktura szczegóły chwilówka IDX numer` ON `faktura szczegóły chwilówka` (`numer`);
DROP TRIGGER IF EXISTS `faktura szczegóły chwilówka_dec_insert_trigger`; CREATE TRIGGER `faktura szczegóły chwilówka_dec_insert_trigger` AFTER INSERT ON `faktura szczegóły chwilówka` BEGIN
   UPDATE `faktura szczegóły chwilówka` SET `cena netto` = decimal(new.`cena netto`) WHERE ROWID = new.ROWID;
END;
CREATE VIEW `faktura szczegóły chwilówka_csv_view` (`nazwa części lub czynności`, `jednostka`, `ilość`, `cena netto`, `numer`) AS SELECT 
  `nazwa części lub czynności`,
  `jednostka`,
  REPLACE(CAST(`ilość` AS TEXT),".",","),
  REPLACE(CAST(decimal(`cena netto`) AS TEXT),".",","),
  `numer`
FROM `faktura szczegóły chwilówka`;



DROP TABLE IF EXISTS `inwentaryzacja_migration`; CREATE TABLE `inwentaryzacja_migration` (
  `numer cz` TEXT CHECK (length(`numer cz`) <= 15) NOT NULL,
  `ilość` REAL,
  `data zapisu` TEXT CHECK (`data zapisu` IS NULL OR datetime(`data zapisu`) IS NOT NULL) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rodzaj dokumentu` TEXT CHECK (length(`rodzaj dokumentu`) <= 5) NOT NULL DEFAULT 'inwen',
  `numer dokumentu` INTEGER DEFAULT 4
) STRICT;
DROP VIEW IF EXISTS `inwentaryzacja_csv_view`;
CREATE TABlE IF NOT EXISTS `inwentaryzacja` AS SELECT * FROM `inwentaryzacja_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('inwentaryzacja')) INSERT INTO `inwentaryzacja_migration` SELECT
    iif('numer cz' IN `migration_cols`, "numer cz", NULL) as 'numer cz',
    iif('ilość' IN `migration_cols`, "ilość", NULL) as 'ilość',
    iif('data zapisu' IN `migration_cols`, "data zapisu", NULL) as 'data zapisu',
    iif('rodzaj dokumentu' IN `migration_cols`, "rodzaj dokumentu", NULL) as 'rodzaj dokumentu',
    iif('numer dokumentu' IN `migration_cols`, "numer dokumentu", NULL) as 'numer dokumentu'
  FROM `inwentaryzacja`;
DROP TABLE `inwentaryzacja`;
ALTER TABLE `inwentaryzacja_migration` RENAME TO `inwentaryzacja`;

DROP INDEX IF EXISTS `inwentaryzacja IDX numer dokumentu`; CREATE INDEX `inwentaryzacja IDX numer dokumentu` ON `inwentaryzacja` (`numer dokumentu`);
DROP INDEX IF EXISTS `inwentaryzacja IDX numer cz`; CREATE INDEX `inwentaryzacja IDX numer cz` ON `inwentaryzacja` (`numer cz`);
CREATE VIEW `inwentaryzacja_csv_view` (`numer cz`, `ilość`, `data zapisu`, `rodzaj dokumentu`, `numer dokumentu`) AS SELECT 
  `numer cz`,
  REPLACE(CAST(`ilość` AS TEXT),".",","),
  DATETIME(`data zapisu`),
  `rodzaj dokumentu`,
  CAST(`numer dokumentu` AS TEXT)
FROM `inwentaryzacja`;



DROP TABLE IF EXISTS `inwentaryzacja nr 3_migration`; CREATE TABLE `inwentaryzacja nr 3_migration` (
  `numer cz` TEXT CHECK (length(`numer cz`) <= 15) NOT NULL,
  `ilość` REAL,
  `data zapisu` TEXT CHECK (`data zapisu` IS NULL OR datetime(`data zapisu`) IS NOT NULL) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rodzaj dokumentu` TEXT CHECK (length(`rodzaj dokumentu`) <= 5) NOT NULL DEFAULT 'inwen',
  `numer dokumentu` INTEGER DEFAULT 3
) STRICT;
DROP VIEW IF EXISTS `inwentaryzacja nr 3_csv_view`;
CREATE TABlE IF NOT EXISTS `inwentaryzacja nr 3` AS SELECT * FROM `inwentaryzacja nr 3_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('inwentaryzacja nr 3')) INSERT INTO `inwentaryzacja nr 3_migration` SELECT
    iif('numer cz' IN `migration_cols`, "numer cz", NULL) as 'numer cz',
    iif('ilość' IN `migration_cols`, "ilość", NULL) as 'ilość',
    iif('data zapisu' IN `migration_cols`, "data zapisu", NULL) as 'data zapisu',
    iif('rodzaj dokumentu' IN `migration_cols`, "rodzaj dokumentu", NULL) as 'rodzaj dokumentu',
    iif('numer dokumentu' IN `migration_cols`, "numer dokumentu", NULL) as 'numer dokumentu'
  FROM `inwentaryzacja nr 3`;
DROP TABLE `inwentaryzacja nr 3`;
ALTER TABLE `inwentaryzacja nr 3_migration` RENAME TO `inwentaryzacja nr 3`;

DROP INDEX IF EXISTS `inwentaryzacja nr 3 IDX numer dokumentu`; CREATE INDEX `inwentaryzacja nr 3 IDX numer dokumentu` ON `inwentaryzacja nr 3` (`numer dokumentu`);
DROP INDEX IF EXISTS `inwentaryzacja nr 3 IDX numer cz`; CREATE INDEX `inwentaryzacja nr 3 IDX numer cz` ON `inwentaryzacja nr 3` (`numer cz`);
CREATE VIEW `inwentaryzacja nr 3_csv_view` (`numer cz`, `ilość`, `data zapisu`, `rodzaj dokumentu`, `numer dokumentu`) AS SELECT 
  `numer cz`,
  REPLACE(CAST(`ilość` AS TEXT),".",","),
  DATETIME(`data zapisu`),
  `rodzaj dokumentu`,
  CAST(`numer dokumentu` AS TEXT)
FROM `inwentaryzacja nr 3`;



DROP TABLE IF EXISTS `jamar_migration`; CREATE TABLE `jamar_migration` (
  `nazwa części lub czynności` TEXT CHECK (length(`nazwa części lub czynności`) <= 50),
  `jednostka` TEXT CHECK (length(`jednostka`) <= 5),
  `ilość` REAL DEFAULT 0,
  `cena netto` TEXT CHECK (`cena netto` IS NULL OR ((`cena netto` IS decimal(`cena netto`) OR `cena netto` LIKE (decimal(`cena netto`) || ' z_')) AND decimal_cmp(`cena netto`,"922337203685477,5808") < 0 AND decimal_cmp(`cena netto`,"-922337203685477,5808") > 0)) DEFAULT 0,
  `numer` TEXT CHECK (length(`numer`) <= 10)
) STRICT;
DROP VIEW IF EXISTS `jamar_csv_view`;
CREATE TABlE IF NOT EXISTS `jamar` AS SELECT * FROM `jamar_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('jamar')) INSERT INTO `jamar_migration` SELECT
    iif('nazwa części lub czynności' IN `migration_cols`, "nazwa części lub czynności", NULL) as 'nazwa części lub czynności',
    iif('jednostka' IN `migration_cols`, "jednostka", NULL) as 'jednostka',
    iif('ilość' IN `migration_cols`, "ilość", NULL) as 'ilość',
    iif('cena netto' IN `migration_cols`, "cena netto", NULL) as 'cena netto',
    iif('numer' IN `migration_cols`, "numer", NULL) as 'numer'
  FROM `jamar`;
DROP TABLE `jamar`;
ALTER TABLE `jamar_migration` RENAME TO `jamar`;

DROP INDEX IF EXISTS `jamar IDX numer`; CREATE INDEX `jamar IDX numer` ON `jamar` (`numer`);
DROP TRIGGER IF EXISTS `jamar_dec_insert_trigger`; CREATE TRIGGER `jamar_dec_insert_trigger` AFTER INSERT ON `jamar` BEGIN
   UPDATE `jamar` SET `cena netto` = decimal(new.`cena netto`) WHERE ROWID = new.ROWID;
END;
CREATE VIEW `jamar_csv_view` (`nazwa części lub czynności`, `jednostka`, `ilość`, `cena netto`, `numer`) AS SELECT 
  `nazwa części lub czynności`,
  `jednostka`,
  REPLACE(CAST(`ilość` AS TEXT),".",","),
  REPLACE(CAST(decimal(`cena netto`) AS TEXT),".",","),
  `numer`
FROM `jamar`;



DROP TABLE IF EXISTS `klienci_migration`; CREATE TABLE `klienci_migration` (
  `ID` INTEGER NOT NULL PRIMARY KEY,
  `NAZWA` TEXT CHECK (length(`NAZWA`) <= 60) NOT NULL UNIQUE,
  `MIASTO` TEXT CHECK (length(`MIASTO`) <= 20) NOT NULL,
  `ULICA` TEXT CHECK (length(`ULICA`) <= 30) NOT NULL,
  `KOD_POCZT` TEXT CHECK (length(`KOD_POCZT`) <= 10) NOT NULL,
  `TELEFON1` TEXT CHECK (length(`TELEFON1`) <= 17),
  `TELEFON2` TEXT CHECK (length(`TELEFON2`) <= 17),
  `NIP` TEXT CHECK (length(`NIP`) <= 13) UNIQUE,
  `KTO` TEXT CHECK (length(`KTO`) <= 8),
  `KIEDY` TEXT CHECK (`KIEDY` IS NULL OR datetime(`KIEDY`) IS NOT NULL) DEFAULT CURRENT_TIMESTAMP,
  `UPUST` INTEGER CHECK (`UPUST` <= 255 AND `UPUST` >= 0) DEFAULT 0,
  `odbierający fakturę` TEXT CHECK (length(`odbierający fakturę`) <= 50),
  `list` INTEGER CHECK (`list` <= 1 AND `list` >= 0),
  `aux_info` TEXT DEFAULT NULL
) STRICT;
DROP VIEW IF EXISTS `klienci_csv_view`;
CREATE TABlE IF NOT EXISTS `klienci` AS SELECT * FROM `klienci_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('klienci')) INSERT INTO `klienci_migration` SELECT
    iif('ID' IN `migration_cols`, "ID", NULL) as 'ID',
    iif('NAZWA' IN `migration_cols`, "NAZWA", NULL) as 'NAZWA',
    iif('MIASTO' IN `migration_cols`, "MIASTO", NULL) as 'MIASTO',
    iif('ULICA' IN `migration_cols`, "ULICA", NULL) as 'ULICA',
    iif('KOD_POCZT' IN `migration_cols`, "KOD_POCZT", NULL) as 'KOD_POCZT',
    iif('TELEFON1' IN `migration_cols`, "TELEFON1", NULL) as 'TELEFON1',
    iif('TELEFON2' IN `migration_cols`, "TELEFON2", NULL) as 'TELEFON2',
    iif('NIP' IN `migration_cols`, "NIP", NULL) as 'NIP',
    iif('KTO' IN `migration_cols`, "KTO", NULL) as 'KTO',
    iif('KIEDY' IN `migration_cols`, "KIEDY", NULL) as 'KIEDY',
    iif('UPUST' IN `migration_cols`, "UPUST", NULL) as 'UPUST',
    iif('odbierający fakturę' IN `migration_cols`, "odbierający fakturę", NULL) as 'odbierający fakturę',
    iif('list' IN `migration_cols`, "list", NULL) as 'list',
    iif('aux_info' IN `migration_cols`, "aux_info", NULL) as 'aux_info'
  FROM `klienci`;
DROP TABLE `klienci`;
ALTER TABLE `klienci_migration` RENAME TO `klienci`;

DROP INDEX IF EXISTS `klienci IDX ID`; CREATE INDEX `klienci IDX ID` ON `klienci` (`ID`);
DROP INDEX IF EXISTS `klienci IDX KOD_POCZT`; CREATE INDEX `klienci IDX KOD_POCZT` ON `klienci` (`KOD_POCZT`);
CREATE VIEW `klienci_csv_view` (`ID`, `NAZWA`, `MIASTO`, `ULICA`, `KOD_POCZT`, `TELEFON1`, `TELEFON2`, `NIP`, `KTO`, `KIEDY`, `UPUST`, `odbierający fakturę`, `list`, `aux_info`) AS SELECT 
  CAST(`ID` AS TEXT),
  `NAZWA`,
  `MIASTO`,
  `ULICA`,
  `KOD_POCZT`,
  `TELEFON1`,
  `TELEFON2`,
  `NIP`,
  `KTO`,
  DATETIME(`KIEDY`),
  CAST(`UPUST` AS TEXT),
  `odbierający fakturę`,
  CAST(`list` AS TEXT),
  `aux_info`
FROM `klienci`;



DROP TABLE IF EXISTS `liczby słownie_migration`; CREATE TABLE `liczby słownie_migration` (
  `liczba` REAL NOT NULL PRIMARY KEY,
  `słownie` TEXT CHECK (length(`słownie`) <= 100) NOT NULL UNIQUE
) STRICT;
DROP VIEW IF EXISTS `liczby słownie_csv_view`;
CREATE TABlE IF NOT EXISTS `liczby słownie` AS SELECT * FROM `liczby słownie_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('liczby słownie')) INSERT INTO `liczby słownie_migration` SELECT
    iif('liczba' IN `migration_cols`, "liczba", NULL) as 'liczba',
    iif('słownie' IN `migration_cols`, "słownie", NULL) as 'słownie'
  FROM `liczby słownie`;
DROP TABLE `liczby słownie`;
ALTER TABLE `liczby słownie_migration` RENAME TO `liczby słownie`;

CREATE VIEW `liczby słownie_csv_view` (`liczba`, `słownie`) AS SELECT 
  REPLACE(CAST(`liczba` AS TEXT),".",","),
  `słownie`
FROM `liczby słownie`;



DROP TABLE IF EXISTS `modele sam_migration`; CREATE TABLE `modele sam_migration` (
  `ID modelu` INTEGER NOT NULL PRIMARY KEY,
  `Model:` TEXT CHECK (length(`Model:`) <= 15),
  `Typ:` TEXT CHECK (length(`Typ:`) <= 15) UNIQUE,
  `Nadw:` TEXT CHECK (length(`Nadw:`) <= 7),
  `Rok produkcji:` TEXT CHECK (length(`Rok produkcji:`) <= 7),
  `Silnik:` TEXT CHECK (length(`Silnik:`) <= 10),
  `Kod:` TEXT CHECK (length(`Kod:`) <= 15)
) STRICT;
DROP VIEW IF EXISTS `modele sam_csv_view`;
CREATE TABlE IF NOT EXISTS `modele sam` AS SELECT * FROM `modele sam_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('modele sam')) INSERT INTO `modele sam_migration` SELECT
    iif('ID modelu' IN `migration_cols`, "ID modelu", NULL) as 'ID modelu',
    iif('Model:' IN `migration_cols`, "Model:", NULL) as 'Model:',
    iif('Typ:' IN `migration_cols`, "Typ:", NULL) as 'Typ:',
    iif('Nadw:' IN `migration_cols`, "Nadw:", NULL) as 'Nadw:',
    iif('Rok produkcji:' IN `migration_cols`, "Rok produkcji:", NULL) as 'Rok produkcji:',
    iif('Silnik:' IN `migration_cols`, "Silnik:", NULL) as 'Silnik:',
    iif('Kod:' IN `migration_cols`, "Kod:", NULL) as 'Kod:'
  FROM `modele sam`;
DROP TABLE `modele sam`;
ALTER TABLE `modele sam_migration` RENAME TO `modele sam`;

DROP INDEX IF EXISTS `modele sam IDX ID modelu`; CREATE INDEX `modele sam IDX ID modelu` ON `modele sam` (`ID modelu`);
DROP INDEX IF EXISTS `modele sam IDX Kod:`; CREATE INDEX `modele sam IDX Kod:` ON `modele sam` (`Kod:`);
CREATE VIEW `modele sam_csv_view` (`ID modelu`, `Model:`, `Typ:`, `Nadw:`, `Rok produkcji:`, `Silnik:`, `Kod:`) AS SELECT 
  CAST(`ID modelu` AS TEXT),
  `Model:`,
  `Typ:`,
  `Nadw:`,
  `Rok produkcji:`,
  `Silnik:`,
  `Kod:`
FROM `modele sam`;



DROP TABLE IF EXISTS `nazwy części_migration`; CREATE TABLE `nazwy części_migration` (
  `numer części` TEXT CHECK (length(`numer części`) <= 15) NOT NULL UNIQUE PRIMARY KEY,
  `nazwa części` TEXT CHECK (length(`nazwa części`) <= 255),
  `jednostka` TEXT CHECK (length(`jednostka`) <= 50) DEFAULT 'szt.',
  `grupa` REAL DEFAULT 0,
  `VAT` REAL DEFAULT .22,
  `ilość w opakowaniu zbiorczym` INTEGER CHECK (`ilość w opakowaniu zbiorczym` <= 255 AND `ilość w opakowaniu zbiorczym` >= 0) DEFAULT 0,
  `lokalizacja w magazynie` TEXT CHECK (length(`lokalizacja w magazynie`) <= 10),
  `odpowiedniki` TEXT CHECK (length(`odpowiedniki`) <= 50)
) STRICT;
DROP VIEW IF EXISTS `nazwy części_csv_view`;
CREATE TABlE IF NOT EXISTS `nazwy części` AS SELECT * FROM `nazwy części_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('nazwy części')) INSERT INTO `nazwy części_migration` SELECT
    iif('numer części' IN `migration_cols`, "numer części", NULL) as 'numer części',
    iif('nazwa części' IN `migration_cols`, "nazwa części", NULL) as 'nazwa części',
    iif('jednostka' IN `migration_cols`, "jednostka", NULL) as 'jednostka',
    iif('grupa' IN `migration_cols`, "grupa", NULL) as 'grupa',
    iif('VAT' IN `migration_cols`, "VAT", NULL) as 'VAT',
    iif('ilość w opakowaniu zbiorczym' IN `migration_cols`, "ilość w opakowaniu zbiorczym", NULL) as 'ilość w opakowaniu zbiorczym',
    iif('lokalizacja w magazynie' IN `migration_cols`, "lokalizacja w magazynie", NULL) as 'lokalizacja w magazynie',
    iif('odpowiedniki' IN `migration_cols`, "odpowiedniki", NULL) as 'odpowiedniki'
  FROM `nazwy części`;
DROP TABLE `nazwy części`;
ALTER TABLE `nazwy części_migration` RENAME TO `nazwy części`;

CREATE VIEW `nazwy części_csv_view` (`numer części`, `nazwa części`, `jednostka`, `grupa`, `VAT`, `ilość w opakowaniu zbiorczym`, `lokalizacja w magazynie`, `odpowiedniki`) AS SELECT 
  `numer części`,
  `nazwa części`,
  `jednostka`,
  REPLACE(CAST(`grupa` AS TEXT),".",","),
  REPLACE(CAST(`VAT` AS TEXT),".",","),
  CAST(`ilość w opakowaniu zbiorczym` AS TEXT),
  `lokalizacja w magazynie`,
  `odpowiedniki`
FROM `nazwy części`;



DROP TABLE IF EXISTS `obroty magazynowe_migration`; CREATE TABLE `obroty magazynowe_migration` (
  `ID` INTEGER NOT NULL PRIMARY KEY,
  `numer cz` TEXT CHECK (length(`numer cz`) <= 15) NOT NULL,
  `ilość` REAL NOT NULL,
  `cena netto` TEXT CHECK (`cena netto` IS NULL OR ((`cena netto` IS decimal(`cena netto`) OR `cena netto` LIKE (decimal(`cena netto`) || ' z_')) AND decimal_cmp(`cena netto`,"922337203685477,5808") < 0 AND decimal_cmp(`cena netto`,"-922337203685477,5808") > 0)) DEFAULT 0,
  `data przyjęcia` TEXT CHECK (`data przyjęcia` IS NULL OR datetime(`data przyjęcia`) IS NOT NULL) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rodzaj dokumentu` TEXT CHECK (length(`rodzaj dokumentu`) <= 5) NOT NULL,
  `numer dokumentu` INTEGER DEFAULT 0,
  `cena netto sprzedaży` TEXT CHECK (`cena netto sprzedaży` IS NULL OR ((`cena netto sprzedaży` IS decimal(`cena netto sprzedaży`) OR `cena netto sprzedaży` LIKE (decimal(`cena netto sprzedaży`) || ' z_')) AND decimal_cmp(`cena netto sprzedaży`,"922337203685477,5808") < 0 AND decimal_cmp(`cena netto sprzedaży`,"-922337203685477,5808") > 0)) DEFAULT 0
) STRICT;
DROP VIEW IF EXISTS `obroty magazynowe_csv_view`;
CREATE TABlE IF NOT EXISTS `obroty magazynowe` AS SELECT * FROM `obroty magazynowe_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('obroty magazynowe')) INSERT INTO `obroty magazynowe_migration` SELECT
    iif('ID' IN `migration_cols`, "ID", NULL) as 'ID',
    iif('numer cz' IN `migration_cols`, "numer cz", NULL) as 'numer cz',
    iif('ilość' IN `migration_cols`, "ilość", NULL) as 'ilość',
    iif('cena netto' IN `migration_cols`, "cena netto", NULL) as 'cena netto',
    iif('data przyjęcia' IN `migration_cols`, "data przyjęcia", NULL) as 'data przyjęcia',
    iif('rodzaj dokumentu' IN `migration_cols`, "rodzaj dokumentu", NULL) as 'rodzaj dokumentu',
    iif('numer dokumentu' IN `migration_cols`, "numer dokumentu", NULL) as 'numer dokumentu',
    iif('cena netto sprzedaży' IN `migration_cols`, "cena netto sprzedaży", NULL) as 'cena netto sprzedaży'
  FROM `obroty magazynowe`;
DROP TABLE `obroty magazynowe`;
ALTER TABLE `obroty magazynowe_migration` RENAME TO `obroty magazynowe`;

DROP INDEX IF EXISTS `obroty magazynowe IDX ID`; CREATE INDEX `obroty magazynowe IDX ID` ON `obroty magazynowe` (`ID`);
DROP INDEX IF EXISTS `obroty magazynowe IDX ilość`; CREATE INDEX `obroty magazynowe IDX ilość` ON `obroty magazynowe` (`ilość`);
DROP INDEX IF EXISTS `obroty magazynowe IDX numer dokumentu`; CREATE INDEX `obroty magazynowe IDX numer dokumentu` ON `obroty magazynowe` (`numer dokumentu`);
DROP INDEX IF EXISTS `obroty magazynowe IDX numer cz`; CREATE INDEX `obroty magazynowe IDX numer cz` ON `obroty magazynowe` (`numer cz`);
DROP INDEX IF EXISTS `obroty magazynowe IDX rodzaj dokumentu`; CREATE INDEX `obroty magazynowe IDX rodzaj dokumentu` ON `obroty magazynowe` (`rodzaj dokumentu`);
DROP INDEX IF EXISTS `obroty magazynowe IDX rodzaj dokumentu,numer dokumentu`; CREATE INDEX `obroty magazynowe IDX rodzaj dokumentu,numer dokumentu` ON `obroty magazynowe` (`rodzaj dokumentu`, `numer dokumentu`);
DROP TRIGGER IF EXISTS `obroty magazynowe_dec_insert_trigger`; CREATE TRIGGER `obroty magazynowe_dec_insert_trigger` AFTER INSERT ON `obroty magazynowe` BEGIN
   UPDATE `obroty magazynowe` SET `cena netto` = decimal(new.`cena netto`), `cena netto sprzedaży` = decimal(new.`cena netto sprzedaży`) WHERE ROWID = new.ROWID;
END;
CREATE VIEW `obroty magazynowe_csv_view` (`ID`, `numer cz`, `ilość`, `cena netto`, `data przyjęcia`, `rodzaj dokumentu`, `numer dokumentu`, `cena netto sprzedaży`) AS SELECT 
  CAST(`ID` AS TEXT),
  `numer cz`,
  REPLACE(CAST(`ilość` AS TEXT),".",","),
  REPLACE(CAST(decimal(`cena netto`) AS TEXT),".",","),
  DATETIME(`data przyjęcia`),
  `rodzaj dokumentu`,
  CAST(`numer dokumentu` AS TEXT),
  REPLACE(CAST(decimal(`cena netto sprzedaży`) AS TEXT),".",",")
FROM `obroty magazynowe`;



DROP TABLE IF EXISTS `płace_migration`; CREATE TABLE `płace_migration` (
  `ID płac` INTEGER NOT NULL PRIMARY KEY,
  `ID pracownika` INTEGER DEFAULT 0,
  `data` TEXT CHECK (length(`data`) <= 10),
  `kwota` REAL DEFAULT 0,
  `podstawa` TEXT CHECK (length(`podstawa`) <= 15),
  `miesiąc płacenia` TEXT CHECK (`miesiąc płacenia` IS NULL OR datetime(`miesiąc płacenia`) IS NOT NULL)
) STRICT;
DROP VIEW IF EXISTS `płace_csv_view`;
CREATE TABlE IF NOT EXISTS `płace` AS SELECT * FROM `płace_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('płace')) INSERT INTO `płace_migration` SELECT
    iif('ID płac' IN `migration_cols`, "ID płac", NULL) as 'ID płac',
    iif('ID pracownika' IN `migration_cols`, "ID pracownika", NULL) as 'ID pracownika',
    iif('data' IN `migration_cols`, "data", NULL) as 'data',
    iif('kwota' IN `migration_cols`, "kwota", NULL) as 'kwota',
    iif('podstawa' IN `migration_cols`, "podstawa", NULL) as 'podstawa',
    iif('miesiąc płacenia' IN `migration_cols`, "miesiąc płacenia", NULL) as 'miesiąc płacenia'
  FROM `płace`;
DROP TABLE `płace`;
ALTER TABLE `płace_migration` RENAME TO `płace`;

DROP INDEX IF EXISTS `płace IDX ID płac`; CREATE INDEX `płace IDX ID płac` ON `płace` (`ID płac`);
DROP INDEX IF EXISTS `płace IDX ID pracownika`; CREATE INDEX `płace IDX ID pracownika` ON `płace` (`ID pracownika`);
CREATE VIEW `płace_csv_view` (`ID płac`, `ID pracownika`, `data`, `kwota`, `podstawa`, `miesiąc płacenia`) AS SELECT 
  CAST(`ID płac` AS TEXT),
  CAST(`ID pracownika` AS TEXT),
  `data`,
  REPLACE(CAST(`kwota` AS TEXT),".",","),
  `podstawa`,
  DATETIME(`miesiąc płacenia`)
FROM `płace`;



DROP TABLE IF EXISTS `pracownicy_migration`; CREATE TABLE `pracownicy_migration` (
  `ID pracownika` INTEGER NOT NULL PRIMARY KEY,
  `nazwisko` TEXT CHECK (length(`nazwisko`) <= 15),
  `imię` TEXT CHECK (length(`imię`) <= 15),
  `inię II` TEXT CHECK (length(`inię II`) <= 15),
  `nazwisko rodowe` TEXT CHECK (length(`nazwisko rodowe`) <= 15),
  `imię ojca` TEXT CHECK (length(`imię ojca`) <= 15),
  `imię matki` TEXT CHECK (length(`imię matki`) <= 15),
  `nazwisko rodowe matki` TEXT CHECK (length(`nazwisko rodowe matki`) <= 15),
  `data urodzenia` TEXT CHECK (`data urodzenia` IS NULL OR datetime(`data urodzenia`) IS NOT NULL) NOT NULL,
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
  `stanowisko` TEXT CHECK (length(`stanowisko`) <= 15)
) STRICT;
DROP VIEW IF EXISTS `pracownicy_csv_view`;
CREATE TABlE IF NOT EXISTS `pracownicy` AS SELECT * FROM `pracownicy_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('pracownicy')) INSERT INTO `pracownicy_migration` SELECT
    iif('ID pracownika' IN `migration_cols`, "ID pracownika", NULL) as 'ID pracownika',
    iif('nazwisko' IN `migration_cols`, "nazwisko", NULL) as 'nazwisko',
    iif('imię' IN `migration_cols`, "imię", NULL) as 'imię',
    iif('inię II' IN `migration_cols`, "inię II", NULL) as 'inię II',
    iif('nazwisko rodowe' IN `migration_cols`, "nazwisko rodowe", NULL) as 'nazwisko rodowe',
    iif('imię ojca' IN `migration_cols`, "imię ojca", NULL) as 'imię ojca',
    iif('imię matki' IN `migration_cols`, "imię matki", NULL) as 'imię matki',
    iif('nazwisko rodowe matki' IN `migration_cols`, "nazwisko rodowe matki", NULL) as 'nazwisko rodowe matki',
    iif('data urodzenia' IN `migration_cols`, "data urodzenia", NULL) as 'data urodzenia',
    iif('miejsce urodzenia' IN `migration_cols`, "miejsce urodzenia", NULL) as 'miejsce urodzenia',
    iif('obywatelstwo' IN `migration_cols`, "obywatelstwo", NULL) as 'obywatelstwo',
    iif('nr PESEL' IN `migration_cols`, "nr PESEL", NULL) as 'nr PESEL',
    iif('nr NIP' IN `migration_cols`, "nr NIP", NULL) as 'nr NIP',
    iif('ul i nr domu' IN `migration_cols`, "ul i nr domu", NULL) as 'ul i nr domu',
    iif('kod' IN `migration_cols`, "kod", NULL) as 'kod',
    iif('miejscowość' IN `migration_cols`, "miejscowość", NULL) as 'miejscowość',
    iif('tel domowy' IN `migration_cols`, "tel domowy", NULL) as 'tel domowy',
    iif('wykształcenie' IN `migration_cols`, "wykształcenie", NULL) as 'wykształcenie',
    iif('wykształcenie uzupełniające' IN `migration_cols`, "wykształcenie uzupełniające", NULL) as 'wykształcenie uzupełniające',
    iif('dodatkowe uprawnienia' IN `migration_cols`, "dodatkowe uprawnienia", NULL) as 'dodatkowe uprawnienia',
    iif('stanowisko' IN `migration_cols`, "stanowisko", NULL) as 'stanowisko'
  FROM `pracownicy`;
DROP TABLE `pracownicy`;
ALTER TABLE `pracownicy_migration` RENAME TO `pracownicy`;

DROP INDEX IF EXISTS `pracownicy IDX ID pracownika`; CREATE INDEX `pracownicy IDX ID pracownika` ON `pracownicy` (`ID pracownika`);
DROP INDEX IF EXISTS `pracownicy IDX kod`; CREATE INDEX `pracownicy IDX kod` ON `pracownicy` (`kod`);
DROP INDEX IF EXISTS `pracownicy IDX nazwisko`; CREATE INDEX `pracownicy IDX nazwisko` ON `pracownicy` (`nazwisko`);
CREATE VIEW `pracownicy_csv_view` (`ID pracownika`, `nazwisko`, `imię`, `inię II`, `nazwisko rodowe`, `imię ojca`, `imię matki`, `nazwisko rodowe matki`, `data urodzenia`, `miejsce urodzenia`, `obywatelstwo`, `nr PESEL`, `nr NIP`, `ul i nr domu`, `kod`, `miejscowość`, `tel domowy`, `wykształcenie`, `wykształcenie uzupełniające`, `dodatkowe uprawnienia`, `stanowisko`) AS SELECT 
  CAST(`ID pracownika` AS TEXT),
  `nazwisko`,
  `imię`,
  `inię II`,
  `nazwisko rodowe`,
  `imię ojca`,
  `imię matki`,
  `nazwisko rodowe matki`,
  DATETIME(`data urodzenia`),
  `miejsce urodzenia`,
  `obywatelstwo`,
  `nr PESEL`,
  `nr NIP`,
  `ul i nr domu`,
  `kod`,
  `miejscowość`,
  `tel domowy`,
  `wykształcenie`,
  `wykształcenie uzupełniające`,
  `dodatkowe uprawnienia`,
  `stanowisko`
FROM `pracownicy`;



DROP TABLE IF EXISTS `przyjęcia PZ_migration`; CREATE TABLE `przyjęcia PZ_migration` (
  `numer cz` TEXT CHECK (length(`numer cz`) <= 15) NOT NULL,
  `ilość` REAL,
  `cena netto` TEXT CHECK (`cena netto` IS NULL OR ((`cena netto` IS decimal(`cena netto`) OR `cena netto` LIKE (decimal(`cena netto`) || ' z_')) AND decimal_cmp(`cena netto`,"922337203685477,5808") < 0 AND decimal_cmp(`cena netto`,"-922337203685477,5808") > 0)) DEFAULT 0,
  `data przyjęcia` TEXT CHECK (`data przyjęcia` IS NULL OR datetime(`data przyjęcia`) IS NOT NULL) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `rodzaj dokumentu` TEXT CHECK (length(`rodzaj dokumentu`) <= 5) NOT NULL DEFAULT 'dosta',
  `numer dokumentu` INTEGER DEFAULT 0
) STRICT;
DROP VIEW IF EXISTS `przyjęcia PZ_csv_view`;
CREATE TABlE IF NOT EXISTS `przyjęcia PZ` AS SELECT * FROM `przyjęcia PZ_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('przyjęcia PZ')) INSERT INTO `przyjęcia PZ_migration` SELECT
    iif('numer cz' IN `migration_cols`, "numer cz", NULL) as 'numer cz',
    iif('ilość' IN `migration_cols`, "ilość", NULL) as 'ilość',
    iif('cena netto' IN `migration_cols`, "cena netto", NULL) as 'cena netto',
    iif('data przyjęcia' IN `migration_cols`, "data przyjęcia", NULL) as 'data przyjęcia',
    iif('rodzaj dokumentu' IN `migration_cols`, "rodzaj dokumentu", NULL) as 'rodzaj dokumentu',
    iif('numer dokumentu' IN `migration_cols`, "numer dokumentu", NULL) as 'numer dokumentu'
  FROM `przyjęcia PZ`;
DROP TABLE `przyjęcia PZ`;
ALTER TABLE `przyjęcia PZ_migration` RENAME TO `przyjęcia PZ`;

DROP INDEX IF EXISTS `przyjęcia PZ IDX numer dokumentu`; CREATE INDEX `przyjęcia PZ IDX numer dokumentu` ON `przyjęcia PZ` (`numer dokumentu`);
DROP INDEX IF EXISTS `przyjęcia PZ IDX numer cz`; CREATE INDEX `przyjęcia PZ IDX numer cz` ON `przyjęcia PZ` (`numer cz`);
DROP TRIGGER IF EXISTS `przyjęcia PZ_dec_insert_trigger`; CREATE TRIGGER `przyjęcia PZ_dec_insert_trigger` AFTER INSERT ON `przyjęcia PZ` BEGIN
   UPDATE `przyjęcia PZ` SET `cena netto` = decimal(new.`cena netto`) WHERE ROWID = new.ROWID;
END;
CREATE VIEW `przyjęcia PZ_csv_view` (`numer cz`, `ilość`, `cena netto`, `data przyjęcia`, `rodzaj dokumentu`, `numer dokumentu`) AS SELECT 
  `numer cz`,
  REPLACE(CAST(`ilość` AS TEXT),".",","),
  REPLACE(CAST(decimal(`cena netto`) AS TEXT),".",","),
  DATETIME(`data przyjęcia`),
  `rodzaj dokumentu`,
  CAST(`numer dokumentu` AS TEXT)
FROM `przyjęcia PZ`;



DROP TABLE IF EXISTS `rodzaje dokumentów_migration`; CREATE TABLE `rodzaje dokumentów_migration` (
  `rodzaj dokumentu` TEXT CHECK (length(`rodzaj dokumentu`) <= 5)
) STRICT;
DROP VIEW IF EXISTS `rodzaje dokumentów_csv_view`;
CREATE TABlE IF NOT EXISTS `rodzaje dokumentów` AS SELECT * FROM `rodzaje dokumentów_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('rodzaje dokumentów')) INSERT INTO `rodzaje dokumentów_migration` SELECT
    iif('rodzaj dokumentu' IN `migration_cols`, "rodzaj dokumentu", NULL) as 'rodzaj dokumentu'
  FROM `rodzaje dokumentów`;
DROP TABLE `rodzaje dokumentów`;
ALTER TABLE `rodzaje dokumentów_migration` RENAME TO `rodzaje dokumentów`;

DROP INDEX IF EXISTS `rodzaje dokumentów IDX rodzaj dokumentu`; CREATE INDEX `rodzaje dokumentów IDX rodzaj dokumentu` ON `rodzaje dokumentów` (`rodzaj dokumentu`);
CREATE VIEW `rodzaje dokumentów_csv_view` (`rodzaj dokumentu`) AS SELECT 
  `rodzaj dokumentu`
FROM `rodzaje dokumentów`;



DROP TABLE IF EXISTS `samochody klientów_migration`; CREATE TABLE `samochody klientów_migration` (
  `ID` INTEGER NOT NULL PRIMARY KEY,
  `kalkulacja` INTEGER DEFAULT 0,
  `marka` TEXT CHECK (length(`marka`) <= 15) NOT NULL,
  `model` TEXT CHECK (length(`model`) <= 15) NOT NULL,
  `nr rej` TEXT CHECK (length(`nr rej`) <= 15) NOT NULL,
  `ID klienta` INTEGER DEFAULT 0,
  `nr silnika` TEXT CHECK (length(`nr silnika`) <= 20) NOT NULL,
  `nr nadwozia` TEXT CHECK (length(`nr nadwozia`) <= 25) NOT NULL
) STRICT;
DROP VIEW IF EXISTS `samochody klientów_csv_view`;
CREATE TABlE IF NOT EXISTS `samochody klientów` AS SELECT * FROM `samochody klientów_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('samochody klientów')) INSERT INTO `samochody klientów_migration` SELECT
    iif('ID' IN `migration_cols`, "ID", NULL) as 'ID',
    iif('kalkulacja' IN `migration_cols`, "kalkulacja", NULL) as 'kalkulacja',
    iif('marka' IN `migration_cols`, "marka", NULL) as 'marka',
    iif('model' IN `migration_cols`, "model", NULL) as 'model',
    iif('nr rej' IN `migration_cols`, "nr rej", NULL) as 'nr rej',
    iif('ID klienta' IN `migration_cols`, "ID klienta", NULL) as 'ID klienta',
    iif('nr silnika' IN `migration_cols`, "nr silnika", NULL) as 'nr silnika',
    iif('nr nadwozia' IN `migration_cols`, "nr nadwozia", NULL) as 'nr nadwozia'
  FROM `samochody klientów`;
DROP TABLE `samochody klientów`;
ALTER TABLE `samochody klientów_migration` RENAME TO `samochody klientów`;

DROP INDEX IF EXISTS `samochody klientów IDX ID`; CREATE INDEX `samochody klientów IDX ID` ON `samochody klientów` (`ID`);
DROP INDEX IF EXISTS `samochody klientów IDX ID klienta`; CREATE INDEX `samochody klientów IDX ID klienta` ON `samochody klientów` (`ID klienta`);
DROP INDEX IF EXISTS `samochody klientów IDX nr rej`; CREATE INDEX `samochody klientów IDX nr rej` ON `samochody klientów` (`nr rej`);
CREATE VIEW `samochody klientów_csv_view` (`ID`, `kalkulacja`, `marka`, `model`, `nr rej`, `ID klienta`, `nr silnika`, `nr nadwozia`) AS SELECT 
  CAST(`ID` AS TEXT),
  CAST(`kalkulacja` AS TEXT),
  `marka`,
  `model`,
  `nr rej`,
  CAST(`ID klienta` AS TEXT),
  `nr silnika`,
  `nr nadwozia`
FROM `samochody klientów`;



DROP TABLE IF EXISTS `sposób zapłaty_migration`; CREATE TABLE `sposób zapłaty_migration` (
  `sposób zapłaty` TEXT CHECK (length(`sposób zapłaty`) <= 15)
) STRICT;
DROP VIEW IF EXISTS `sposób zapłaty_csv_view`;
CREATE TABlE IF NOT EXISTS `sposób zapłaty` AS SELECT * FROM `sposób zapłaty_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('sposób zapłaty')) INSERT INTO `sposób zapłaty_migration` SELECT
    iif('sposób zapłaty' IN `migration_cols`, "sposób zapłaty", NULL) as 'sposób zapłaty'
  FROM `sposób zapłaty`;
DROP TABLE `sposób zapłaty`;
ALTER TABLE `sposób zapłaty_migration` RENAME TO `sposób zapłaty`;

CREATE VIEW `sposób zapłaty_csv_view` (`sposób zapłaty`) AS SELECT 
  `sposób zapłaty`
FROM `sposób zapłaty`;



DROP TABLE IF EXISTS `sprzedaż_migration`; CREATE TABLE `sprzedaż_migration` (
  `numer cz` TEXT CHECK (length(`numer cz`) <= 15) NOT NULL UNIQUE,
  `ilość` REAL,
  `cena netto sprzedaży` TEXT CHECK (`cena netto sprzedaży` IS NULL OR ((`cena netto sprzedaży` IS decimal(`cena netto sprzedaży`) OR `cena netto sprzedaży` LIKE (decimal(`cena netto sprzedaży`) || ' z_')) AND decimal_cmp(`cena netto sprzedaży`,"922337203685477,5808") < 0 AND decimal_cmp(`cena netto sprzedaży`,"-922337203685477,5808") > 0)),
  `cena netto` TEXT CHECK (`cena netto` IS NULL OR ((`cena netto` IS decimal(`cena netto`) OR `cena netto` LIKE (decimal(`cena netto`) || ' z_')) AND decimal_cmp(`cena netto`,"922337203685477,5808") < 0 AND decimal_cmp(`cena netto`,"-922337203685477,5808") > 0)) DEFAULT 0,
  `rodzaj dokumentu` TEXT CHECK (length(`rodzaj dokumentu`) <= 5) NOT NULL,
  `numer dokumentu` INTEGER NOT NULL,
  `data przyjęcia` TEXT CHECK (`data przyjęcia` IS NULL OR datetime(`data przyjęcia`) IS NOT NULL) NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;
DROP VIEW IF EXISTS `sprzedaż_csv_view`;
CREATE TABlE IF NOT EXISTS `sprzedaż` AS SELECT * FROM `sprzedaż_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('sprzedaż')) INSERT INTO `sprzedaż_migration` SELECT
    iif('numer cz' IN `migration_cols`, "numer cz", NULL) as 'numer cz',
    iif('ilość' IN `migration_cols`, "ilość", NULL) as 'ilość',
    iif('cena netto sprzedaży' IN `migration_cols`, "cena netto sprzedaży", NULL) as 'cena netto sprzedaży',
    iif('cena netto' IN `migration_cols`, "cena netto", NULL) as 'cena netto',
    iif('rodzaj dokumentu' IN `migration_cols`, "rodzaj dokumentu", NULL) as 'rodzaj dokumentu',
    iif('numer dokumentu' IN `migration_cols`, "numer dokumentu", NULL) as 'numer dokumentu',
    iif('data przyjęcia' IN `migration_cols`, "data przyjęcia", NULL) as 'data przyjęcia'
  FROM `sprzedaż`;
DROP TABLE `sprzedaż`;
ALTER TABLE `sprzedaż_migration` RENAME TO `sprzedaż`;

DROP INDEX IF EXISTS `sprzedaż IDX numer dokumentu`; CREATE INDEX `sprzedaż IDX numer dokumentu` ON `sprzedaż` (`numer dokumentu`);
DROP INDEX IF EXISTS `sprzedaż IDX rodzaj dokumentu`; CREATE INDEX `sprzedaż IDX rodzaj dokumentu` ON `sprzedaż` (`rodzaj dokumentu`);
DROP TRIGGER IF EXISTS `sprzedaż_dec_insert_trigger`; CREATE TRIGGER `sprzedaż_dec_insert_trigger` AFTER INSERT ON `sprzedaż` BEGIN
   UPDATE `sprzedaż` SET `cena netto sprzedaży` = decimal(new.`cena netto sprzedaży`), `cena netto` = decimal(new.`cena netto`) WHERE ROWID = new.ROWID;
END;
CREATE VIEW `sprzedaż_csv_view` (`numer cz`, `ilość`, `cena netto sprzedaży`, `cena netto`, `rodzaj dokumentu`, `numer dokumentu`, `data przyjęcia`) AS SELECT 
  `numer cz`,
  REPLACE(CAST(`ilość` AS TEXT),".",","),
  REPLACE(CAST(decimal(`cena netto sprzedaży`) AS TEXT),".",","),
  REPLACE(CAST(decimal(`cena netto`) AS TEXT),".",","),
  `rodzaj dokumentu`,
  CAST(`numer dokumentu` AS TEXT),
  DATETIME(`data przyjęcia`)
FROM `sprzedaż`;



DROP TABLE IF EXISTS `zamówienia części_migration`; CREATE TABLE `zamówienia części_migration` (
  `numer części` TEXT CHECK (length(`numer części`) <= 15),
  `ilość` REAL DEFAULT 0,
  `data zamówienia` TEXT CHECK (`data zamówienia` IS NULL OR datetime(`data zamówienia`) IS NOT NULL) DEFAULT CURRENT_TIMESTAMP,
  `uwagi / przeznaczenie` TEXT CHECK (length(`uwagi / przeznaczenie`) <= 50)
) STRICT;
DROP VIEW IF EXISTS `zamówienia części_csv_view`;
CREATE TABlE IF NOT EXISTS `zamówienia części` AS SELECT * FROM `zamówienia części_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('zamówienia części')) INSERT INTO `zamówienia części_migration` SELECT
    iif('numer części' IN `migration_cols`, "numer części", NULL) as 'numer części',
    iif('ilość' IN `migration_cols`, "ilość", NULL) as 'ilość',
    iif('data zamówienia' IN `migration_cols`, "data zamówienia", NULL) as 'data zamówienia',
    iif('uwagi / przeznaczenie' IN `migration_cols`, "uwagi / przeznaczenie", NULL) as 'uwagi / przeznaczenie'
  FROM `zamówienia części`;
DROP TABLE `zamówienia części`;
ALTER TABLE `zamówienia części_migration` RENAME TO `zamówienia części`;

DROP INDEX IF EXISTS `zamówienia części IDX numer części`; CREATE INDEX `zamówienia części IDX numer części` ON `zamówienia części` (`numer części`);
CREATE VIEW `zamówienia części_csv_view` (`numer części`, `ilość`, `data zamówienia`, `uwagi / przeznaczenie`) AS SELECT 
  `numer części`,
  REPLACE(CAST(`ilość` AS TEXT),".",","),
  DATETIME(`data zamówienia`),
  `uwagi / przeznaczenie`
FROM `zamówienia części`;



DROP TABLE IF EXISTS `zamówienia części archiwum_migration`; CREATE TABLE `zamówienia części archiwum_migration` (
  `numer części` TEXT CHECK (length(`numer części`) <= 15),
  `ilość` REAL DEFAULT 0,
  `data zamówienia` TEXT CHECK (`data zamówienia` IS NULL OR datetime(`data zamówienia`) IS NOT NULL) DEFAULT CURRENT_TIMESTAMP,
  `data realizacji` TEXT CHECK (`data realizacji` IS NULL OR datetime(`data realizacji`) IS NOT NULL),
  `uwagi / przeznaczenie` TEXT CHECK (length(`uwagi / przeznaczenie`) <= 50),
  `zlealizowane` INTEGER CHECK (`zlealizowane` <= 1 AND `zlealizowane` >= 0)
) STRICT;
DROP VIEW IF EXISTS `zamówienia części archiwum_csv_view`;
CREATE TABlE IF NOT EXISTS `zamówienia części archiwum` AS SELECT * FROM `zamówienia części archiwum_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('zamówienia części archiwum')) INSERT INTO `zamówienia części archiwum_migration` SELECT
    iif('numer części' IN `migration_cols`, "numer części", NULL) as 'numer części',
    iif('ilość' IN `migration_cols`, "ilość", NULL) as 'ilość',
    iif('data zamówienia' IN `migration_cols`, "data zamówienia", NULL) as 'data zamówienia',
    iif('data realizacji' IN `migration_cols`, "data realizacji", NULL) as 'data realizacji',
    iif('uwagi / przeznaczenie' IN `migration_cols`, "uwagi / przeznaczenie", NULL) as 'uwagi / przeznaczenie',
    iif('zlealizowane' IN `migration_cols`, "zlealizowane", NULL) as 'zlealizowane'
  FROM `zamówienia części archiwum`;
DROP TABLE `zamówienia części archiwum`;
ALTER TABLE `zamówienia części archiwum_migration` RENAME TO `zamówienia części archiwum`;

DROP INDEX IF EXISTS `zamówienia części archiwum IDX data zamówienia`; CREATE INDEX `zamówienia części archiwum IDX data zamówienia` ON `zamówienia części archiwum` (`data zamówienia`);
DROP INDEX IF EXISTS `zamówienia części archiwum IDX numer części`; CREATE INDEX `zamówienia części archiwum IDX numer części` ON `zamówienia części archiwum` (`numer części`);
DROP INDEX IF EXISTS `zamówienia części archiwum IDX zlealizowane`; CREATE INDEX `zamówienia części archiwum IDX zlealizowane` ON `zamówienia części archiwum` (`zlealizowane`);
CREATE VIEW `zamówienia części archiwum_csv_view` (`numer części`, `ilość`, `data zamówienia`, `data realizacji`, `uwagi / przeznaczenie`, `zlealizowane`) AS SELECT 
  `numer części`,
  REPLACE(CAST(`ilość` AS TEXT),".",","),
  DATETIME(`data zamówienia`),
  DATETIME(`data realizacji`),
  `uwagi / przeznaczenie`,
  CAST(`zlealizowane` AS TEXT)
FROM `zamówienia części archiwum`;



DROP TABLE IF EXISTS `zlecenia czynności_migration`; CREATE TABLE `zlecenia czynności_migration` (
  `ID zlecenia` INTEGER DEFAULT 0,
  `ID czynności` INTEGER DEFAULT 0,
  `krotność wykonania` REAL DEFAULT 0,
  `cena netto` TEXT CHECK (`cena netto` IS NULL OR ((`cena netto` IS decimal(`cena netto`) OR `cena netto` LIKE (decimal(`cena netto`) || ' z_')) AND decimal_cmp(`cena netto`,"922337203685477,5808") < 0 AND decimal_cmp(`cena netto`,"-922337203685477,5808") > 0)) DEFAULT 0
) STRICT;
DROP VIEW IF EXISTS `zlecenia czynności_csv_view`;
CREATE TABlE IF NOT EXISTS `zlecenia czynności` AS SELECT * FROM `zlecenia czynności_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('zlecenia czynności')) INSERT INTO `zlecenia czynności_migration` SELECT
    iif('ID zlecenia' IN `migration_cols`, "ID zlecenia", NULL) as 'ID zlecenia',
    iif('ID czynności' IN `migration_cols`, "ID czynności", NULL) as 'ID czynności',
    iif('krotność wykonania' IN `migration_cols`, "krotność wykonania", NULL) as 'krotność wykonania',
    iif('cena netto' IN `migration_cols`, "cena netto", NULL) as 'cena netto'
  FROM `zlecenia czynności`;
DROP TABLE `zlecenia czynności`;
ALTER TABLE `zlecenia czynności_migration` RENAME TO `zlecenia czynności`;

DROP INDEX IF EXISTS `zlecenia czynności IDX ID czynności`; CREATE INDEX `zlecenia czynności IDX ID czynności` ON `zlecenia czynności` (`ID czynności`);
DROP INDEX IF EXISTS `zlecenia czynności IDX ID zlecenia`; CREATE INDEX `zlecenia czynności IDX ID zlecenia` ON `zlecenia czynności` (`ID zlecenia`);
DROP TRIGGER IF EXISTS `zlecenia czynności_dec_insert_trigger`; CREATE TRIGGER `zlecenia czynności_dec_insert_trigger` AFTER INSERT ON `zlecenia czynności` BEGIN
   UPDATE `zlecenia czynności` SET `cena netto` = decimal(new.`cena netto`) WHERE ROWID = new.ROWID;
END;
CREATE VIEW `zlecenia czynności_csv_view` (`ID zlecenia`, `ID czynności`, `krotność wykonania`, `cena netto`) AS SELECT 
  CAST(`ID zlecenia` AS TEXT),
  CAST(`ID czynności` AS TEXT),
  REPLACE(CAST(`krotność wykonania` AS TEXT),".",","),
  REPLACE(CAST(decimal(`cena netto`) AS TEXT),".",",")
FROM `zlecenia czynności`;



DROP TABLE IF EXISTS `zlecenia gaz_migration`; CREATE TABLE `zlecenia gaz_migration` (
  `ID zlecenia` INTEGER DEFAULT 0,
  `ID czynności` INTEGER DEFAULT 0,
  `krotność wykonania` REAL DEFAULT 0,
  `cena netto` TEXT CHECK (`cena netto` IS NULL OR ((`cena netto` IS decimal(`cena netto`) OR `cena netto` LIKE (decimal(`cena netto`) || ' z_')) AND decimal_cmp(`cena netto`,"922337203685477,5808") < 0 AND decimal_cmp(`cena netto`,"-922337203685477,5808") > 0)) DEFAULT 0
) STRICT;
DROP VIEW IF EXISTS `zlecenia gaz_csv_view`;
CREATE TABlE IF NOT EXISTS `zlecenia gaz` AS SELECT * FROM `zlecenia gaz_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('zlecenia gaz')) INSERT INTO `zlecenia gaz_migration` SELECT
    iif('ID zlecenia' IN `migration_cols`, "ID zlecenia", NULL) as 'ID zlecenia',
    iif('ID czynności' IN `migration_cols`, "ID czynności", NULL) as 'ID czynności',
    iif('krotność wykonania' IN `migration_cols`, "krotność wykonania", NULL) as 'krotność wykonania',
    iif('cena netto' IN `migration_cols`, "cena netto", NULL) as 'cena netto'
  FROM `zlecenia gaz`;
DROP TABLE `zlecenia gaz`;
ALTER TABLE `zlecenia gaz_migration` RENAME TO `zlecenia gaz`;

DROP INDEX IF EXISTS `zlecenia gaz IDX ID czynności`; CREATE INDEX `zlecenia gaz IDX ID czynności` ON `zlecenia gaz` (`ID czynności`);
DROP INDEX IF EXISTS `zlecenia gaz IDX ID zlecenia`; CREATE INDEX `zlecenia gaz IDX ID zlecenia` ON `zlecenia gaz` (`ID zlecenia`);
DROP TRIGGER IF EXISTS `zlecenia gaz_dec_insert_trigger`; CREATE TRIGGER `zlecenia gaz_dec_insert_trigger` AFTER INSERT ON `zlecenia gaz` BEGIN
   UPDATE `zlecenia gaz` SET `cena netto` = decimal(new.`cena netto`) WHERE ROWID = new.ROWID;
END;
CREATE VIEW `zlecenia gaz_csv_view` (`ID zlecenia`, `ID czynności`, `krotność wykonania`, `cena netto`) AS SELECT 
  CAST(`ID zlecenia` AS TEXT),
  CAST(`ID czynności` AS TEXT),
  REPLACE(CAST(`krotność wykonania` AS TEXT),".",","),
  REPLACE(CAST(decimal(`cena netto`) AS TEXT),".",",")
FROM `zlecenia gaz`;



DROP TABLE IF EXISTS `zlecenia instalacji gazowej_migration`; CREATE TABLE `zlecenia instalacji gazowej_migration` (
  `ID` INTEGER NOT NULL PRIMARY KEY,
  `ID klienta` INTEGER DEFAULT 0,
  `ID samochodu` INTEGER DEFAULT 0,
  `data otwarcia` TEXT CHECK (`data otwarcia` IS NULL OR datetime(`data otwarcia`) IS NOT NULL) DEFAULT CURRENT_TIMESTAMP,
  `data zamknięcia` TEXT CHECK (`data zamknięcia` IS NULL OR datetime(`data zamknięcia`) IS NOT NULL),
  `zysk z części` TEXT CHECK (`zysk z części` IS NULL OR ((`zysk z części` IS decimal(`zysk z części`) OR `zysk z części` LIKE (decimal(`zysk z części`) || ' z_')) AND decimal_cmp(`zysk z części`,"922337203685477,5808") < 0 AND decimal_cmp(`zysk z części`,"-922337203685477,5808") > 0)) DEFAULT 0,
  `zysk z robocizny` TEXT CHECK (`zysk z robocizny` IS NULL OR ((`zysk z robocizny` IS decimal(`zysk z robocizny`) OR `zysk z robocizny` LIKE (decimal(`zysk z robocizny`) || ' z_')) AND decimal_cmp(`zysk z robocizny`,"922337203685477,5808") < 0 AND decimal_cmp(`zysk z robocizny`,"-922337203685477,5808") > 0)) DEFAULT 0,
  `mechanik prowadzący` TEXT CHECK (length(`mechanik prowadzący`) <= 30),
  `% udziału` INTEGER CHECK (`% udziału` <= 255 AND `% udziału` >= 0) DEFAULT 0,
  `pomocnik 1` TEXT CHECK (length(`pomocnik 1`) <= 30),
  `% udziału p1` INTEGER CHECK (`% udziału p1` <= 255 AND `% udziału p1` >= 0) DEFAULT 0,
  `pomocnik 2` TEXT CHECK (length(`pomocnik 2`) <= 30),
  `% udziału p2` INTEGER CHECK (`% udziału p2` <= 255 AND `% udziału p2` >= 0) DEFAULT 0,
  `zgłoszone naprawy` TEXT,
  `uwagi o naprawie` INTEGER NOT NULL DEFAULT 0
) STRICT;
DROP VIEW IF EXISTS `zlecenia instalacji gazowej_csv_view`;
CREATE TABlE IF NOT EXISTS `zlecenia instalacji gazowej` AS SELECT * FROM `zlecenia instalacji gazowej_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('zlecenia instalacji gazowej')) INSERT INTO `zlecenia instalacji gazowej_migration` SELECT
    iif('ID' IN `migration_cols`, "ID", NULL) as 'ID',
    iif('ID klienta' IN `migration_cols`, "ID klienta", NULL) as 'ID klienta',
    iif('ID samochodu' IN `migration_cols`, "ID samochodu", NULL) as 'ID samochodu',
    iif('data otwarcia' IN `migration_cols`, "data otwarcia", NULL) as 'data otwarcia',
    iif('data zamknięcia' IN `migration_cols`, "data zamknięcia", NULL) as 'data zamknięcia',
    iif('zysk z części' IN `migration_cols`, "zysk z części", NULL) as 'zysk z części',
    iif('zysk z robocizny' IN `migration_cols`, "zysk z robocizny", NULL) as 'zysk z robocizny',
    iif('mechanik prowadzący' IN `migration_cols`, "mechanik prowadzący", NULL) as 'mechanik prowadzący',
    iif('% udziału' IN `migration_cols`, "% udziału", NULL) as '% udziału',
    iif('pomocnik 1' IN `migration_cols`, "pomocnik 1", NULL) as 'pomocnik 1',
    iif('% udziału p1' IN `migration_cols`, "% udziału p1", NULL) as '% udziału p1',
    iif('pomocnik 2' IN `migration_cols`, "pomocnik 2", NULL) as 'pomocnik 2',
    iif('% udziału p2' IN `migration_cols`, "% udziału p2", NULL) as '% udziału p2',
    iif('zgłoszone naprawy' IN `migration_cols`, "zgłoszone naprawy", NULL) as 'zgłoszone naprawy',
    iif('uwagi o naprawie' IN `migration_cols`, "uwagi o naprawie", NULL) as 'uwagi o naprawie'
  FROM `zlecenia instalacji gazowej`;
DROP TABLE `zlecenia instalacji gazowej`;
ALTER TABLE `zlecenia instalacji gazowej_migration` RENAME TO `zlecenia instalacji gazowej`;

DROP INDEX IF EXISTS `zlecenia instalacji gazowej IDX data zamknięcia`; CREATE INDEX `zlecenia instalacji gazowej IDX data zamknięcia` ON `zlecenia instalacji gazowej` (`data zamknięcia`);
DROP INDEX IF EXISTS `zlecenia instalacji gazowej IDX ID`; CREATE INDEX `zlecenia instalacji gazowej IDX ID` ON `zlecenia instalacji gazowej` (`ID`);
DROP INDEX IF EXISTS `zlecenia instalacji gazowej IDX ID klienta`; CREATE INDEX `zlecenia instalacji gazowej IDX ID klienta` ON `zlecenia instalacji gazowej` (`ID klienta`);
DROP INDEX IF EXISTS `zlecenia instalacji gazowej IDX ID samochodu`; CREATE INDEX `zlecenia instalacji gazowej IDX ID samochodu` ON `zlecenia instalacji gazowej` (`ID samochodu`);
DROP TRIGGER IF EXISTS `zlecenia instalacji gazowej_dec_insert_trigger`; CREATE TRIGGER `zlecenia instalacji gazowej_dec_insert_trigger` AFTER INSERT ON `zlecenia instalacji gazowej` BEGIN
   UPDATE `zlecenia instalacji gazowej` SET `zysk z części` = decimal(new.`zysk z części`), `zysk z robocizny` = decimal(new.`zysk z robocizny`) WHERE ROWID = new.ROWID;
END;
CREATE VIEW `zlecenia instalacji gazowej_csv_view` (`ID`, `ID klienta`, `ID samochodu`, `data otwarcia`, `data zamknięcia`, `zysk z części`, `zysk z robocizny`, `mechanik prowadzący`, `% udziału`, `pomocnik 1`, `% udziału p1`, `pomocnik 2`, `% udziału p2`, `zgłoszone naprawy`, `uwagi o naprawie`) AS SELECT 
  CAST(`ID` AS TEXT),
  CAST(`ID klienta` AS TEXT),
  CAST(`ID samochodu` AS TEXT),
  DATETIME(`data otwarcia`),
  DATETIME(`data zamknięcia`),
  REPLACE(CAST(decimal(`zysk z części`) AS TEXT),".",","),
  REPLACE(CAST(decimal(`zysk z robocizny`) AS TEXT),".",","),
  `mechanik prowadzący`,
  CAST(`% udziału` AS TEXT),
  `pomocnik 1`,
  CAST(`% udziału p1` AS TEXT),
  `pomocnik 2`,
  CAST(`% udziału p2` AS TEXT),
  `zgłoszone naprawy`,
  CAST(`uwagi o naprawie` AS TEXT)
FROM `zlecenia instalacji gazowej`;



DROP TABLE IF EXISTS `zlecenia naprawy_migration`; CREATE TABLE `zlecenia naprawy_migration` (
  `ID` INTEGER NOT NULL PRIMARY KEY,
  `ID klienta` INTEGER DEFAULT 0,
  `ID samochodu` INTEGER DEFAULT 0,
  `data otwarcia` TEXT CHECK (`data otwarcia` IS NULL OR datetime(`data otwarcia`) IS NOT NULL) DEFAULT CURRENT_TIMESTAMP,
  `data zamknięcia` TEXT CHECK (`data zamknięcia` IS NULL OR datetime(`data zamknięcia`) IS NOT NULL),
  `zysk z części` TEXT CHECK (`zysk z części` IS NULL OR ((`zysk z części` IS decimal(`zysk z części`) OR `zysk z części` LIKE (decimal(`zysk z części`) || ' z_')) AND decimal_cmp(`zysk z części`,"922337203685477,5808") < 0 AND decimal_cmp(`zysk z części`,"-922337203685477,5808") > 0)) DEFAULT 0,
  `zysk z robocizny` TEXT CHECK (`zysk z robocizny` IS NULL OR ((`zysk z robocizny` IS decimal(`zysk z robocizny`) OR `zysk z robocizny` LIKE (decimal(`zysk z robocizny`) || ' z_')) AND decimal_cmp(`zysk z robocizny`,"922337203685477,5808") < 0 AND decimal_cmp(`zysk z robocizny`,"-922337203685477,5808") > 0)) DEFAULT 0,
  `mechanik prowadzący` TEXT CHECK (length(`mechanik prowadzący`) <= 30),
  `% udziału` INTEGER CHECK (`% udziału` <= 255 AND `% udziału` >= 0) DEFAULT 0,
  `pomocnik 1` TEXT CHECK (length(`pomocnik 1`) <= 30),
  `% udziału p1` INTEGER CHECK (`% udziału p1` <= 255 AND `% udziału p1` >= 0) DEFAULT 0,
  `pomocnik 2` TEXT CHECK (length(`pomocnik 2`) <= 30),
  `% udziału p2` INTEGER CHECK (`% udziału p2` <= 255 AND `% udziału p2` >= 0) DEFAULT 0,
  `zgłoszone naprawy` TEXT,
  `uwagi o naprawie` TEXT
) STRICT;
DROP VIEW IF EXISTS `zlecenia naprawy_csv_view`;
CREATE TABlE IF NOT EXISTS `zlecenia naprawy` AS SELECT * FROM `zlecenia naprawy_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('zlecenia naprawy')) INSERT INTO `zlecenia naprawy_migration` SELECT
    iif('ID' IN `migration_cols`, "ID", NULL) as 'ID',
    iif('ID klienta' IN `migration_cols`, "ID klienta", NULL) as 'ID klienta',
    iif('ID samochodu' IN `migration_cols`, "ID samochodu", NULL) as 'ID samochodu',
    iif('data otwarcia' IN `migration_cols`, "data otwarcia", NULL) as 'data otwarcia',
    iif('data zamknięcia' IN `migration_cols`, "data zamknięcia", NULL) as 'data zamknięcia',
    iif('zysk z części' IN `migration_cols`, "zysk z części", NULL) as 'zysk z części',
    iif('zysk z robocizny' IN `migration_cols`, "zysk z robocizny", NULL) as 'zysk z robocizny',
    iif('mechanik prowadzący' IN `migration_cols`, "mechanik prowadzący", NULL) as 'mechanik prowadzący',
    iif('% udziału' IN `migration_cols`, "% udziału", NULL) as '% udziału',
    iif('pomocnik 1' IN `migration_cols`, "pomocnik 1", NULL) as 'pomocnik 1',
    iif('% udziału p1' IN `migration_cols`, "% udziału p1", NULL) as '% udziału p1',
    iif('pomocnik 2' IN `migration_cols`, "pomocnik 2", NULL) as 'pomocnik 2',
    iif('% udziału p2' IN `migration_cols`, "% udziału p2", NULL) as '% udziału p2',
    iif('zgłoszone naprawy' IN `migration_cols`, "zgłoszone naprawy", NULL) as 'zgłoszone naprawy',
    iif('uwagi o naprawie' IN `migration_cols`, "uwagi o naprawie", NULL) as 'uwagi o naprawie'
  FROM `zlecenia naprawy`;
DROP TABLE `zlecenia naprawy`;
ALTER TABLE `zlecenia naprawy_migration` RENAME TO `zlecenia naprawy`;

DROP INDEX IF EXISTS `zlecenia naprawy IDX data zamknięcia`; CREATE INDEX `zlecenia naprawy IDX data zamknięcia` ON `zlecenia naprawy` (`data zamknięcia`);
DROP INDEX IF EXISTS `zlecenia naprawy IDX ID`; CREATE INDEX `zlecenia naprawy IDX ID` ON `zlecenia naprawy` (`ID`);
DROP INDEX IF EXISTS `zlecenia naprawy IDX ID klienta`; CREATE INDEX `zlecenia naprawy IDX ID klienta` ON `zlecenia naprawy` (`ID klienta`);
DROP INDEX IF EXISTS `zlecenia naprawy IDX ID samochodu`; CREATE INDEX `zlecenia naprawy IDX ID samochodu` ON `zlecenia naprawy` (`ID samochodu`);
DROP TRIGGER IF EXISTS `zlecenia naprawy_dec_insert_trigger`; CREATE TRIGGER `zlecenia naprawy_dec_insert_trigger` AFTER INSERT ON `zlecenia naprawy` BEGIN
   UPDATE `zlecenia naprawy` SET `zysk z części` = decimal(new.`zysk z części`), `zysk z robocizny` = decimal(new.`zysk z robocizny`) WHERE ROWID = new.ROWID;
END;
CREATE VIEW `zlecenia naprawy_csv_view` (`ID`, `ID klienta`, `ID samochodu`, `data otwarcia`, `data zamknięcia`, `zysk z części`, `zysk z robocizny`, `mechanik prowadzący`, `% udziału`, `pomocnik 1`, `% udziału p1`, `pomocnik 2`, `% udziału p2`, `zgłoszone naprawy`, `uwagi o naprawie`) AS SELECT 
  CAST(`ID` AS TEXT),
  CAST(`ID klienta` AS TEXT),
  CAST(`ID samochodu` AS TEXT),
  DATETIME(`data otwarcia`),
  DATETIME(`data zamknięcia`),
  REPLACE(CAST(decimal(`zysk z części`) AS TEXT),".",","),
  REPLACE(CAST(decimal(`zysk z robocizny`) AS TEXT),".",","),
  `mechanik prowadzący`,
  CAST(`% udziału` AS TEXT),
  `pomocnik 1`,
  CAST(`% udziału p1` AS TEXT),
  `pomocnik 2`,
  CAST(`% udziału p2` AS TEXT),
  `zgłoszone naprawy`,
  `uwagi o naprawie`
FROM `zlecenia naprawy`;



DROP TABLE IF EXISTS `_meta_setting_json_migration`; CREATE TABLE `_meta_setting_json_migration` (
  `key` TEXT PRIMARY KEY,
  `value` TEXT
) STRICT;
DROP VIEW IF EXISTS `_meta_setting_json_csv_view`;
CREATE TABlE IF NOT EXISTS `_meta_setting_json` AS SELECT * FROM `_meta_setting_json_migration`;
 WITH `migration_cols` AS (SELECT name FROM pragma_table_info('_meta_setting_json')) INSERT INTO `_meta_setting_json_migration` SELECT
    iif('key' IN `migration_cols`, "key", NULL) as 'key',
    iif('value' IN `migration_cols`, "value", NULL) as 'value'
  FROM `_meta_setting_json`;
DROP TABLE `_meta_setting_json`;
ALTER TABLE `_meta_setting_json_migration` RENAME TO `_meta_setting_json`;



