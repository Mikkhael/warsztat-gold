//@ts-check

/**
 * @param {string} value 
 */
function xml_escape(value) {
    return ( value.replace('"', "&quot;")
                  .replace("'", "&apos;")
                  .replace("<","&lt;")
                  .replace(">","&gt;")
                  .replace("&","&amp;") );
}

/**
 * @param {string} name 
 * @param {string} content 
 * @param {Object.<string, string>} attrbs 
 */
function xml_create_node_parsed(name, content, attrbs = {}) {
    name = xml_escape(name);
    let attrbs_str = ""
    if(Object.keys(attrbs).length > 0) {
        attrbs     = Object.fromEntries( Object.entries(attrbs).map(x => x.map(xx => xml_escape(xx))) );
        attrbs_str = Object.entries( attrbs ).map( ([k,v]) => ` ${k}="${v}"` ).join('');
    }
    return `<${name}${attrbs_str}>${content}</${name}>`;
}

/**
 * @param {string} name 
 * @param {string} content 
 * @param {Object.<string, string>} attrbs 
 */
function xml_create_node_unparsed(name, content, attrbs = {}) {
    return xml_create_node_parsed(name, xml_escape(content), attrbs);
}

/**
 * @param {string} name 
 * @param {string} content 
 * @param {Object.<string, string>} attrbs 
 */
function xml_create_node_unparsed_opt(name, content, attrbs = {}) {
    if(content === null || content === "") return "";
    return xml_create_node_unparsed(name, content, attrbs);
}

export class FA3_Naglowek {
    constructor() {
        // Atributes (content: FA)
        this.KodFormularza = {
            kodSystemowy: "FA (3)",
            wersjaSchemy: "1-0E",
        };
        this.WariantFormularza = "3";
        this.DataWytworzeniaFa = ""; // ISO UTC, eg. "2025-12-31T17:48:38.552Z"
        // this.SystemInfo = "" // up to 256 chars
    }

    print() {
        return xml_create_node_parsed( "Naglowek", 
            xml_create_node_unparsed( "KodFormularza", "FA", this.KodFormularza ) +
            xml_create_node_unparsed( "WariantFormularza", this.WariantFormularza ) +
            xml_create_node_unparsed( "DataWytworzeniaFa", this.DataWytworzeniaFa )
        );
    }
}

export class FA3_Adres {
    constructor() {
        this.KodKraju = "PL";
        this.AdresL1  = ""; // Max 512 znaków
        this.AdresL2  = ""; // [opt] Max 512 znaków
        // this.GLN      = ""; // [opt] TGLN ??
    }
    print(node_name = "Adres") {
        return xml_create_node_parsed( node_name, 
            xml_create_node_unparsed    ( "KodKraju", this.KodKraju ) +
            xml_create_node_unparsed    ( "AdresL1" , this.AdresL1  ) +
            xml_create_node_unparsed_opt( "AdresL2" , this.AdresL2  )
        );
    }
}

export class FA3_DaneKontaktowe {
    constructor() {
        this.Email   = ""; // [opt]
        this.Telefon = ""; // [opt]
    }
    print() {
        return xml_create_node_parsed( "DaneKontaktowe", 
            xml_create_node_unparsed_opt( "Email",    this.Email   ) +
            xml_create_node_unparsed_opt( "Telefon" , this.Telefon )
        );
    }
}

export class FA3_Podmiot1_Dane { // Sprzedawca
    constructor() {
        this.NIP   = ""; // Nr NIP
        this.Nazwa = ""; // Max 512 znaków
    }
    print() {
        return xml_create_node_parsed( "DaneIdentyfikacyjne", 
            xml_create_node_unparsed( "NIP",    this.NIP   ) +
            xml_create_node_unparsed( "Nazwa" , this.Nazwa )
        );
    }
}

export class FA3_Podmiot1 { // Sprzedawca
    constructor() {
        this.HasAdresKoresp      = false;

        // this.PrefixPodatnika = ""; // [opt] Kod Krajowy
        // this.NrEORI = ""; // [opt]
        this.DaneIdentyfikacyjne = new FA3_Podmiot1_Dane();
        this.Adres               = new FA3_Adres();
        this.AdresKoresp         = new FA3_Adres(); // [opt]
        this.DaneKontaktowe      = /** @type {FA3_DaneKontaktowe[]} */ ([])  // [opt len:0-3]
        // this.StatusInfoPodatnika = ""; // [opt] 
    }
    print() {
        return xml_create_node_parsed( "Podmiot1", 
            this.DaneIdentyfikacyjne.print() +
            this.Adres.print("Adres") +
            (this.HasAdresKoresp ? this.AdresKoresp.print("AdresKoresp") : "") +
            this.DaneKontaktowe.map(x => x.print())
        );
    }
}

export class FA3_Podmiot2_Dane { // Nabywca
    constructor() {
        this.NoID  = false;                     // Could be set to true, to indicate other ID for taxes. NIP becomes <BrakID>1</BrakID>
        this.NIP   = /**@type {string} */ (""); // Nr NIP
        this.Nazwa = /**@type {string} */ (""); // [opt (dla niektórych przypadków?)] Max 512 znaków
    }
    print() {
        return xml_create_node_parsed( "DaneIdentyfikacyjne", 
            (this.NoID ? 
                xml_create_node_unparsed( "BrakID", "1") :
                xml_create_node_unparsed( "NIP",    this.NIP )) +
            xml_create_node_unparsed_opt( "Nazwa",  this.Nazwa )
        );
    }
}

export class FA3_Podmiot2 { // Nabywca
    constructor() {
        this.HasAdres       = false;
        this.HasAdresKoresp = false;

        // this.NrEORI = ""; // [opt]
        this.DaneIdentyfikacyjne = new FA3_Podmiot2_Dane();
        this.Adres               = new FA3_Adres();
        this.AdresKoresp         = new FA3_Adres(); // [opt]
        this.DaneKontaktowe      = /** @type {FA3_DaneKontaktowe[]} */ ([])  // [opt len:0-3]
        // this.NrKlienta // [opt] - skrótowa nazwa jeśli jest odniesienie w opisie
        // this.IDNabywcy // [opt] - dla korygujących
        // this.JST = "2"; // "1" (Tak) or "2" (Nie). Wartość "1" oznacza, że faktura dotyczy jednostki podrzędnej JST. W takim przypadku, aby udostępnić fakturę jednostce podrzędnej JST, należy wypełnić sekcję Podmiot3, w szczególności podać NIP lub ID-Wew i określić rolę jako 8.
        // this.GV  = "2"; // "1" (Tak) or "2" (Nie). Wartość "2" oznacza, że faktura nie dotyczy członka grupy VAT
    }
    print() {
        return xml_create_node_parsed( "Podmiot2", 
            this.DaneIdentyfikacyjne.print() +
            (this.HasAdres       ? this.Adres      .print("Adres")       : "") +
            (this.HasAdresKoresp ? this.AdresKoresp.print("AdresKoresp") : "") +
            this.DaneKontaktowe.map(x => x.print()) +
            xml_create_node_parsed( "JST", "2" ) +
            xml_create_node_parsed( "GV",  "2" )
        );
    }
}

export class FA3_FA_Wiersz {
    constructor() {
        this.NrWierszaFa = ""; 
        // this.UU_ID = ""; // [opt] UUID wirsza??
        // this.P_6A  = ""; // [opt] Data, jeśli jest inna od ogólnej
        /* P_7 */ this.Nazwa = "";
        // this.Indeks = ""; // [opt] Max 50 chars
        // this.GTIN   = ""; // [opt] Max 20 chars
        // this.PKWiU  = ""; // [opt] Max 50 chars
        // this.CN     = ""; // [opt] Max 50 chars
        // this.PKOB   = ""; // [opt] Max 50 chars

        /* P_8A */ this.Miara                = "";   // Max 256 chars
        /* P_8B */ this.Ilosc                = "";   // -{16}.{6}
        /* P_9A */ this.CenaJednostkowaNetto = "";   // -{14}.{8}
        /* P_11 */ this.TotalNetto           = "";   // -{16}.{2}
        /* P_12 */ this.StawkaPodatku        = "23"; // 23
    }
    print() {
        return xml_create_node_parsed( "FaWiersz", 
            xml_create_node_unparsed( "NrWierszaFa", this.NrWierszaFa          ) +
            xml_create_node_unparsed( "P_7",         this.Nazwa                ) +
            xml_create_node_unparsed( "P_8A",        this.Miara                ) +
            xml_create_node_unparsed( "P_8B",        this.Ilosc                ) +
            xml_create_node_unparsed( "P_9A",        this.CenaJednostkowaNetto ) +
            xml_create_node_unparsed( "P_11",        this.TotalNetto           ) +
            xml_create_node_unparsed( "P_12",        this.StawkaPodatku        )
        );
    }
}

class FA3_RachunekBankowy {
    constructor() {
        this.NrRB       = '';
        this.NazwaBanku = '';
    }
    print() {
        if( this.NrRB === '' ) return '';
        return xml_create_node_parsed( "RachunekBankowy", 
            xml_create_node_unparsed    ( 'NrRB',       this.NrRB ) +
            xml_create_node_unparsed_opt( 'NazwaBanku', this.NazwaBanku )
        );
    }
}

export class FA3_Platnosc {
    constructor() {
        this.RachunekBankowy = new FA3_RachunekBankowy();
    }
    try_append_node( /**@type { {print: () => string}? } */ node ) {
        if(!node) return '';
        const node_str = node.print();
        if( node_str == '' ) return '';
        return node_str;
    }
    print() {
        let res = '';
        res += this.RachunekBankowy.print();
        if(res == '') return '';
        return xml_create_node_parsed( 'Platnosc', res );
    }
}

const FA3_Adnotacje_Fixed =  xml_create_node_parsed( "Adnotacje", 
    xml_create_node_unparsed("P_16" , "2") +
    xml_create_node_unparsed("P_17" , "2") +
    xml_create_node_unparsed("P_18" , "2") +
    xml_create_node_unparsed("P_18A", "2") +
    xml_create_node_parsed("Zwolnienie",           xml_create_node_unparsed("P_19N",     "1")) +
    xml_create_node_parsed("NoweSrodkiTransportu", xml_create_node_unparsed("P_22N",     "1")) +
    xml_create_node_unparsed("P_23", "2") +
    xml_create_node_parsed("PMarzy",               xml_create_node_unparsed("P_PMarzyN", "1"))
);

export class FA3_FA {
    constructor() {
        this.KodWaluty = "PLN";
        /* P_1  */ this.DataWystawienia    = ""; //       Eg. 2025-12-31
        /* P_1M */ this.MiejsceWystawienia = ""; // [opt] Eg. Zabrze  | Max len: 256
        /* P_2  */ this.NumerFaktury       = ""; //       Eg. dowolny | Max len: 256
        // /* WZ   */ this.WZ                 = []; // [opt len 0-1000]
        /* P_6  */ this.DataSprzedazy      = ""; // Eg. 2025-12-30 (could also be different tag, for a range)

        /* P_13_1 */ this.suma_netto_22_23 = "";
        /* P_14_1 */ this.suma_tax_22_23   = "";
        
        // ... Są sekcje dla innych stawek

        /* P_15   */ this.suma_brutto = "";

        // Zakładam brak adnotacji
        // <Adnotacje>
        //     <P_16>2</P_16>
        //     <P_17>2</P_17>
        //     <P_18>2</P_18>
        //     <P_18A>2</P_18A>
        //     <Zwolnienie>
        //         <P_19N>1</P_19N>
        //     </Zwolnienie>
        //     <NoweSrodkiTransportu>
        //         <P_22N>1</P_22N>
        //     </NoweSrodkiTransportu>
        //     <P_23>2</P_23>
        //     <PMarzy>
        //         <P_PMarzyN>1</P_PMarzyN>
        //     </PMarzy>
        // </Adnotacje>

        this.RodzajFaktury = "VAT" // Can be different, but I don't think I will use it

        this.Wiersze = /**@type {FA3_FA_Wiersz[]} */ ([]); // len:0-10000

        this.Platnosc = new FA3_Platnosc();
    }
    print() {
        return xml_create_node_parsed( "Fa", 
            xml_create_node_unparsed( "KodWaluty", this.KodWaluty          ) +
            xml_create_node_unparsed( "P_1",       this.DataWystawienia    ) +
            xml_create_node_unparsed( "P_1M",      this.MiejsceWystawienia ) +
            xml_create_node_unparsed( "P_2",       this.NumerFaktury       ) +
            xml_create_node_unparsed( "P_6",       this.DataSprzedazy      ) +
            xml_create_node_unparsed( "P_13_1",    this.suma_netto_22_23   ) +
            xml_create_node_unparsed( "P_14_1",    this.suma_tax_22_23     ) +
            xml_create_node_unparsed( "P_15",      this.suma_brutto        ) +
            FA3_Adnotacje_Fixed +
            xml_create_node_unparsed( "RodzajFaktury", this.RodzajFaktury ) +
            this.Wiersze.map(x => x.print()) +
            this.Platnosc.print()
        );
    }
}

export class FA3_Stopka {
    constructor() {
        this.Infos = /**@type {string[]} */ ([]);
    }
    print() {
        if(this.Infos.length === 0) {
            return '';
        }
        return xml_create_node_parsed( 'Stopka',
            xml_create_node_parsed( 'Informacje', 
                this.Infos.map(x => xml_create_node_unparsed('StopkaFaktury', x)).join('')
            )
        )
    }
}

export class FA3_Faktura {
    constructor() {
        this.Naglowek = new FA3_Naglowek();
        this.Podmiot1 = new FA3_Podmiot1();
        this.Podmiot2 = new FA3_Podmiot2();
        this.Fa       = new FA3_FA();
        this.Stopka   = new FA3_Stopka();
    }

    print() {
        return xml_create_node_parsed("Faktura", 
            this.Naglowek.print() +
            this.Podmiot1.print() +
            this.Podmiot2.print() +
            this.Fa.print() +
            this.Stopka.print()
        , {
            "xmlns:xsi":"http://www.w3.org/2001/XMLSchema-instance",
            "xmlns:xsd":"http://www.w3.org/2001/XMLSchema",
            "xmlns":"http://crd.gov.pl/wzor/2025/06/25/13775/"
        });
    }

    to_xml() {
        const header = `<?xml version="1.0" encoding="utf-8"?>`;
        return header + this.print();
    }
}