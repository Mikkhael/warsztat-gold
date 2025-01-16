//@ts-check

function smart_focus_impl(target) {
    target.focus();
    target.select();
    return;
}

/**
 * @param {Element | Iterable<Element>} target_list
 * @param {Element} [self]
 */
function smart_focus_next(target_list, self) {
    if(target_list instanceof Element) {
        smart_focus_impl(target_list);
        return true;
    }

    const focusable_list = Array.from(target_list).filter(elem => elem?.classList?.contains?.('enter_focusable'));
    if(focusable_list.length === 0) {return false;}
    const self_index = self ? focusable_list.indexOf(self) : -1;

    console.log("FOCUSING: ", self, focusable_list.length, focusable_list, self_index);

    const new_index = (self_index + 1) % focusable_list.length;
    const elem_to_focus = focusable_list[new_index];

    smart_focus_impl(elem_to_focus);
    return true;
}

/**
 * @param {HTMLElement} self
 */
function smart_focus_next_form(self) {
    /**@type {HTMLFormElement?} */
    //@ts-ignore
    const form = self.form;
    if(!form) return;
    return smart_focus_next(form.elements, self);
}

export {
    smart_focus_next,
    smart_focus_next_form,
    smart_focus_impl
}