//@ts-check

import { computed, markRaw, onMounted, onUnmounted, ref, shallowRef } from "vue";
import { FormDataValueLike } from "../Dataset";
import { deep_copy, object_leaf_map, object_map } from "../../utils";

/**
 * @typedef {"test" | "backup"} SettingsCategoryNames
 */

/**
 * @template T
 * @extends {FormDataValueLike<T>}
 */
class ReactiveSettingValue extends FormDataValueLike {
    /**
     * @param {T} initial_value 
     * @param {T | undefined} cached
     */
    constructor(initial_value, cached = undefined) {
        super(initial_value);
        this.cached = cached;
    }

    get_cached() {
        return this.cached;
    }
}

/**
 * @template {SettingsCategoryNames} N
 */
class ReactiveSetting {

    /**
     * @typedef {Settings['categories'][N]} SettingsType
     */

	/**
	 * @template [T=Settings['categories'][N]]
	 * @typedef {T extends Array ? ReactiveSettingLeafMapped<T[number]>[] :
	* 			 T extends Object.<string, any> ?
	* 				{[P in keyof T]: ReactiveSettingLeafMapped<T[P]>} :
	* 			 import('vue').Raw< T extends boolean ? ReactiveSettingValue<boolean> : ReactiveSettingValue<T> >} ReactiveSettingLeafMapped
	*/

    /**
     * @param {Settings} settings
     * @param {N}        category_name
     */
    constructor(settings, category_name) {

        this.settings = settings;
        this.category_name = category_name;

        /**@type {import("vue").Ref<ReactiveSettingLeafMapped>} */
        //@ts-ignore
        this.ref = ref({});
        /**@type {import("vue").ShallowRef<ReactiveSettingValue[]>} */
        this.values_list = shallowRef([]);
        this.changed_structure = ref(false);

        this.recreate_ref_from_original();

        this.changed = computed(() => this.changed_structure.value || this.values_list.value.some(x => x.changed.value));

    }

    /**@returns {SettingsType} */
    unmap_reactive() {
        //@ts-ignore
        return object_leaf_map(this.ref.value,/**@param {ReactiveSettingValue} val */ val => {
            return val.get_local();
        },val => {
            return val instanceof ReactiveSettingValue;
        });
    }

    /**
     * @param {SettingsType} [original_settings] 
     */
    recreate_ref_from_original(original_settings) {
        if(!original_settings){
            original_settings = deep_copy(this.settings.categories[this.category_name]);
        }
        /**@type {ReactiveSettingValue[]} */
        const new_values_list = [];
        /**@type {ReactiveSettingLeafMapped} */
        const res = object_leaf_map(original_settings, /**@return {any} */ (val, acc) => {
                const value = new ReactiveSettingValue(val, acc);
                new_values_list.push(value);
                return markRaw( value );
            },
            undefined,
            (key, acc) => {
                return acc ? acc[key] : NaN;
            }, 
            /**@type {any} */ (this.settings.categories[this.category_name])
        );

        // console.log('Recreated: ', original_settings, res, new_values_list);

        this.changed_structure.value = false;
        this.values_list.value = new_values_list;
        this.ref.value = res;
    }

    recalculate_values_list() {
        /**@type {ReactiveSettingValue[]} */
        const new_values_list = [];
        object_leaf_map(this.ref.value, (val) => {
                new_values_list.push(val);
                return val;
            },
            (val) => val instanceof ReactiveSettingValue,
        );
        this.values_list.value = new_values_list;
    }

    /**
     * @param {(obj: ReactiveSettingLeafMapped) => ReactiveSettingLeafMapped} modifier 
     */
    modify_ref(modifier) {
        const modified = modifier(this.ref.value);
        this.ref.value = modified;
        this.changed_structure.value = true;
        this.recalculate_values_list();
    }

    update_settings(no_poke = false) {
        const new_original_settings = this.unmap_reactive();
        this.settings.categories[this.category_name] = new_original_settings;
        this.recreate_ref_from_original(new_original_settings);
        if(!no_poke){
            this.settings.poke_update(this.category_name);
        }
    }
}

/**
 * @param {SettingsCategoryNames} category_name 
 */
function get_settings_event_name(category_name) {
    return 'settings_updated_' + category_name;
}

/**@template {SettingsCategoryNames} N */
class SettingsManager {
    /**
     * @param {Settings} settings 
     * @param {N}        category_name 
     */
    constructor(settings, category_name) {
        this.settings = settings;
        this.category_name = category_name;
        /**@type {(() => void)?} */
        this.unlisten = null;
    }
    
    /**
     * @param {Settings['categories'][N]} new_values 
     * @returns {void | Promise}
     */
    update(new_values) {}

    update_from_settings() {
        return this.update(this.settings.categories[this.category_name]);
    }

    start_listener() {
        this.stop_listener();
        this.unlisten = add_settings_update_listener(
            this.category_name, 
            (new_values) => this.update(new_values)
        );
    }
    stop_listener() {
        if(this.unlisten){
            this.unlisten();
            this.unlisten = null;
        }
    }
    start_in_component() {
        onMounted(() => {
            this.start_listener();
        });
        onUnmounted(() => {
            this.stop_listener();
        })
    }
}

class Settings {
    constructor() {

        this.categories = {
            test: {
                val1: 'wartość 1',
                val2: 0
            },
            backup: {
                /**
                 * @type {{
                 *  path: string,
                 *  mon_en: boolean,
                 *  wee_en: boolean,
                 *  day_en: boolean,
                 *  std_en: boolean,
                 *  mon_max: number
                 *  wee_max: number
                 *  day_max: number
                 *  std_max: number
                 * }[]}
                 *  */
                list: [
                    {
                        path: '..\\mdb\\test_backup_live',
                        mon_en: true,
                        wee_en: true,
                        day_en: true,
                        std_en: true,
                        mon_max: 0,
                        wee_max: 4,
                        day_max: 7,
                        std_max: 1
                    },
                    {
                        path: '..\\mdb\\test_backup',
                        mon_en: false,
                        wee_en: false,
                        day_en: false,
                        std_en: false,
                        mon_max: 0,
                        wee_max: 4,
                        day_max: 1,
                        std_max: 0
                    }
                ]

                // /**@type {string[]} */
                // paths: [],
                // mon_en: true,
                // wee_en: true,
                // day_en: true,
                // std_en: true,
                // mon_max: 0,
                // wee_max: 4,
                // day_max: 7,
                // std_max: 1
            }
        };

    }

    /**
     * @param {SettingsCategoryNames} category_name 
     */
    poke_update(category_name) {
        window.dispatchEvent(new Event(get_settings_event_name(category_name)));
    }

    /**
     * @template {SettingsCategoryNames} T
     * @param {T} category_name 
     */
    get_reactive_settings(category_name) {
        const res = new ReactiveSetting(this, category_name);
        return res;
    }

    get_reactive_settings_all() {
        /**@type {{[K in SettingsCategoryNames]: ReactiveSetting<K>}} */
        //@ts-ignore
        const res = object_map(this.categories, (val, key) => this.get_reactive_settings(key));
        return res;
    }

}

const mainSettings = new Settings();


function useMainSettings() {
    return mainSettings;
}

/**
 * @template {SettingsCategoryNames} T
 * @param {T} category_name 
 * @param {(settings: typeof Settings.prototype.categories[T]) => void} handler 
 */
function add_settings_update_listener(category_name, handler) {
    const listener = () => handler(mainSettings.categories[category_name]);
    const event_name = get_settings_event_name(category_name);
    window.addEventListener(event_name, listener);
    return () => {
        window.removeEventListener(event_name, listener);
    }
}


export {
    useMainSettings,
    add_settings_update_listener,
    Settings,
    SettingsManager,
    ReactiveSetting,
    ReactiveSettingValue
};