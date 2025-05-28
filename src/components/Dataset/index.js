import { toRef } from 'vue';
import { DataGraphDependable } from './DataGraph';

export * from './QueryBuilder';
export * from './QuerySource';
export * from './DataGraph';
export * from './Database';
export * from './Form';
export * from './Sync';

/**
 * @typedef {import('./QuerySource').SQLValue} SQLValue
 * @typedef {DataGraphDependable<SQLValue> | SQLValue} FormParamType
 * @typedef {import('vue').PropType<FormParamType>} FormParamPropType
 */

export const FormParamProp = {
    /**@type {FormParamPropType} */ 
    type: [Number, String, DataGraphDependable],
    required: /**@type {const} */ (false)
};
export const FormDefaultProps = {
    parent_window: {
        /**@type {import('vue').PropType<import('../FloatingWindows/FWManager').FWWindow>} */
        type: Object,
        required: false
    },
    use_src: {
        /**@type {import('vue').PropType<import('./Form').FormQuerySourceSingle>} */
        type: Object,
        required: false
    },
}

// TODO improve
/**
 * @template T
 * @param {T} props 
 * @param {keyof T} paramName 
 */
export function param_from_prop(props, paramName) {
    if(props[paramName] === undefined) {
        return undefined;
    }
    if(props[paramName] instanceof DataGraphDependable) {
        /**@type {DataGraphDependable<SQLValue>} */
        const res = props[paramName];
        // console.log("PARAM", paramName, res, props);
        return res;
    } else {
        /**@type {import('vue').Ref<SQLValue>} */
        const res = toRef(props, paramName);
        // console.log("PARAM", paramName, res, props);
        return res;
    }
}