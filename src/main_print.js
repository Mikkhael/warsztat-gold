//@ts-check

import "./styles.css";
import "./print.css";

import { listen, emit } from "@tauri-apps/api/event";

let _titleGetter = '';

function set_title(value) {
    console.log('Setting title: ', value);
    document.title = value;
}
function refresh_title() {
    try{
        console.log("GETTER: ", _titleGetter);
        const new_title = eval(_titleGetter);
        if(typeof new_title === 'string') {
            set_title(new_title);
        } else {
            throw new Error('Not a string: ' + typeof(new_title));
        }
        return true;
    } catch(err) {
        console.error(err);
    }
    return false;
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

