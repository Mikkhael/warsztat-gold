//@ts-check
import { reactive, toRef } from "vue";
import { DatasetValue, DVUtil } from "../../Dataset/Dataset";

/**
 * @param {Object.<string, any>} props
 * @param {string=} prop_name
 * @return {import("../../Dataset/Dataset").ReactiveDatasetValue}
 */
function convert_control_prop_to_reactive_props(props, prop_name = 'value'){
    const prop_ref = toRef(props, prop_name);
    const prop = prop_ref.value;
    console.log('PROP, REF, PROPS', prop, prop_ref, props);
    if(prop instanceof DatasetValue) {
        return prop.to_reactive_values();
    }
    console.log('NOT DATASET VALUE')
    return reactive({
        local: /**@type {import('vue').Ref<import('../../Dataset/Dataset').SQLValue>} */ (prop_ref),
        remote: undefined,
        changed: false
    });
}


export {
    convert_control_prop_to_reactive_props
}