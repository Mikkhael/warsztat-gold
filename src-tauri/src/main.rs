// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::{Path, PathBuf};

use tauri::Manager;
use tauri_plugin_context_menu;

mod utils;
mod sqlite_manager;
mod encoding;
mod backup;
// mod update;

#[tauri::command]
fn join_path(a: &Path, b: &Path) -> PathBuf {
    a.join(b)
}
#[tauri::command]
fn file_name(path: &Path) -> String {
    path.file_name().unwrap_or_default().to_string_lossy().to_string()
}

struct ClosePreventionState(std::sync::Mutex<bool>);

#[tauri::command]
fn sync_close_prevention(value: bool, close_prevention_state: tauri::State<ClosePreventionState>) {
    let mut state = close_prevention_state.0.lock().unwrap();
    // println!("Close Prevention State: {} (was {})", value, *state);
    *state = value;
}

fn main() {

    tauri::Builder::default()
    .manage(sqlite_manager::SqliteManagerLock::default())
    .manage(ClosePreventionState(false.into()))
    .plugin(tauri_plugin_context_menu::init())
    .setup(|app| {
        sqlite_manager::SqliteManager::init(app);
        let app_handle = app.app_handle();
        app.listen_global("open_devtools", move |_event| {
            println!("Opening Devtools");
            app_handle.get_window("main").unwrap().open_devtools();
        });
        // let app_handle = app.app_handle();
        // tauri::async_runtime::spawn(async move {
        //     let result = app_handle.updater().endpoints(&["http://127.0.0.1/test_tauri_updater.json".to_owned()]).check().await;
        //     match result {
        //         Ok(respnse)  => println!("Updater Resp  {:?}, {:?}", respnse.is_update_available(), respnse.body()),
        //         Err(err)     => println!("Updater Error {:?}", err),
        //     };
        // });
        Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        join_path,
        file_name,
        sync_close_prevention,
        sqlite_manager::open_database,
        sqlite_manager::rebuild_database,
        sqlite_manager::close_database,
        sqlite_manager::save_database,
        sqlite_manager::export_csv,
        sqlite_manager::import_csv,
        // sqlite_manager::perform_insert,
        sqlite_manager::perform_execute,
        // sqlite_manager::perform_execute_batch,
        sqlite_manager::perform_query,
        sqlite_manager::get_current_db_state,
        backup::perform_backup_lists,
        backup::perform_backup,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
