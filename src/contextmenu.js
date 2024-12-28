//@ts-check
import { showMenu } from "tauri-plugin-context-menu";
import { emit } from "@tauri-apps/api/event";

/**
 * @param {HTMLElement & HTMLInputElement} target 
 */
function is_target_an_input_field(target) {
    return (
        target.tagName === 'INPUT' && (
            target.type === 'text'   ||
            target.type === 'number' ||
            target.type === 'date' ||
            target.type === 'datetime-local' ||
            target.type === 'checkbox'
        ) ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
    );
}
/**
 * @param {HTMLElement & HTMLInputElement} target 
 */
function is_target_a_text_field(target) {
    return (
        target.tagName === 'INPUT' && (
            target.type === 'text'   ||
            target.type === 'number'
        ) ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
    );
}

function is_selected_nonempty() {
    return !!(window.getSelection()?.toString());
}
function is_target_editable(/** @type {HTMLInputElement} */ target){
    return !target.disabled;
}
function is_target_changed(/** @type {HTMLInputElement} */ target){
    return target.classList.contains('changed');
}
function is_target_nullable(/** @type {HTMLInputElement} */ target){
    return target.getAttribute('nullable') === 'true';
}

/**
 * @param {any[]} items 
 */
function insert_separators(items) {
    const filtered = items.filter(x => x.length !== 0);
    return filtered.flatMap((x, index) => index === 0 ? x : [{is_separator: true}, ...x]);
}

/**
 * @param {Event} event
 */
function handle_context_menu_event(event) {
    const target = /**@type {HTMLElement & HTMLInputElement} */ (event.target);
    console.log('Opening context menu', target.tagName, target, event);
    event.preventDefault();
    if( is_target_an_input_field(target) ) {
        const text     = is_target_a_text_field(target);
        const selected = is_selected_nonempty();
        const editable = is_target_editable(target);
        const nullable = is_target_nullable(target);
        const changed  = is_target_changed(target);
        const nullable_items = nullable && editable ? [
            {label: "Zeruj", event: (e) => {target.dispatchEvent(new Event('set_as_null'))}},
        ] : [];
        const resetable_items = editable ? [
            {label: "Cofnij zmianę", event: (e) => {target.dispatchEvent(new Event('reset_changes'))}, disabled: !changed},
        ] : [];
        const text_items = text ? [
            {label: "Wytnij", event: "request_clipboard_cut",   disabled: !selected || !editable},
            {label: "Kopiuj", event: "request_clipboard_copy",  payload: target.value},
            {label: "Wklej",  event: "request_clipboard_paste", disabled: !editable},
            {label: "Zaznacz wszystko",  event: (e) => {target.select()}},
        ] : [];
        showMenu({items: insert_separators([
            [
                ...nullable_items,
                ...resetable_items
            ],
            text_items
        ])});
        return;
    }
    showMenu({items: [
        {label: "Otwórz Bazę Danych",  event: "request_db_open"},
        {label: "Zamknij Bazę Danych", event: "request_db_close"},
        {is_separator: true},
        {label: 'Konsola SQL',  event: "open_sql_console_window"},
        {label: 'Okno Testowe', event: "change_to_test_window", payload: '2'},
        {label: 'Dev Tools', event: (e) => {emit('open_devtools');}},
    ]});
}

function setup_event_listener() {
    window.addEventListener("contextmenu", handle_context_menu_event);
}

export default {
    start: setup_event_listener
};


