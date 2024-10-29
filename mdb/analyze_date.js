//@ts-check

import fs from 'fs';

const EXPORTED_FROM_MDB_FOLDER  = './exported_from_mdb/';
// const EXPORTED_FROM_MDB_FOLDER  = './exported_from_sqlite/tak/';

/**@type {[boolean, string, string, number, number, number, number][]} */
const datas_cols = [
  [false,  `dane do zaświadczenie o sprawności inst` ,  `Ważność legalizacji zbiornika do` , 0, 0, 0, 0],
  [false,  `płace`                                   ,  `miesiąc płacenia`                 , 0, 0, 0, 0],
  [false,  `pracownicy`                              ,  `data urodzenia`                   , 0, 0, 0, 0],
  [false,  `zamówienia części archiwum`              ,  `data realizacji`                  , 0, 0, 0, 0],
  [false,  `zlecenia instalacji gazowej`             ,  `data zamknięcia`                  , 0, 0, 0, 0],
  [false,  `zlecenia naprawy`                        ,  `data zamknięcia`                  , 0, 0, 0, 0],

  [true,   `dokumenty sprzedaży`                     ,  `data wystawienia`                 , 0, 0, 0, 0],
  [true,   `dokumenty sprzedaży chwilówk`            ,  `data wystawienia`                 , 0, 0, 0, 0],
  [true,   `inwentaryzacja`                          ,  `data zapisu`                      , 0, 0, 0, 0],
  [true,   `inwentaryzacja nr 3`                     ,  `data zapisu`                      , 0, 0, 0, 0],
  [true,   `klienci`                                 ,  `KIEDY`                            , 0, 0, 0, 0],
  [true,   `obroty magazynowe`                       ,  `data przyjęcia`                   , 0, 0, 0, 0],
  [true,   `przyjęcia PZ`                            ,  `data przyjęcia`                   , 0, 0, 0, 0],
  [true,   `sprzedaż`                                ,  `data przyjęcia`                   , 0, 0, 0, 0],
  [true,   `zamówienia części`                       ,  `data zamówienia`                  , 0, 0, 0, 0],
  [true,   `zamówienia części archiwum`              ,  `data zamówienia`                  , 0, 0, 0, 0],
  [true,   `zlecenia instalacji gazowej`             ,  `data otwarcia`                    , 0, 0, 0, 0],
  [true,   `zlecenia naprawy`                        ,  `data otwarcia`                    , 0, 0, 0, 0],
];

function normalize(str) {
    return str.replace(/[^a-zA-Z ]/g,'.');
}

function get_col_from_file(I, filename, column) {
    let file = fs.readFileSync(EXPORTED_FROM_MDB_FOLDER + filename + '.txt').toString();
    
    const firest_enter = file.indexOf('\n');
    const header_line = file.slice(0, firest_enter);

    file = file.slice(firest_enter + 1);
    file = file.replace(/\"\"/g, '');
    // file = file.replace(/(?<=^(?:[^"]*"[^"]*")*[^"]*"[^"]*)\r?\n/g,'XX'); // Replace every \n inside quotes
    // let lines = file.match(/(?<=^(?:[^"]*"[^"]*")*[^"]*)\n/g); // Splite at every \n outside quotes

    let invalid_ns = [];
    let in_quotes = false;
    for(let i = 0; i < file.length; i++){
        const char = file[i];
        if(char === '"') {
            in_quotes = !in_quotes;
            continue;
        }
        if((char === '\n' || char === ';') && in_quotes) {
            invalid_ns.push(i);
        }
    }
    let true_file = "";
    let curr_off = 0;
    for(let i = 0; i < invalid_ns.length; i++) {
        const to_invalid = invalid_ns[i];
        true_file += file.slice(curr_off, to_invalid);
        curr_off = to_invalid + 1;
    }
    true_file += file.slice(curr_off);
    const lines = true_file.split('\n');
    // console.log(filename, invalid_ns);
    // return;

    // console.log('BEFORE', [file.slice(0, 100)]);
    // file = file.replace(/\"[\s\S]+?\"/g, 'STRING');
    // console.log('AFTER', [file.slice(0, 100)]);
    // return;

    // let lines = file.split('\n');
    // let in_quotes = false;
    // for(let i = 0; i < lines.length; i++) {
    //     const line = lines[+i];
    //     const n_quotes = count_quotes(line);
    //     if(n_quotes % 2 === 1) in_quotes = !in_quotes;
    //     let removed = 0;
    //     let true_line = line;
    //     while(in_quotes) {
    //         if(+i === lines.length - 1) {
    //             throw new Error("Uneven quotes");
    //         }
    //         lines[i] += ' ' + lines[i+1];
    //     }
    // }
    // lines = lines.filter(x => x !== null && x !== '');

    // console.log(lines);
    // console.log(lines.length);

    const header_regex = new RegExp('"' + normalize(column) + '"');

    const headers = header_line.split(';');
    const off = headers.findIndex(x => x.match(header_regex));
    
    // console.log(filename, [column, off !== -1 ? headers[off] : '===']);

    get_formats_of_cols(I, lines, off);
}

/**
 * 
 * @param {string[]} lines 
 * @param {number} off 
 */
function get_formats_of_cols(I, lines, off) {
    if(lines.length === 1 && lines[0].length === 0) {
        // console.log('===');
        return;
    }
    for(let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const split_line = line.split(';');
        const val = split_line[off];
        if(val === undefined) {
            if(line.length === 0) {
                continue;
            }
            // console.log("UNDEFINED", '"' + line + '"', I, off);
            console.log("UNDEFINED", datas_cols[I][1], off, i, line.length);
            console.log(line);
            throw 123;
            continue;
        }
        if        (val.match(/^"?\d\d\d\d-\d\d-\d\d 00:00:00"?\s?$/g)) {
            datas_cols[I][3] += 1;
        } else if (val.match(/^"?\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d"?\s?$/g)) {
            datas_cols[I][4] += 1;
        }
        else if(val.length === 0) {
            datas_cols[I][5] += 1;
        } else {
            datas_cols[I][6] += 1;
            console.log('!!! OTHER - ', "'" + val + "'", datas_cols[I][1], off, i);
            console.log(line);
        }
        // console.log(val);
    }
}

for(let i in datas_cols) {
    const c = datas_cols[i];
    get_col_from_file(i, c[1],c[2]);
}

// console.log(datas_cols.map(x => [x[1].slice(0, 10), x[2], x[3], x[4], x[5], x[6]]));
console.log(datas_cols.map(x => [x[3], x[4], x[5], x[6]]).join('\n'));

