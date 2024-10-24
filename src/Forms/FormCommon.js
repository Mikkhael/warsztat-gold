//@ts-check

import { TableNode } from '../components/Dataset/Database';
import { FormQuerySource } from '../components/Dataset/Form';
import { QuerySource } from '../components/Dataset/QuerySource';
import { TableSync } from '../components/Dataset/Sync';

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
 * 
 * @param {import('./../components/Dataset/').FormDataSet[]} datasets 
 * @param {{ parent_window?: import('../components/FloatingWindows/FWManager').FWWindow }} props 
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

// ==== COMMON FORM VALUES ROUTINES (CFVR) ====

/**
 * @typedef {{
 *  param?:    MaybeDependable,
 *  default?:  MaybeDependable,
 *  primary?:  boolean,
 *  sql?:      string,
 *  sync?:     TableSync
 *  sync_col?: string 
 * }} StandardFormValueRoutineParams
 * */

/**
 * Assumes same NAME for SRC COLUMN and VALUE // TODO change it
 * @param {FormQuerySource} src 
 * @param {string} name 
 * @param {StandardFormValueRoutineParams} params
 */
function standart_form_value_routine(src, name, params = {}) {
    src.add_select_data(name, params.default ?? params.param ?? null, params.sql);
    const value = src.dataset.get(name);
    if(params.param !== undefined) {
        src.add_where_eq(name, params.param, true);
    }
    if(params.sync) {
        params.sync.assoc_value(params.sync_col ?? name, value, params.primary)
    }
    return value;
}



export {
    init_form_parent_window,
    standard_QV_select,
    standart_form_value_routine
}