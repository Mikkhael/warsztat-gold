//@ts-check
import { computed, reactive } from 'vue';
import { ChangableValueLike } from '../../Dataset';

/**
 * @param {{value: ChangableValueLike, readonly: boolean, allownull: boolean}} props 
 */
function use_FormCheckbox(props) {
    const value = props.value;

    // Uniemożliwienie wyświetlenia wartości innej niż dozwolona
    const local_proxy = computed({
        get() {return !!value.get_local(); },
        set(new_value) {value.set_local(new_value);}
    });
    
    // Jesli pusta - wartość jest poprawna
    const custom_validity_message = computed(() => {
        const local = value.get_local();
        const rdonly = props.readonly;
        const nonull = !props.allownull;
        if (rdonly) return '';
        if (local === null && nonull)          { return 'Wartość nie może być pusta'; }
        return '';
    });

    const res = reactive({
        local: value.get_local_ref(),
        cached: value.get_cached_ref(),
        changed: value.changed,
        local_proxy,
        custom_validity_message
    });

    return res;
}

export {
    use_FormCheckbox
}


