//@ts-check
import { computed } from "vue";
import { Column, qparts_db, query_parts_to_string, QuerySource } from "../components/Dataset";
import useWarsztatDatabase from "../DBStructure/db_warsztat_structure";

const db = useWarsztatDatabase();
const TAB_ZLEC = db.TABS.zlecenia_naprawy;
// const TAB_KLIE = db.TABS.klienci;
// const TAB_SAMO = db.TABS.samochody_klientów;
const TAB_OBRO = db.TABS.obroty_magazynowe;
const TAB_CZES = db.TABS.nazwy_części;
const TAB_CZYN = db.TABS.czynność;
const TAB_ROBO = db.TABS.zlecenia_czynności;
// const COLS_ZLEC = TAB_ZLEC.cols;
// const COLS_KLIE = TAB_KLIE.cols;
// const COLS_SAMO = TAB_SAMO.cols;
const COLS_OBRO = TAB_OBRO.cols;
const COLS_CZES = TAB_CZES.cols;
const COLS_CZYN = TAB_CZYN.cols;
const COLS_ROBO = TAB_ROBO.cols;

//////////// DECIMAL /////////////////
function col_to_string(name) {
    if(name instanceof Column) return name.get_full_sql();
    return name;
}

export const decimal_sql = {
    mul(/**@type {(string | Column)[]} */ ...factors) {
        if(factors.length === 0) return '0';
        factors = factors.map(col_to_string);
        while(factors.length > 1) {
            const factor1 = factors.pop();
            const factor2 = factors.pop();
            factors.push(`decimal_mul(${factor1},${factor2})`);
        }
        return factors[0].toString();
    }
}



//////////// ZLECENIA SUMMARY ////////////////////

/**
 * 
 * @param {import("vue").MaybeRef<import("../components/Dataset").SQLValue>} id_zlecenia 
 */
export function get_summary_for_zlec_id(id_zlecenia) {
    const res = computed(() => {
        const LIST_CZESCI_SQL = qparts_db(
            "SELECT",   "ifnull(",  COLS_CZES.nazwa_części,      ", '')",  "AS name,", 
                        "ifnull(",  COLS_CZES.jednostka,         ", '')",  "AS unit,",
                        "ifnull(",  COLS_OBRO.ilość,        "* (-1), 0)",  "AS cnt,",
                                    COLS_OBRO.cena_netto_sprzedaży,        "AS netto",
            "FROM",     TAB_OBRO, "LEFT JOIN", TAB_CZES, "ON", COLS_OBRO.numer_cz, "=", COLS_CZES.numer_części,
            "WHERE",    COLS_OBRO.rodzaj_dokumentu, "IS 'zlec'", "AND", COLS_OBRO.numer_dokumentu, "IS", [id_zlecenia]);
            
        const LIST_ROBOCIZNA_SQL = qparts_db(
            "SELECT",   "ifnull(",  COLS_CZYN.czynność,          ", '')",  "AS name,", 
                        "''",                                              "AS unit,",
                        "ifnull(",  COLS_ROBO.krotność_wykonania,",  0)",  "AS cnt,",
                                    COLS_ROBO.cena_netto,                  "AS netto",
            "FROM",     TAB_ROBO, "LEFT JOIN", TAB_CZYN, "ON", COLS_ROBO.ID_czynności, "=", COLS_CZYN.ID_cynności,
            "WHERE",    COLS_ROBO.ID_zlecenia, "IS", [id_zlecenia]);
        
        const LIST_SQL = `(${query_parts_to_string(LIST_CZESCI_SQL)} UNION ALL ${query_parts_to_string(LIST_ROBOCIZNA_SQL)})`;
        return LIST_SQL;
    });
    return res;    
}
/**
 * @param {QuerySource} src 
 * @param {import("vue").MaybeRef<import("../components/Dataset").SQLValue>} id_zlecenia 
 */
export function set_from_for_summary_for_zlec_id(src, id_zlecenia) {
    const LIST_SQL = get_summary_for_zlec_id(id_zlecenia);
    src.query.from.reas(LIST_SQL);
    src.add_table_dep(TAB_ZLEC);
    src.add_table_dep(TAB_OBRO);
    src.add_table_dep(TAB_CZES);
    src.add_table_dep(TAB_ROBO);
    src.add_table_dep(TAB_CZYN);
}

