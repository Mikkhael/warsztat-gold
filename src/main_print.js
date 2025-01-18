//@ts-check

import "./styles.css";
import "./print.css";

import { listen, emit } from "@tauri-apps/api/event";

let _titleGetter = '';

function set_title(value) {
    console.log('Setting title: ', value);
    document.title = value;
}
function parse_title(titleGetter = '') {
    let res = titleGetter;
    const embed_strings = titleGetter.match(/{{[a-zA-Z0-9_]+}}/g);
    console.log(embed_strings);
    if(!embed_strings) return titleGetter;
    for(const embed_string of embed_strings) {
        const name = embed_string.slice(2, -2);
        const value = document.getElementsByName(name)[0]?.innerText ?? '';
        res = res.replaceAll(embed_string, value);
    }
    return res;
}

function refresh_title() {
    const new_title = parse_title(_titleGetter);
    set_title(new_title);
}

function perform_print() {
    if(_titleGetter !== '') {
        refresh_title();
    }
    window.print();
}
//@ts-ignore
window.perform_print = perform_print;


function try_print() {
    const all_elements_in_print_options = document.querySelectorAll('.print_options *');
    for(const elem of all_elements_in_print_options) {
        //@ts-ignore
        if(elem.reportValidity && !elem.reportValidity()) {
            return;
        }
    }
    perform_print();
}
//@ts-ignore
window.try_print = try_print;


//////// INTERACTIVE REP ////////////////

function toggle_print_options(target) {
    const elem = document.querySelector('.print_options');
    if(!elem) return;
    const is_hidden = elem.getAttribute('hidden') === '1';
    elem.setAttribute('hidden', is_hidden ? '0' : '1');
    if(target) {
        target.setAttribute('value', is_hidden ? '>' : '<');
    }
    console.log(elem, target);
}
//@ts-ignore
window.toggle_print_options = toggle_print_options;


function set_text_by_name(name, value) {
    const elems = document.getElementsByName(name);
    for(const elem of elems) {
        elem.innerText = value;
    }
}
//@ts-ignore
window.set_text_by_name = set_text_by_name;


/**
 * @param {string} name 
 * @param {string} value 
 * @param {"set" | "remove"} type 
 */
function set_class_by_name(name, value, type) {
    const elems = document.getElementsByName(name);
    for(const elem of elems) {
        switch(type) {
            case "set":    elem.classList.add(value); break;
            case "remove": elem.classList.remove(value); break;
        }
    }
}
//@ts-ignore
window.set_class_by_name = set_class_by_name;


/**
 * @param {string} name 
 * @param {string} value 
 * @param {"set" | "remove"} type 
 */
function set_battr_by_name(name, value, type) {
    const elems = document.getElementsByName(name);
    for(const elem of elems) {
        switch(type) {
            case "set":    elem.setAttribute(value,''); break;
            case "remove": elem.removeAttribute(value); break;
        }
    }
}
//@ts-ignore
window.set_battr_by_name = set_battr_by_name;


/////////////////////////////////////////

listen('set_innerHTML', event => {
    const {innerHTML, optionsHTML, withPrint, titleGetter} = event.payload;
    window.document.body.innerHTML = innerHTML;
    _titleGetter = titleGetter ?? '';
    
    const options_elem = document.body.getElementsByClassName('print_options')[0];
    if(options_elem && optionsHTML) {
        options_elem.innerHTML += optionsHTML;
    }
    document.getElementsByName('font_size_input').forEach(x => x.setAttribute('value', '16'));

    if(withPrint) {
        perform_print();
    }

});





emit('ready');

