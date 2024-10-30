//@ts-check

import { onMounted, onUnmounted } from 'vue';
import { FormQuerySource } from '../components/Dataset/Form';
import { QuerySource } from '../components/Dataset/QuerySource';
import { TableSync } from '../components/Dataset/Sync';
import { Column, TableNode } from '../components/Dataset';

/**
 * @typedef {import('../components/Dataset').SQLValue} SQLValue
 */
/**
 * @template [T=SQLValue]
 * @typedef {import('../components/Dataset').MaybeRef<T>} MaybeRef
 */
/**
 * @template [T=SQLValue]
 * @typedef {import('../components/Dataset').MaybeDependable<T>} MaybeDependable
 */

/**
 * @typedef {import('../components/FloatingWindows/FWManager').FWWindow} FWWindow
 */

/**
 * 
 * @param {import('./../components/Dataset/').QuerySource[]} srcs 
 * @param {{ parent_window?: FWWindow}} props 
 */
function init_form_parent_window(srcs, props) {
    props.parent_window?.add_before_close(async (force) => {
        if(force) return false;
        if(srcs.some(x => x.changed.value)){
            const confirmed = await window.confirm('Posiadasz niezapisane zmiany. Czy chesz zamnknąć okno?');
            return !confirmed;
        }
        return false;
    });
    props.parent_window?.box.resize_to_content(true).recenter();
}

const default_on_error = err => {throw err};

/**
 * @param {{use_src?: FormQuerySource?, parent_window?: FWWindow}} props 
 * @param {(err: any) => void} [on_error]
 * @param {FormQuerySource?} src 
 */
function CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, on_error = default_on_error, src = null) {
    const _src = src ?? props.use_src ?? new FormQuerySource();

    const db_opened_listener = () => {
        _src.request_refresh();
        _src.update_complete().catch(on_error);
    }
    
    onMounted(() => {
        init_form_parent_window([_src], props);
        window.addEventListener   ('db_opened', db_opened_listener);
        _src.update_complete().catch(on_error);
    });
    onUnmounted(() => {
        _src.disconnect();
        window.removeEventListener('db_opened', db_opened_listener); 
    });

    return _src;
}


/**
 * @typedef {[QuerySource, number] | [QuerySource, number, string]} QueryViewerSelectHandlerStanderdStep
 */

/**
 * 
 * @param {QueryViewerSelectHandlerStanderdStep[]} steps 
 * @param {(err: any) => void} handle_error
 * @param {(row: any[], offset: number, cols: string[]) => void} [addictional_callback]
 */
function standard_QV_select(steps, handle_error, addictional_callback) {
    const first_src = steps[0][0];

    
    /**@type {(cols: string[], row: any[], offset: number, close: () => void) => Promise<boolean>} */
    const res_handler = (cols, row, offset, close) => {
        return first_src.try_perform_and_update_confirmed(() => {
            addictional_callback?.(row, offset, cols);
            for(const [src, idx, colname] of steps) {
                src.request_offset_rownum(row[idx], colname);
            }
        }).then(succ => {
            if(succ) close();
            return succ;
        }).catch(err => {
            handle_error(err);
            return false;
        });
    };
    return res_handler;
}


export {
    init_form_parent_window,
    standard_QV_select,
    CREATE_FORM_QUERY_SOURCE_IN_COMPONENT
}