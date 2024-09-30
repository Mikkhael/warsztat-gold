//@ts-check

/**
 * 
 * @param {import('./../components/Dataset/Dataset').Dataset[]} datasets 
 * @param {{ parent_window: import('../components/FloatingWindows/FWManager').FWWindow }} props 
 */
function init_form_parent_window(datasets, props) {
    props.parent_window?.add_before_close(async (force) => {
        if(force) return false;
        if(datasets.some(x => x.is_changed())){
            const confirmed = await window.confirm('Posiadasz niezapisane zmiany. Czy chesz zamnknąć okno?');
            return !confirmed;
        }
        return false;
    });
    props.parent_window?.box.resize_to_content(true);
}




export {
    init_form_parent_window
}