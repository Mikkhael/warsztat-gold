//@ts-check

import { Column, FormQuerySource } from "../components/Dataset";

/**
 * @typedef {import("../components/Dataset").StandardFormValueRoutineParams} StandardFormValueRoutineParams
 */

class RepQuerySource extends FormQuerySource{
    constructor() {
        super(false);
        this.disable_deps();
        this.disable_offset();
    }

    /**
     * @param {Column} col 
     * @param {StandardFormValueRoutineParams} params
     */
    auto_rep_value(col, params = {}) {
        const form_value = this.auto_form_value(col, params);
        const res = form_value.get_cached_ref();
        if(res === null) {
            throw new Error('Dataset inside RepQuerySource is not connected to the source itself!!');
        }
        return res;
    }
}


export {
    RepQuerySource
}