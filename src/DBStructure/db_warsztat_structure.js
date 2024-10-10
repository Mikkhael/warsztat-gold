//@ts-check

import { DatabaseNode } from "../components/Dataset";


const DB = new DatabaseNode();
const TABS = {
    klienci          : DB.add_table('klienci'),
    samochody        : DB.add_table('samochody klientów'),
    zleceniaNaprawy  : DB.add_table('zlecenia naprawy'),
};


function useWarsztatDatabase() {
    return {
        DB,
        TABS
    }
}


export default useWarsztatDatabase;








