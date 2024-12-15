//@ts-check

import { onMounted, onUnmounted } from 'vue';
import { FormQuerySourceBase, FormQuerySourceSingle } from '../components/Dataset';
import { QuerySource } from '../components/Dataset/QuerySource';
import { ClosePreventionManager, useMainClosePreventionManager } from '../ClosePrevention';

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

const default_on_error = err => {throw err};

/**
 * @template {FormQuerySourceBase} [T=FormQuerySourceSingle]
 * @param {{use_src?: FormQuerySourceSingle?, parent_window?: FWWindow}} props 
 * @param {{
 *  on_error?: (err: any) => any,
 *  src?: T,
 *  closePreventionManager?: ClosePreventionManager,
 *  implicit_order_rowid?: boolean,
 * }} options
 * @returns {T}
 */
function CREATE_FORM_QUERY_SOURCE_IN_COMPONENT(props, options) {
    /**@type {T} */
    //@ts-ignore
    const _src      = options.src ?? props.use_src ?? new FormQuerySourceSingle(options.implicit_order_rowid ?? true);
    const _on_error = options.on_error ?? default_on_error;
    const _closePreventionManager = options.closePreventionManager ?? useMainClosePreventionManager();
    _closePreventionManager.start_in_component(_src.changed, props.parent_window);

    const db_opened_listener = () => {
        _src.request_refresh();
        _src.update_complete().catch(_on_error);
    }

    onMounted(() => {
        props.parent_window?.box.resize_to_content(true).recenter();
        window.addEventListener   ('db_opened', db_opened_listener);
        _src.update_complete().catch(_on_error);
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
    standard_QV_select,
    CREATE_FORM_QUERY_SOURCE_IN_COMPONENT
}