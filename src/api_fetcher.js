
import useMainMsgManager from './components/Msg/MsgManager';
import { fetch } from '@tauri-apps/api/http';


const msgManager = useMainMsgManager();


/**
 * 
 * @param {string} url 
 */
async function do_fetch(url) {
    try {
        const res = await fetch(url, {method: "GET"});
        console.log("FETCH RESULT", res);
    } catch (err) {
        console.log("FETCH ERROR", err);
    }
}

const API_URL      = "https://wl-api.mf.gov.pl/api/search/nip/";
const API_URL_TEST = "https://wl-test.mf.gov.pl/api/search/nip/";


/**
 * @typedef {{
 *  name: string,
 *  addressFull: string,
 *  nip: string,
 *  city: string,
 *  zip:  string,
 *  addr: string,
 * }} NipResult
 */

/**
 * 
 * @param {NipResult} data 
 */
function parse_nip_result(data) {
    data.addr = data.addressFull;
    const last_comma_idx = data.addressFull.lastIndexOf(',');
    if(last_comma_idx < 0) return;
    data.addr = data.addressFull.slice(0, last_comma_idx).trim();
    const zip_with_city = data.addressFull.slice(last_comma_idx + 1).trim();

    const first_space_idx = zip_with_city.indexOf(' ');
    if(first_space_idx < 0) return;

    data.zip = zip_with_city.slice(0, first_space_idx);
    data.city = zip_with_city.slice(first_space_idx+1);
}

/**
 * 
 * @param {string} nip 
 * @param {boolean} istest 
 * @param {string | undefined} date 
 */
async function get_nip_data_from_api(nip, istest = false, date) {
    const nip_escaped  = nip.replace(/\D/g,'');
    const date_escaped = date ?? (new Date().toISOString().slice(0, 10));
    const url = (istest ? API_URL_TEST : API_URL) + nip_escaped;
    const info_id = msgManager.post("info", `Zapytanie o NIP '${nip}' ...`);
    try{
        const res = await fetch(url, {method: "GET", query: {date: date_escaped}});
        if(typeof res.data !== "object" || !res.data) {
            msgManager.close(info_id);
            msgManager.postError(`Zapytanie o NIP '${nip}' nie powiodło się: Nieprawidłowa odpowiedź serwera`);
            return null;
        }
        if(!res.data.result) {
            msgManager.close(info_id);
            msgManager.postError(`Zapytanie o NIP '${nip}' nie powiodło się: '${res.data.code || ''}' - ${res.data.message || 'Nieznany błąd'}`);
            return null;
        }
        if(!res.ok || res.status !== 200) {
            msgManager.close(info_id);
            msgManager.postError(`Zapytanie o NIP '${nip}' nie powiodło się: Status ${res.status}`);
            return null;
        }
        const subject = res.data?.result?.subject;
        if(!subject) {
            msgManager.close(info_id);
            msgManager.postError(`Zapytanie o NIP '${nip}' nie powiodło się: Dane pobrane z serwera są puste`);
            return null;
        }
        /**@type {NipResult} */
        const result = {
            name:    subject.name || "Nieznana nazwa",
            addressFull: subject.workingAddress || subject.residenceAddress || "Nieznany adress",
            nip:     subject.nip || nip_escaped,
            city: "",
            zip:  "",
            addr: "",
        };
        parse_nip_result(result);
        msgManager.close(info_id);
        msgManager.post("info", `Zapytanie o NIP '${nip}' - pomyślnie pobrano dane z internetu`, 5000);
        console.log("NIP API RESULT: ", result);
        return result;
    } catch(err) {
        msgManager.postError("Zapytanie o NIP - błąd krytyczny: " + err);
        return null;
    }
}



export {
    do_fetch,
    get_nip_data_from_api
}
