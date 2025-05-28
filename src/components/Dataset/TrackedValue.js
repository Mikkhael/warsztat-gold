import { computed, isReactive, isRef, markRaw, reactive, toRef, unref } from "vue";

import "./types.js";
import { Column } from "./Database";
import { DataGraphNodeBase } from "./DataGraph";

const PRIVATE_CONSTRUCTOR_SYMBOL = Symbol("PRIVATE_CONSTRUCTOR_SYMBOL");
const PRIVATE_CONSTRUCTOR_GUARD = {[PRIVATE_CONSTRUCTOR_SYMBOL]: true};

/**
 * @typedef {{
 *  column?: Column,
 *  format?: FormValueFormat,
 *  format_props?: any,
 *  deps?:   DataGraphNodeBase[],
 * }} TrackedValueMetadata
 */

/**
 * @template [T=SQLValue]
 */
export class TrackedValue {

    constructor(/**@type {typeof PRIVATE_CONSTRUCTOR_GUARD} */ _PRIVATE_CONSTRUCTOR_GUARD, current, old) {

        this.current = /**@type {T} */ (current);
        this.old     = /**@type {T | undefined} */ (old);
        this.__changed_forced = /**@type {boolean | undefined} */ (undefined);

        this.changed = false; // set in "__initialize()"

        this.metadata = markRaw(/**@type {TrackedValueMetadata} */ ({}));
    }

    __initialize() {
        const self = this;

        //@ts-ignore
        this.changed = /**@type {boolean} */ (computed({
            get()  {return self.__changed_forced ?? self._changed_impl();},
            set(/**@type {boolean | undefined} */ v) {self.__changed_forced = v;},
        }));
    }

    current_ref() {return toRef(this, 'current');}
    old_ref()     {return toRef(this, 'old');}
    changed_ref() {return toRef(this, 'changed');}
    reset() {if(this.old !== undefined) this.current = this.old;}

    _changed_impl() {
        return this.old !== undefined && this.current !== this.old;
    }

    /**@template [T=SQLValue] */
    static Create(/**@type {MaybeRef<T>} */ current, /**@type {MaybeRef<T> | undefined} */ old = undefined) {
        const res = reactive(new TrackedValue(PRIVATE_CONSTRUCTOR_GUARD, current, old));
        res.__initialize();
        return res;
    }
    /**@template [T=SQLValue] */
    static FromColumn(/**@type {Column} */ column, /**@type {MaybeRef<T>} */ current, /**@type {MaybeRef<T> | undefined} */ old = undefined) {
        const res = TrackedValue.Create(current, old);
        res.metadata.column = column;
        return res;
    }

}

