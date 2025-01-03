//@ts-check

import "./styles.css";
import "./print.css";

import { listen, emit } from "@tauri-apps/api/event";

listen('set_innerHTML', event => {
    const {innerHTML, optionsHTML, withPrint} = event.payload;
    window.document.body.innerHTML = innerHTML;
    
    const options_elem = document.body.getElementsByClassName('print_options')[0];
    if(options_elem) {
        options_elem.innerHTML += optionsHTML;
    }
    document.getElementsByName('font_size_input').forEach(x => x.setAttribute('value', '16'));

    if(withPrint) {
        window.print();
    }

});

emit('ready');

 

