//@ts-check

import { computed, markRaw, onMounted, onUnmounted, reactive, readonly, ref, shallowRef } from "vue";
import { OwningChangableValue } from "../Dataset";
import { deep_copy, escape_sql_value, object_leaf_map, object_map, query_result_to_object } from "../../utils";
import ipc from "../../ipc";

const SETTINGS_CATEGORY_NAMES = /**@type {const} */ (['test', 'backup', 'data']);
/**
 * @typedef {SETTINGS_CATEGORY_NAMES[number]} SettingsCategoryNames
 */

/**
 * @template T
 * @extends {OwningChangableValue<T>}
 */
class ReactiveSettingValue extends OwningChangableValue {
    /**
     * @param {T} initial_value 
     * @param {T | undefined} cached
     */
    constructor(initial_value, cached = undefined) {
        super(initial_value, cached);
        // this.cached = cached;
    }

    // get_cached() {
    //     return this.cached;
    // }
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

    /**
     * @template {Object.<string, any>} T
     * @param {T}   obj 
     * @param {any} [base] 
     * @param {(mapped: any, unmapped: any, acc: any) => void} [on_leaf]
     * @returns {ReactiveSettingLeafMapped<T>}
     */
    static wrap(obj, base, on_leaf) {
        return object_leaf_map(obj, /**@return {any} */ (val, acc) => {
                const value = new ReactiveSettingValue(val, acc);
                on_leaf?.(value, val, acc);
                return markRaw( value );
            },
            undefined,
            (key, acc) => acc ? acc[key] : NaN, 
            base
        );
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
        const res = ReactiveSetting.wrap(original_settings, this.settings.categories[this.category_name], (value) => {
            new_values_list.push(value);
        })

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

class SettingsUpdateEvent extends Event {
    /**
     * @param {SettingsCategoryNames} category 
     * @param {boolean} loaded 
     */
    constructor(category, loaded) {
        super(get_settings_event_name(category));
        this.loaded = loaded;
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

    get_settings() {
        return this.settings.categories[this.category_name];
    }

    /**
     * @param {boolean} loaded
     * @returns {any | Promise<any>} 
     */
    on_changed(loaded) {}

    start_listener() {
        this.stop_listener();
        this.unlisten = add_settings_update_listener(
            this.category_name, 
            (new_values, loaded) => {
                return this.on_changed(loaded);
            }
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

/**
 * @typedef {{
 *  path: string,
 *  mon_en: boolean,
 *  wee_en: boolean,
 *  day_en: boolean,
 *  std_en: boolean,
 *  mon_max: number
 *  wee_max: number
 *  day_max: number
 *  std_max: number
 * }} CategoryBackupListElemType
 * 
 * @typedef {{
 *  list: CategoryBackupListElemType[]
 * }} CategoryBackupType
 * 
 * @typedef {{
 *  val1: string,
 *  val2: number
 * }} CategoryTestType
 * 
 * @typedef {SettingsDataFieldsKeysList[number]} DataFieldsKey
 * @typedef {{[P in DataFieldsKey]: string}} CategoryDataType
 *  */
const SettingsDataFieldsKeysList = /**@type {const} */ (['Nazwa', 'Imię i Nazwisko', 'Adres', 'Telefon', 'NIP', 'Email', 'Nazwa Banku', 'Nr Konta', 'RODO']);


class Settings {
    constructor() {

        this.categories = {
            test:   SettingsDefaults.test(null),
            backup: SettingsDefaults.backup(null),
            data:   SettingsDefaults.data(null),
        };
    }

    /**
     * @param {SettingsCategoryNames} category_name 
     */
    poke_update(category_name, loaded = false) {
        window.dispatchEvent(new SettingsUpdateEvent(category_name, loaded));
    }

    /**
     * @template {SettingsCategoryNames} T
     * @param {T} category_name 
     */
    get_reactive_settings_raw(category_name) {
        const category = this.categories[category_name];
        return readonly(reactive(category));
    }
    /**
     * @template {SettingsCategoryNames} T
     * @param {T} category_name 
     */
    get_reactive_settings_raw_editable(category_name) {
        const category = this.categories[category_name];
        return reactive(category);
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

    /**
     * @param  {SettingsCategoryNames[]} cat_names 
     */
    async load_from_db(...cat_names) {
        const load_routine = (/**@type {SettingsCategoryNames} */ cat_name, value) => {
            //@ts-ignore
            this.categories[cat_name] = SettingsDefaults[cat_name](value);
            this.poke_update(cat_name, true);
        }
        
        const [rows] = await ipc.db_query('SELECT `key`,`value` FROM `_meta_setting_json`').catch(err => {
            if(err === 'no such table: _meta_setting_json') {
                return [undefined];
            }
            throw err;
        });
        if(rows === undefined) {
            return false;
        }
        for(const cat_name of cat_names) {
            let json = rows.find(x => x[0] === cat_name)?.[1] ?? null;
            let value = null;
            if (json !== null) try{
                value = JSON.parse(json);
            } catch (err) {};
            load_routine(cat_name, value);
        }
        return true;
    }

    /**
     * @param {[SettingsCategoryNames, ...SettingsCategoryNames[]]} cat_names
     */
    async save_to_db(...cat_names) {
        const values = cat_names.map(cat_name => {
            const json = JSON.stringify(this.categories[cat_name]);
            const sql_key   = escape_sql_value(cat_name);
            const sql_value = escape_sql_value(json);
            return '('+ sql_key + ',' + sql_value +')';
        }).join(', ');
        const res = await ipc.db_execute('REPLACE INTO `_meta_setting_json` (`key`,`value`) VALUES ' + values);
        return res;
    }

    load_from_db_all() {
        return this.load_from_db(...SETTINGS_CATEGORY_NAMES);
    }
    save_to_db_all() {
        return this.save_to_db(...SETTINGS_CATEGORY_NAMES);
    }

}

function validate_array (val) {return Array.isArray(val) ? val : null}
function validate_number(val) {return typeof val === 'number'  ? val : null}
function validate_bool  (val) {return typeof val === 'boolean' ? val : null}
function validate_string(val) {return typeof val === 'string'  ? val : null}

const SettingsDefaults = {

    /**
     * @param {CategoryBackupListElemType} [partial] 
     * @returns {CategoryBackupListElemType}
     * */
    backup_list_elem: (partial) => {
        return {
            path:    validate_string(partial?.path)    ?? '',
            mon_en:  validate_bool  (partial?.mon_en)  ?? false,
            wee_en:  validate_bool  (partial?.wee_en)  ?? false,
            day_en:  validate_bool  (partial?.day_en)  ?? false,
            std_en:  validate_bool  (partial?.std_en)  ?? false,
            mon_max: validate_number(partial?.mon_max) ?? 0,
            wee_max: validate_number(partial?.wee_max) ?? 4,
            day_max: validate_number(partial?.day_max) ?? 7,
            std_max: validate_number(partial?.std_max) ?? 2,
        };
    },

    /**@type {(partial: CategoryBackupType?) => CategoryBackupType} */
    backup: (partial = null) => {
        if( !partial || 
            !validate_array(partial.list)) {
                return {list: []}
        }
        const list = partial.list.map(x => {
            return SettingsDefaults.backup_list_elem(x);
        })
        return {list};
    },

    
    /**@type {(partial: CategoryTestType?) => CategoryTestType} */
    test: (partial = null) => {
        return {
            val1: validate_string(partial?.val1) ?? 'test_string',
            val2: validate_number(partial?.val2) ?? 42
        };
    },

    /**@type {(partial: CategoryDataType?) => CategoryDataType} */
    data: (partial = null) => {
        /**@type {CategoryDataType} */
        //@ts-ignore
        const res = {};
        for(const key of SettingsDataFieldsKeysList) {
            res[key] = validate_string(partial?.[key]) ?? `(${key})`;
        }
        res['RODO'] = 'Wraz z wystawieniem zlecenia, zgadzam się na przechowywanie moich danych osobowych przez firmę AUTO-GOLD Piotr Gold';
        return res;
    },
}

const mainSettings = new Settings();


function useMainSettings() {
    return mainSettings;
}

/**
 * @template {SettingsCategoryNames} T
 * @param {T} category_name 
 * @param {(settings: Settings['categories'][T], loaded: boolean) => void} handler 
 */
function add_settings_update_listener(category_name, handler) {
    const listener = (event) => handler(mainSettings.categories[category_name], event.loaded);
    const event_name = get_settings_event_name(category_name);
    window.addEventListener(event_name, listener);
    return () => {
        window.removeEventListener(event_name, listener);
    }
}


export {
    useMainSettings,
    add_settings_update_listener,
    SettingsDefaults,
    SettingsDataFieldsKeysList,
    Settings,
    SettingsManager,
    ReactiveSetting,
    ReactiveSettingValue
};