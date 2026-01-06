import { WebviewWindow } from "@tauri-apps/api/window";
import { deffered_promise } from "../utils";


const KSEF_WINDOW_LABEL = "ksefwindow";

const KSEF_URL_TEST = `https://web2te-ksef.mf.gov.pl/web`;
const KSEF_URL_DEMO = `https://web2tr-ksef.mf.gov.pl/web`;
const KSEF_URL_PROD = `https://web2tr-ksef.mf.gov.pl/web`; // TODO

// loaded            - "/web/home"
// ready to load xml - "/web/issue-invoice/load-invoice"

/**
 * @typedef {"test" | "demo" | "prod"} KsefPlatformName
 */


class KsefWindowManager {};

// class KsefWindowManager {

//     constructor() {
//         /**@type {WebviewWindow?} */
//         this.win      = null;
//         /**@type {KsefPlatformName?} */
//         this.platform = null;
//         /**@type {(() => void)[]} */
//         this.unlistens = [];

//         /**@type {KsefPlatformName} */
//         this.default_platform = "test";
//     }

//     url_test() { return KSEF_URL_TEST; }
//     url_demo() { return KSEF_URL_DEMO; }
//     url_prod() { return KSEF_URL_PROD; }

//     url(/**@type {KsefPlatformName} */ platform) {
//         switch(platform) {
//             case "test": return this.url_test();
//             case "demo": return this.url_demo();
//             case "prod": return this.url_prod();
//         }
//     }

//     async open_unchecked(/**@type {KsefPlatformName} */ platform = this.default_platform) {
//         const main_win = WebviewWindow.getByLabel("main");
//         if(!main_win) {
//             throw new Error("No main window");
//         }
//         const main_size = await main_win.outerSize();

//         // const url = this.url(platform);
//         const url = "iframe_ksef.html";
//         const win = new WebviewWindow(KSEF_WINDOW_LABEL, {
//             url:    url,
//             title: 'Ksef',
//             width:  main_size.width,
//             height: main_size.height,
//             // closable: false,
//         });

//         const opened_win_deffered = deffered_promise();
//         const unlisten_created = await win.once('tauri://created', function (e) {
//             console.log('KSEF WINDOW OPENED', win, e);
//             win.center();
//             opened_win_deffered.resolve(win);
//         });
//         const unlisten_error   = await win.once('tauri://error', function (e) {
//             console.log('KSEF WINDOW NOT OPENED', win, e);
//             opened_win_deffered.reject(e.payload);
//         });
//         const unlisten_closed  = await win.onCloseRequested( function (e) {
//             console.log('KSEF WINDOW CLOSED');
//         });

//         this.unlistens.push(
//             unlisten_created,
//             unlisten_error,
//             unlisten_closed
//         );

//         this.win      = win;
//         this.platform = platform;

//         return opened_win_deffered.promise;
//     }

//     async focus_unchecked() {
//         const old_win = WebviewWindow.getByLabel(KSEF_WINDOW_LABEL);
//         if(old_win) {
//             await old_win.unminimize();
//             await old_win.setFocus();
//             if(! await old_win.isMaximized()) {
//                 await old_win.center();
//             }
//             return true;
//         }
//         return false;
//     }

//     check_is_opened_any() {
//         const old_win = WebviewWindow.getByLabel(KSEF_WINDOW_LABEL);
//         return old_win !== null;
//     }

//     check_is_correct(/**@type {KsefPlatformName} */ platform = this.default_platform) {
//         const old_win = WebviewWindow.getByLabel(KSEF_WINDOW_LABEL);
//         return old_win !== null && this.win == old_win && this.platform === platform;
//     }

//     async open_or_focus_any(/**@type {KsefPlatformName} */ platform = this.default_platform) {
//         if(this.check_is_opened_any()) {
//             return this.focus_unchecked();
//         } else {
//             return this.open_unchecked(platform);
//         }
//     }
//     async open_or_focus(/**@type {KsefPlatformName} */ platform = this.default_platform) {
//         if(this.check_is_correct(platform)) {
//             return this.focus_unchecked();
//         } else {
//             return this.open_or_focus_any(platform);
//         }
//     }
//     async close() {
//         const old_win = WebviewWindow.getByLabel(KSEF_WINDOW_LABEL);
//         for(const unlisten of this.unlistens) {
//             unlisten();
//         }
//         await old_win?.close();
//         this.win      = null;
//         this.platform = null;
//     }
//     async open_or_reopen(/**@type {KsefPlatformName} */ platform = this.default_platform) {
//         if(this.check_is_opened_any()) {
//             await this.close();
//         }
//         return this.open_unchecked(platform);
//     }
// }

const mainKsefManager = new KsefWindowManager();

function useMainKsefManager() {
    return mainKsefManager;
}

export {
    useMainKsefManager
};