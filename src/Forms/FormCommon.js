//@ts-check

import { QuerySource } from '../components/Dataset/QuerySource';

/**
 * 
 * @param {import('./../components/Dataset/').FormDataSet[]} datasets 
 * @param {{ parent_window: import('../components/FloatingWindows/FWManager').FWWindow }} props 
 */
function init_form_parent_window(datasets, props) {
    props.parent_window?.add_before_close(async (force) => {
        if(force) return false;
        if(datasets.some(x => x.changed.value)){
            const confirmed = await window.confirm('Posiadasz niezapisane zmiany. Czy chesz zamnknąć okno?');
            return !confirmed;
        }
        return false;
    });
    props.parent_window?.box.resize_to_content(true);
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
    const leaf_src = steps[steps.length - 1][0];

    
    /**@type {(cols: string[], row: any[], offset: number, close: () => void) => Promise<boolean>} */
    const res_handler = (cols, row, offset, close) => {
        // TODO check for disabled bottom form
        return leaf_src.try_perform_and_update_confirmed(() => {
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
    standard_QV_select
}