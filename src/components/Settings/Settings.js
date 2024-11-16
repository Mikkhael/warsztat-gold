//@ts-check

import { computed, onMounted, onUnmounted, ref } from "vue";
import { FormDataValueLike } from "../Dataset";
import { array_compare, object_map } from "../../utils";

/**
 * @typedef {string | number | boolean} SettingTypeNonArray
 * @typedef {SettingTypeNonArray | SettingTypeNonArray[]} SettingType
 */
/**
 * @typedef {"test" | "backup"} SettingsCategoryNames
 */

/**
 * @template {SettingsCategoryNames} N
 * @template {SettingType} [T=SettingType]
 * @extends {FormDataValueLike<T>}
 */
class ReactiveSetting extends FormDataValueLike {
    /**
     * 
     * @param {ReactiveSettingsCategory<N>} settings_category 
     * @param {keyof Settings['categories'][N]} field_name
     * @param {T} initial_value 
     */
    constructor(settings_category, field_name, initial_value) {
        super(initial_value);

        this.category = settings_category;
        this.field_name = field_name;
    }

    /**@returns {T} */
    get_true_value() {
        return this.category.get_true_field(this.field_name);
    }
    refresh() {
        //@ts-ignore
        this.local.value = NaN;
        //@ts-ignore
        this.local.value = this.get_true_value();
    }
    is_changed() {
        const true_value = this.get_true_value();
        if(Array.isArray(this.local.value) && Array.isArray(true_value)) {
            return !array_compare(this.local.value, true_value);
        } else {
            return this.local.value !== true_value;
        }
    }

}

/**@template {SettingsCategoryNames} T */
class ReactiveSettingsCategory {
    /**
     * 
     * @param {Settings} settings 
     * @param {T} category_name 
     * @param {() => void} on_update
     */
    constructor(settings, category_name, on_update) {
        this.settings = settings;
        this.category_name = category_name;
        this.on_update = on_update;

        /**@type {{[P in keyof settings['categories'][T]]: ReactiveSetting<T, settings['categories'][T][P]>}} */
        this.fields = object_map(settings.categories[category_name], (value, name) => {
            let value_copy = value;
            if(Array.isArray(value)) {
                value_copy = value.filter(x => true);
            }
            return new ReactiveSetting(this, name, value_copy);
        });

        this.changed = computed(() => Object.values(this.fields).some(x => x.changed.value));
    }

    /**
     * @param {keyof Settings['categories'][T]} name 
     */
    get_true_field(name) {
        return this.settings.categories[this.category_name][name];
    }

    update_settings() {
        for(const name in this.fields) {
            this.settings.categories[this.category_name][name] = this.fields[name].get_local();
        }
        this.on_update();
    }

    get_raw_values() {
        // /**@type {{[P in keyof Settings['categories'][T]]: Settings['categories'][T][P]}} */
        /**@type {typeof Settings.prototype.categories[T]} */
        //@ts-ignore
        const res = object_map(this.fields, x => x.get_local());
        return res;
    }
}

/**
 * @param {SettingsCategoryNames} category_name 
 */
function get_settings_event_name(category_name) {
    return 'settings_updated_' + category_name;
}

/**@template {SettingsCategoryNames} T */
class SettingsManager {
    /**
     * @param {Settings} settings 
     * @param {T}        category_name 
     */
    constructor(settings, category_name) {
        this.settings = settings;
        this.category_name = category_name;
    }
    
    /**
     * @param {typeof Settings.prototype.categories[T]} new_values 
     * @returns {Promise<boolean>} True if settings should be updated, false otherwise 
     */
    async update_impl(new_values) {return true;}


    /**
     * @param {ReactiveSettingsCategory<T>} new_values_reactive 
     * @returns {Promise<boolean>} True if settings should be updated, false otherwise 
     */
    async try_update(new_values_reactive) {
        if(!new_values_reactive.changed.value) return true;
        const new_values = new_values_reactive.get_raw_values();
        const good = await this.update_impl(new_values);
        if(!good) return false;
        this.confirmed_update(new_values);
        Object.values(new_values_reactive.fields).forEach(x => x.refresh());
        return true;
    }

    /**
     * @param {typeof Settings.prototype.categories[T]} new_values 
     */
    confirmed_update(new_values) {
        const category = this.settings.categories[this.category_name];
        for(const key in category) {
            category[key] = new_values[key];
        }
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
                /**@type {string[]} */
                paths: [],
                mon_en: true,
                wee_en: true,
                day_en: true,
                std_en: true,
                mon_max: 0,
                wee_max: 4,
                day_max: 7,
                std_max: 1
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
        let on_update = () => {this.poke_update(category_name)};
        const category = new ReactiveSettingsCategory(this, category_name, on_update);
        return category;
    }

    get_reactive_settings_all() {
        /**@type {{[K in SettingsCategoryNames]: ReactiveSettingsCategory<K>}} */
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
    ReactiveSettingsCategory,
    ReactiveSetting
};