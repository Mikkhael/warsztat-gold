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
    required: false
};

export function param_from_prop(props, paramName) {
    if(props[paramName] instanceof DataGraphDependable) {
        /**@type {DataGraphDependable<SQLValue>} */
        const res = props[paramName];
        return res;
    } else {
        /**@type {import('vue').Ref<SQLValue>} */
        const res = toRef(props, paramName);
        return res;
    }
}