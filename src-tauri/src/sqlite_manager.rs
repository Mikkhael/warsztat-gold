use rusqlite::Rows;
use rusqlite::{Connection, Result, Error, backup::Backup};
use std::path::{Path, PathBuf};
use rusqlite::types::ValueRef;
use std::sync::Mutex;


use tauri::api::dialog;

#[derive(Default)]
pub struct SqliteManager{
    conn: Option<Connection>,
    path: Option<PathBuf>
}

pub type SqliteManagerLock = Mutex<SqliteManager>;

fn valueref_to_json(value: ValueRef<'_>) -> serde_json::Value {
    use ValueRef::*;
    match value {
        Null       => serde_json::Value::Null,
        Integer(v) => v.into(),
        Real(v)    => v.into(),
        Text(v)    => String::from_utf8_lossy(v).into(),
        Blob(v)    => v.into()
    }
}

pub type ExtractedRows = Vec<Vec<serde_json::Value>>;
pub fn extract_all_rows<'a>(rows: &'a mut Rows, cols: usize) -> Result<ExtractedRows> {
    let mut res : ExtractedRows = Vec::new();
    while let Some(row) = rows.next()? {
        let mut row_strings = Vec::with_capacity(cols);
        for i in 0..cols {
            row_strings.push( valueref_to_json(row.get_ref(i)?) );
        }
        res.push(row_strings);
    }
    Ok(res)
}

// fn convert_cell_to_string(cell_ref: rusqlite::types::ValueRef) -> String{
//     use rusqlite::types::ValueRef::*;
//     match cell_ref {
//         Null            => "null".to_string(),
//         Integer(v)      => v.to_string(),
//         Real(v)         => v.to_string(),
//         Text(v)         => String::from_utf8_lossy(v).to_string(),
//         _               => "blob".to_string()
//     }
// }

impl SqliteManager{
    pub fn is_open(&self)  -> bool { self.conn.is_some() }
    pub fn get_conn(&self) -> Option<&Connection> { self.conn.as_ref() }
    pub fn get_path(&self) -> Option<&Path> { self.path.as_ref().map(|p| p.as_path()) }

    pub fn open(&mut self, path: &Path) -> Result<(), Error>{ 
        let res = Connection::open(path); 
        if let Ok(conn) = res {
            self.conn = Some(conn);
            self.path = Some(path.to_path_buf());
            return Ok(());
        } else {
            self.conn = None;
            self.path = None;
            return Err(res.err().unwrap());
        }
    }
    pub fn close(&mut self){ 
        self.conn = None;
        self.path = None;
    }

    pub fn execute(&self, query: &str) -> Result<usize> {
        if let Some(conn) = self.get_conn() {
            conn.execute(&query, ())
        }else{
            Ok(0)
        }
    }
    pub fn query(&self, query: &str) -> Result<ExtractedRows> {
        if let Some(conn) = self.get_conn() {
            let mut stmt = conn.prepare(&query)?;
            let cols = stmt.column_count();
            let mut rows = stmt.query(())?;
            extract_all_rows(&mut rows, cols)
        }else{
            Ok(Default::default())
        }
    }


}

#[derive(serde::Serialize)]
pub struct CurrentDbState {
    is_open: bool,
    path: PathBuf
}
#[tauri::command]
pub fn get_current_db_state(sqlite_manager: tauri::State<SqliteManagerLock>) -> Result<CurrentDbState, String>{
    let db = sqlite_manager.lock().map_err(|err| err.to_string())?;
    Ok(CurrentDbState {
        is_open: db.is_open(),
        path: db.path.clone().unwrap_or("".into())
    })
}


#[tauri::command]
pub fn open_database(sqlite_manager: tauri::State<SqliteManagerLock>) -> Result<String, String> {
    let open_dialog = dialog::blocking::FileDialogBuilder::new().add_filter("Sqlite database", &["db3"]);
    let db_path = open_dialog.pick_file();
    if let Some(path) = db_path {
        let mut db = sqlite_manager.lock().map_err(|err| err.to_string())?;
        db.open(&path).map_err(|err| err.to_string())?;
        return Ok(path.to_string_lossy().into());
    }

    return Err("Canceled opening db".to_string());
}
#[tauri::command]
pub fn close_database(sqlite_manager: tauri::State<SqliteManagerLock>) -> Result<(), String> {
    let mut db = sqlite_manager.lock().map_err(|err| err.to_string())?;
    db.close();
    Ok(())
}

#[tauri::command]
pub fn save_database(sqlite_manager: tauri::State<SqliteManagerLock>) -> Result<String, String> {
    let original_path : Option<PathBuf>;
    {
        let db = sqlite_manager.lock().map_err(|err| err.to_string())?;
        original_path = db.get_path().map(|p| p.to_path_buf());
    }
    let mut open_dialog = dialog::blocking::FileDialogBuilder::new().add_filter("Sqlite database", &["db3"]);
    if let Some(path) = &original_path {
        if let Some(parent) = path.parent(){
            open_dialog = open_dialog.set_directory(parent);
        }
        if let Some(file_name) = path.file_name(){
            open_dialog = open_dialog.set_file_name(&file_name.to_string_lossy().to_string());
        }
    }
    let path = open_dialog.save_file();
    if let Some(path) = path {
        let db = sqlite_manager.lock().map_err(|err| err.to_string())?;
        if let Some(db_conn) = db.get_conn() {
            let mut backup_conn = Connection::open(&path).map_err(|err| err.to_string())?;
            let backup = Backup::new(db_conn, &mut backup_conn).map_err(|err| err.to_string())?;
            backup.run_to_completion(5, std::time::Duration::from_millis(100), Some(|p| {
                let done = p.pagecount - p.remaining;
                let total = p.pagecount;
                println!("Saving Progress: {}%  ({}/{})", done*100/total, done, total);
            })).map_err(|err| err.to_string())?;
            return Ok(path.to_string_lossy().to_string());
        } else {
            return Err("No connection opened".to_string());
        }
    }
    return Err("Canceled saving db".to_string());
}

#[tauri::command]
pub fn perform_query(query: String, sqlite_manager: tauri::State<SqliteManagerLock>) -> Result<ExtractedRows, String> {
    let db = sqlite_manager.lock().map_err(|err| err.to_string())?;
    db.query(&query).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn perform_execute(query: String, sqlite_manager: tauri::State<SqliteManagerLock>) -> Result<usize, String> {
    let db = sqlite_manager.lock().map_err(|err| err.to_string())?;
    db.execute(&query).map_err(|err| err.to_string())
}