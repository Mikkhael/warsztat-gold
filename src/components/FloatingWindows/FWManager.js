//@ts-check
import { reactive, markRaw, shallowReactive, nextTick, ref, shallowRef, triggerRef, computed, watch } from 'vue';
import WinBox from '../WinBox/winbox';
import { generate_UID } from '../../utils';

/**
 * @typedef {import('vue').Component} Component
 */

/**
 * @typedef {"zlecenia_otwarte" | "zlecenia_wszystkie" | "zlecenia_filtered" | "klienci" | "czesci"} FWCategory
 */

/**
 * @typedef {{
 *  force?:      boolean,
 *  category?:   FWCategory, 
 *  props?:      Object.<string, any>
 *  listeners?:  Object.<string, Function>
 *  parent?:     FWWindow
 * }} WindowOpenOptions
 */



class FWWindow {
    /**
     * @param {FWManager} manager 
     * @param {Component} component 
     * @param {WinBox} box
     * @param {Object.<string, any>} props
     * @param {Object.<string, Function>} listeners
     * @param {FWCategory} [category]
     */
    constructor(manager, component, box, props, listeners, category) {
        this.manager = manager;
        this.component = component;
        this.box = box;
        this.props = props;
        this.listeners = listeners;
        this.category = category;
        this.id = 'window_' + generate_UID();
        /**@type {string[]} */
        this.children_ids = [];
        /**@type {string | null} */
        this.parent_id    = null;

        /**@type {import('vue').ShallowRef<import('vue').Ref<boolean>[]>} */
        this.changed_identifiers = shallowRef([]);

        this.changed_identifier_computed = computed(() => {
            return this.changed_identifiers.value.some(x => x.value);
        });

        this.unwatch_box_style = watch(
            [this.changed_identifier_computed], 
            ([new_changed_identifier]) => {
                this.box.dom.setAttribute('changed', new_changed_identifier ? "1" : "0");
        }, {immediate: true});

        this.add_before_close(async (force) => {
            this.unwatch_box_style();
            return await this.try_close_all_children(force);
        });
    }

    /**
     * @param {import('vue').Ref<boolean>} changed_ref 
     */
    add_changed_identifier(changed_ref) {
        this.changed_identifiers.value.push(changed_ref);
        triggerRef(this.changed_identifiers);
    }
    
    /**
     * 
     * @param {(force: boolean) => Promise<boolean>} onclose 
     */
    add_before_close(onclose){
        const temp = this.box.onclose;
        this.box.onclose = async (force) => {
            if(await onclose(force)) return true;
            return temp(force);
        }
    }

    get_mount_selector(){
        return '#' + this.box.id + " .wb-body";
    }

    async try_close_all_children(force = false) {
        for(const child_id of this.children_ids) {
            const prevented = await this.manager.close_window_by_id(child_id, force);
            if(prevented) return true;
        }
        return false;
    }

    /**
     * @param {string} parent_id 
     */
    assign_parent_id(parent_id) {
        if(this.parent_id) {
            throw new Error("Reasigning parent for window " + this.id);
        }
        const parent_window = this.manager.get_window_by_id(parent_id);
        if(parent_window) {
            parent_window[1].children_ids.push(this.id);
            this.parent_id = parent_id;
        }
    }
}


class FWManager {
    constructor() {
        this.cointainer = /**@type {Element=}*/ (undefined);
        this.opened_windows = shallowReactive(/**@type {Map.<string, FWWindow>} */ (new Map()));
        this.viewport = {
            left:   /**@type {string=} */(undefined),
            right:  /**@type {string=} */(undefined),
            top:    /**@type {string=} */(undefined),
            bottom: /**@type {string=} */(undefined),
        }
        // this.opened_windows = reactive(/**@type {string[]} */ ([]));
    }
    /**@return {FWManager} */
    static NewReactive() {
        return reactive(new FWManager());
    }

    /**
     * @param {Element} cointainer 
     */
    set_cointainer(cointainer){
        this.cointainer = markRaw(cointainer);
    }

    /**
     * 
     * @param {{
     *  left?:   string,
     *  right?:  string,
     *  top?:    string,
     *  bottom?: string,
     * }} param0 
     */
    set_viewport({left, right, top, bottom}) {
        Object.assign(this.viewport, {left, right, top, bottom});
    }

    /**
     * @param {string} id 
     */
    get_window_by_id(id) {
        for(const title_and_window of this.opened_windows) {
            if(title_and_window[1].id === id) return title_and_window;
        }
        return null;
    }

    /**
     * @param {string} title
     */
    focus_window(title) {
        const window = this.opened_windows.get(title);
        // console.log("Window to focus: ", window);
        if(window) {
            // window.box.window_clicked = true;
            window.box.restore();
            window.box.focus(true);
            window.box.move("center", "center");
            return window;
        }
        return null;
        // return false;
    }
    minimize_window(/**@type {string} */ title) {
        const window = this.opened_windows.get(title);
        if(window) {
            window.box.minimize();
            return window;
        }
        return null;
    }
    minimize_all() {
        for(const [title] of this.opened_windows) {
            this.minimize_window(title);
        }
    }
    /**
     * @param {string} title 
     * @param {Component} component 
     * @param {WindowOpenOptions} options
     */
    open_window_unchecked(title, component, options) {
        const props     = options.props ?? {};
        const listeners = options.listeners ?? {};
        const parent_id = options.parent?.id;
        const category  = options.category ?? options.parent?.category;
        /**@type {string[]} */
        const category_list = category ? ["cat_" + category] : [];
        if(!options.category && options.parent) {
            category_list.push('subcategory');
        }
        const box = new WinBox(title, {
            root: this.cointainer,
            overflow: true,
            class: category_list,
            x: "center",
            y: "center",
            header: 25,
            minheight: 25 + 10,
            top:    this.viewport.top,
            bottom: this.viewport.bottom,
            left:   this.viewport.left,
            right:  this.viewport.right,
            onclose: (force) => {
                this.opened_windows.delete(title);
            }
        });
        box.removeControl("wb-full");
        const window = new FWWindow(this, component, box, props, listeners, category);
        if(parent_id) {
            window.assign_parent_id(parent_id);
        }
        this.opened_windows.set(title, window);

        
        console.log('OPENING WINDOW', title, window);
        return window;
    }

    /**
     * @param {string} title 
     * @param {Component} component 
     * @param {WindowOpenOptions} options
     */
    open_or_focus_window(title, component, options = {}) {
        if(this.opened_windows.has(title)) {
            return this.focus_window(title);
        }
        return this.open_window_unchecked(title, component, options);
    }
    is_window_opened(title) {
        return this.opened_windows.has(title);
    }

    /**
     * @param {string} title 
     * @param {Component} component 
     * @param {WindowOpenOptions} options
     */
    async open_or_reopen_window(title, component, options = {}) {        
        const prevented_close = await this.close_window(title, options.force);
        if(prevented_close){
            return null;
        }
        return this.open_window_unchecked(title, component, options);
    }

    /**
     * @param {string} title 
     * @param {boolean} force 
     * @returns {Promise<boolean | undefined>}
     */
    async close_window(title, force = false){
        const window = this.opened_windows.get(title);
        if(window) {
            console.log('CLOSING WINDOW', title, force);
            return window.box.close(force);
        }
        return false;
    }
    /**
     * @param {string} id 
     * @param {boolean} force 
     * @returns {Promise<boolean | undefined>}
     */
    async close_window_by_id(id, force = false){
        for(const [title, window] of this.opened_windows) {
            if(window.id === id) {
                return this.close_window(title, force);
            }
        }
        return false;
    }
    async close_all(force = false) {
        const all_titles = Array.from(this.opened_windows.keys());
        for(const title of all_titles) {
            await this.close_window(title, force);
        }
    }
}

const main_fw_manager = FWManager.NewReactive();
function useMainFWManager() {
    return main_fw_manager;
}

export {FWManager, FWWindow, useMainFWManager};
export default useMainFWManager;