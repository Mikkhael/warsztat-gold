//@ts-check
import { computed, reactive, toRefs, watch } from 'vue';
import { FormDataValue } from '../../Dataset';
import { typeofpl } from '../../../utils';

/**
 * @param {{value: FormDataValue, readonly: boolean, nonull: boolean, options: any[]}} props 
 */
function use_FormEnum(props) {
    const value = props.value;
    // console.log('VALUE CONTROL', value);

    // Lista wszystkich dozwolonych wartości [klucz: faktyczna wartość SQLValue, display: string]
    const options = computed(() => {
        /**@type {[any, any][]} */
        const entries = [];
        for(let entry of props.options){
            if(entry instanceof Array && entry.length >= 2) {
                entries.push([entry[0], entry[1]]);
            } else {
                entries.push([entry, entry]);
            }
        }
        return new Map(entries);
    });

    // Uniemożliwienie wyświetlenia wartości innej niż dozwolona
    const local_proxy = computed({
        get() {return options.value.has(value.get_local()) ? value.get_local() : 
                      value.get_local() === null           ? null :
                                                            '___unknown'; },
        set(new_value) {value.local.value = new_value;}
    });
    
    // Jesli pusta - wartość jest poprawna
    const custom_validity_message = computed(() => {
        const local = value.get_local();
        const map   = options.value;
        const rdonly = props.readonly;
        const nonull = props.nonull;
        if (rdonly) return '';
        if (local === null && nonull)          { return 'Wartość nie może być pusta'; }
        if (local !== null && !map.has(local)) { return `Nieoczekiwana wartość (${typeofpl(local)}): ${local}`;}
        return '';
    });

    const res = reactive({
        local: value.local,
        cached: value.get_cached_ref(),
        changed: value.changed,
        options,
        local_proxy,
        custom_validity_message
    });

    return res;
}

export {
    use_FormEnum
}


