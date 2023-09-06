
use rusqlite;


use std::path::Path;
use rand::{distributions::Alphanumeric, Rng};

fn get_random_string(n: usize) -> String{
    rand::thread_rng()
    .sample_iter(&Alphanumeric)
    .take(n)
    .map(char::from)
    .collect()
}

pub fn test(path: &Path){
    let conn = rusqlite::Connection::open(path).expect("Unable to open file");
    let r = conn.execute("
        CREATE TABLE IF NOT EXISTS krzeslo (
            idd INTEGER PRIMARY KEY,
            name TEXT,
            age INT
        ) STRICT", []).expect("Error creating table");
    println!("Created table, Affected {r} rows");

    let name = "Adam_".to_string() + &get_random_string(5);
    let age  = rand::random::<u32>() % 100u32;
    println!("Inserting values {name} and {age}");
    let r = conn.execute("INSERT INTO krzeslo (name, age) VALUES (?1, ?2)", (name, age)).expect("Error inserting values");
    println!("Created table, Affected {r} rows");

    let mut stmt = conn.prepare("SELECT * FROM krzeslo WHERE age > 20").expect("Unable to prepare SELECT stmt");
    let mut rows = stmt.query(()).expect("Error executing query");
    let mut r = 0usize;
    while let Some(row) = rows.next().expect("Error fetching row") {
        let name: String = row.get("name").expect("Unable to convert 'name' col");
        let age:  u32    = row.get("age").expect("Unable to convert 'age' col");
        let idd:  u64    = row.get(0).expect("Unable to convert '0' col");
        println!("{r}:\t [{name}] is {age} years old. [{idd}]");
        r += 1;
    }
    println!("Selected rows, Affected {r} rows");
}