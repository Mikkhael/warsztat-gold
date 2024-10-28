//@ts-check
import { DB } from "./db_warsztat_structure_impl";
const TABS = DB.tabs;
function useWarsztatDatabase() {
    return {
        DB,
        TABS
    }
}
export default useWarsztatDatabase;








