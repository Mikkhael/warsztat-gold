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


listen('set_innerHTML', event => {
    const {innerHTML, optionsHTML, withPrint, titleGetter} = event.payload;
    window.document.body.innerHTML = innerHTML;
    _titleGetter = titleGetter ?? '';
    
    const options_elem = document.body.getElementsByClassName('print_options')[0];
    if(options_elem) {
        options_elem.innerHTML += optionsHTML;
    }
    document.getElementsByName('font_size_input').forEach(x => x.setAttribute('value', '16'));

    if(withPrint) {
        perform_print();
    }

});

//@ts-ignore
window.perform_print = perform_print;

emit('ready');

