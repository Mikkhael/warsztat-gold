const fs = require('fs');
const readline = require('readline');

const main_tables = [
    "CENNIK  GM",
    "czynność",
    "dane do zaświadczenie o sprawności inst",
    "dokumenty sprzedaży",
    "dokumenty sprzedaży chwilówk",
    "dostawcy",
    "faktura szczegóły chwilówka",
    "inwentaryzacja",
    "inwentaryzacja nr 3",
    "jamar",
    "klienci",
    "liczby słownie",
    "modele sam",
    "nazwy części",
    "obroty magazynowe",
    "płace",
    "pracownicy",
    "przyjęcia PZ",
    "rodzaje dokumentów",
    "samochody klientów",
    "sposób zapłaty",
    "sprzedaż",
    "zamówienia części",
    "zamówienia części archiwum",
    "zlecenia czynności",
    "zlecenia gaz",
    "zlecenia instalacji gazowej",
    "zlecenia naprawy",
];

function stringToHash(string) {
             
    let hash = 0;
     
    if (string.length == 0) return hash;
     
    for (i = 0; i < string.length; i++) {
        char = string.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
     
    return hash;
}

function trim_trailing_spaces_in_string(string){
    return string.replace(/ ";/g, '";');
}

async function load_hashes(path, mod) {
    let res = [];
    let file = fs.createReadStream(path);
    const lines = readline.createInterface({input: file, crlfDelay: Infinity});
    for await (let line of lines) {
        if(mod){
            line = trim_trailing_spaces_in_string(line);
        }
        res.push(stringToHash(line));
    }
    file.close();
    return res;
}

async function test_csv(table_name) {
    const path_1 = `../EXPORT_TEST_1/${table_name}.txt`;
    const path_2 = `${table_name}.txt`;

    let h1 = await load_hashes(path_1, true);
    let h2 = await load_hashes(path_2);

    if(h1.length != h2.length) {
        console.log(`DIFFERENT LINES NUMBER !!!!! ${h1.length} / ${h2.length}`, table_name);
        return;
    }
    
    let reordered = false;
    for (let i = 0; i < h1.length; i++) {
        if(h1[i] != h2[i]) {
            if(h2.indexOf(h1[i]) !== -1){
                reordered = true;
            } else {
                console.log(`CANNOT FIND LINE !!!!! idx: ${i}`, table_name);
                return;
            }
        }
    }

    if(reordered) {
        console.log(`reordered`, table_name);
        return;
    }
    // console.log(`ok.`, table_name);
}

async function main(){
    for(let table_name of main_tables) {
        await test_csv(table_name);
    }
}

main();
