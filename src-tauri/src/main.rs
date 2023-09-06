// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod test_greet;
use test_greet::*;

// mod test_sqlite;

fn main() {
    // test_sqlite::test(std::path::Path::new("C:\\Users\\bondg\\Desktop\\Dev\\warsztat-gold\\test.db3"));

    tauri::Builder::default()
    .manage(TestGreetState::default())
    .setup(|app| {
        TestGreetState::init(app);
        Ok(())
    })
    .invoke_handler(tauri::generate_handler![greet])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
