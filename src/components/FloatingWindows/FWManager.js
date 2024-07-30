//@ts-check
import { reactive, markRaw } from 'vue';
import WinBox from '../WinBox/winbox';

/**
 * @typedef {import('vue').Component} Component
 */

class FWWindow {
    /**
     * @param {Component} component 
     * @param {WinBox} box
     * @param {Object.<string, any>} props
     * @param {Object.<string, Function>} listeners
     */
    constructor(component, box, props, listeners) {
        this.component = markRaw(component);
        this.box = markRaw(box);
        this.props = props;
        this.listeners = listeners;
    }

    get_mount_selector(){
        return '#' + this.box.id + " .wb-body";
    }
}


class FWManager {
    constructor() {
        this.cointainer = /**@type {Element=}*/ (undefined);
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
            // window.box.window_clicked = true;
            window.box.restore();
            // window.box.focus(true);
            // window.box.move("center", "center");
            return window;
        }
        return null;
        // return false;
    }

    /**
     * @param {string} title 
     * @param {Component} component 
     * @param {Object.<string, any>} props
     * @param {Object.<string, Function>} listeners
     */
    #open_window_unchecked(title, component, props = {}, listeners = {}) {
        const box = new WinBox(title, {
            root: this.cointainer,
            overflow: true,
            x: "center",
            y: "center",
            minheight: 35 + 10,
            onclose: (force) => {
                this.opened_windows.delete(title);
            }
        });
        box.removeControl("wb-full");
        const window = new FWWindow(component, box, props, listeners);
        this.opened_windows.set(title, window);
        return window;
    }

    /**
     * @param {string} title 
     * @param {Component} component 
     * @param {Object.<string, any>} props
     * @param {Object.<string, Function>} listeners
     */
    open_or_focus_window(title, component, props = {}, listeners = {}) {
        if(this.opened_windows.has(title)) {
            return this.focus_window(title);
        }
        return this.#open_window_unchecked(title, component, props, listeners);
    }

    /**
     * @param {string} title 
     * @param {Component} component 
     * @param {Object.<string, any>} props
     * @param {Object.<string, Function>} listeners
     */
    open_or_reopen_window(title, component, props = {}, listeners = {}) {
        this.close_window(title);
        return this.#open_window_unchecked(title, component, props, listeners);
    }

    /**
     * @param {string} title 
     * @param {boolean} force 
     */
    close_window(title, force = false){
        const window = this.opened_windows.get(title);
        if(window) {
            window.box.close(force);
        }
    }
}

export default FWManager;