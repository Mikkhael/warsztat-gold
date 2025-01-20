import fs from 'fs';


const TAURI_PATH   = `.\\src-tauri\\tauri.conf.json`;
const PACKAGE_PATH = `.\\package.json`;


function swap(input, regex) {

    const regex_res = input.match(regex);

    if(!regex_res || typeof regex_res[1] !== 'string' || typeof regex_res[2] !== 'string') {
        throw new Error("INVALID TAURI FORMATTING");
    }
    
    const new_str = `"version": "${regex_res[1]}${Number(regex_res[2]) + 1}"`;

    const index_start = regex_res.index;
    const index_end   = index_start + new_str.length;
    return input.slice(0, index_start) + new_str + input.slice(index_end);
}

function do_common(path) {
    const str_in = fs.readFileSync(path).toString();
    const str_out = swap(str_in, /"version": "(\d+.\d+.)(\d+)"/);
    fs.writeFileSync(path, str_out);
    return str_out;
}

do_common(TAURI_PATH);
do_common(PACKAGE_PATH);


