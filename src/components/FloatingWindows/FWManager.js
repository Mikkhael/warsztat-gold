//@ts-check
import { reactive } from 'vue';
import WinBox from '../WinBox/winbox';

/**
 * @typedef {import('vue').Component} Component
 */

class FWWindow {
    /**
     * @param {Component} component 
     * @param {WinBox} box
     */
    constructor(component, box) {
        this.component = component;
        this.box = box;
    }

    get_mount_selector(){
        return '#' + this.box.id;
    }
}


class FWManager {
    constructor() {
        this.cointainer = /**@type {Element?}*/ (null);
        this.opened_windows = reactive(/**@type {Map.<string, FWWindow>} */ (new Map()));
        // this.opened_windows = reactive(/**@type {string[]} */ ([]));
    }

    /**
     * @param {Element} cointainer 
     */
    set_cointainer(cointainer){
        this.cointainer = cointainer;
    }

    /**
     * @param {string} title
     */
    focus_window(title) {
        const window = this.opened_windows.get(title);
        if(window) {
            window.box.focus(); // TODO center
            return window;
        }
        return null;
        // return false;
    }

    /**
     * @param {string} title 
     * @param {Component} component 
     */
    open_or_focus_window(title, component) {
        if(!this.cointainer) {
            return null;
        }
        if(this.opened_windows.has(title)) {
            return this.focus_window(title);
        }
        console.log("Setting container: ", this.cointainer);
        const box = new WinBox(title, {
            root: this.cointainer
        });
        const window = new FWWindow(component, box);
        this.opened_windows.set(title, window);
        return window;
    }
}

export default FWManager;