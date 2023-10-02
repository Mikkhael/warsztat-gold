// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::{Path, PathBuf};


mod utils;
mod sqlite_manager;
mod encoding;

#[tauri::command]
fn join_path(a: &Path, b: &Path) -> PathBuf {
    a.join(b)
}
#[tauri::command]
fn file_name(path: &Path) -> String {
    path.file_name().unwrap_or_default().to_string_lossy().to_string()
}

fn main() {

    tauri::Builder::default()
    .manage(sqlite_manager::SqliteManagerLock::default())
    .setup(|app| {
        sqlite_manager::SqliteManager::init(app);
        Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        join_path,
        file_name,
        sqlite_manager::open_database,
        sqlite_manager::close_database,
        sqlite_manager::save_database,
        sqlite_manager::export_csv,
        sqlite_manager::import_csv,
        sqlite_manager::perform_execute,
        sqlite_manager::perform_execute_batch,
        sqlite_manager::perform_query,
        sqlite_manager::get_current_db_state,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
