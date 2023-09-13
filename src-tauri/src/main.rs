// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod test_greet;
use test_greet::*;

mod sqlite_manager;

// mod test_sqlite;

fn main() {
    // test_sqlite::test(std::path::Path::new("C:\\Users\\bondg\\Desktop\\Dev\\warsztat-gold\\test.db3"));

    tauri::Builder::default()
    .manage(TestGreetState::default())
    .manage(sqlite_manager::SqliteManagerLock::default())
    .setup(|app| {
        TestGreetState::init(app);
        sqlite_manager::SqliteManager::init(app);
        Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        greet,
        sqlite_manager::open_database,
        sqlite_manager::close_database,
        sqlite_manager::save_database,
        sqlite_manager::perform_execute,
        sqlite_manager::perform_query,
        sqlite_manager::get_current_db_state,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
