use rusqlite::Rows;
use rusqlite::{Connection, Result, Error, backup::Backup};
use tauri::App;
use tauri::Manager;
use std::error;
use std::fs;
use std::io::{BufWriter, Write};
use std::path::{Path, PathBuf};
use rusqlite::types::ValueRef;
use std::sync::Mutex;


use tauri::api::dialog;

#[derive(Default)]
pub struct SqliteManager{
    decimal_extension_path: PathBuf,
    main_tables_path: PathBuf,

    sqlite_conn: Option<SqliteConn>
}

pub struct SqliteConn {
    conn: Connection,
    path: PathBuf
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

type DynResult<T> = std::result::Result<T, Box<dyn error::Error>>;

impl SqliteManager{
    pub fn is_open(&self)  -> bool { self.sqlite_conn.is_some() }
    
    pub fn init(app: &mut App) {
        let resolver = app.path_resolver();
        let state_lock = app.state::<SqliteManagerLock>();
        let mut state = state_lock.lock().expect("Unable to lock sqlite manager");

        state.decimal_extension_path = resolver.resolve_resource("resources/sqlite/decimal").expect("Cannot resolve decimal path");
        state.main_tables_path       = resolver.resolve_resource("resources/sqlite/main_tables.txt").expect("Cannot resolve main tables path");


        println!("decimal:     {}", state.decimal_extension_path.display());
        println!("main tables: {}", state.main_tables_path.display());
    }

    pub fn open(&mut self, path: &Path) -> Result<(), Error>{ 
        let res = Connection::open(path); 
        if let Ok(conn) = res {

            unsafe {
                let _guard = rusqlite::LoadExtensionGuard::new(&conn)?;
                conn.load_extension(&self.decimal_extension_path, None)?;
            }
            self.sqlite_conn = Some(SqliteConn { 
                conn: conn, 
                path: path.to_path_buf() 
            });
            return Ok(());
        } else {
            self.sqlite_conn = None;
            return Err(res.err().unwrap());
        }
    }
    pub fn close(&mut self){ 
        self.sqlite_conn = None;
    }
    
    pub fn get_main_tables(&self) -> std::io::Result<Vec<String>> {
        let file = fs::read_to_string(&self.main_tables_path)?;
        Ok(file.lines().map(String::from).collect())
    }
}

fn write_value_for_csv<W : Write>(w: &mut W, value: ValueRef) -> std::io::Result<()> {
    use ValueRef::*;
    match value {
        Integer(v) => write!(w, "{}", v),
        Text(v)    => write_string_for_csv(w, &String::from_utf8_lossy(v)),
        Real(v)    => {
            let mut bytes = v.to_string().into_bytes();
            for ch in bytes.iter_mut() {
                if *ch == b'.' {
                    *ch = b',';
                    break;
                }
            }
            w.write(&bytes).and(Ok(()))
        }
        _          => Ok(()) // TODO blob
    }
}
fn write_string_for_csv<W : Write>(w: &mut W, v: &str) -> std::io::Result<()> {
    if v.contains('"') { write!(w, "\"{}\"", v) }
    else               { write!(w, "\"{}\"", v.replace('"', "\"\"")) }
}

impl SqliteConn{
    pub fn execute<P : rusqlite::Params>(&self, query: &str, params: P) -> Result<usize> {
        self.conn.execute(&query, params)
    }
    pub fn query<P : rusqlite::Params>(&self, query: &str, params: P) -> Result<ExtractedRows> {
        let mut stmt = self.conn.prepare(&query)?;
        let cols = stmt.column_count();
        let mut rows = stmt.query(params)?;
        extract_all_rows(&mut rows, cols)
    }

    pub fn export_table_to_csv(&self, table_name: &str, file_name: &Path) -> DynResult<()> {
        let file = fs::OpenOptions::new().write(true).truncate(true).open(file_name)?;
        let mut file = BufWriter::new(file);

        let select_sql = format!("SELECT * FROM `{}`", table_name);
        let mut stmt = self.conn.prepare(&select_sql)?;
        let col_count = stmt.column_count();
        if col_count == 0 {
            return Err(rusqlite::Error::QueryReturnedNoRows.into());
        }
        let mut col_names = stmt.column_names().into_iter();

        if let Some(val) = col_names.next() {
            write_string_for_csv(&mut file, val)?; }
        for val in col_names {
            write!(file, ";")?;
            write_string_for_csv(&mut file, val)?;
        }

        let mut rows = stmt.query(())?;
        
        while let Some(row) = rows.next()? {
            write_value_for_csv(&mut file, row.get_ref(0)?)?;
            for i in 1..col_count {
                write!(file, ";")?;
                write_value_for_csv(&mut file, row.get_ref(i)?)?;
            }
        }
        
        Ok(())
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
    if let Some(sqlite_conn) = &db.sqlite_conn {
        Ok(CurrentDbState {
            is_open: true,
            path: sqlite_conn.path.clone()
        })
    }else{
        Ok(CurrentDbState {is_open: false, path: "".into()})
    }
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
        original_path = db.sqlite_conn.as_ref().map(|c| c.path.to_path_buf());
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
        if let Some(sqlite_conn) = &db.sqlite_conn {
            let db_conn = &sqlite_conn.conn;
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

// #[tauri::command]
pub fn export_csv(export_path: PathBuf, sqlite_manager: tauri::State<SqliteManagerLock>) -> Result<(), String> {
    let db = sqlite_manager.lock().map_err(|err| err.to_string())?;
    if let Some(ref sqlite_conn) = db.sqlite_conn {
        let table_names = db.get_main_tables().map_err(|err| err.to_string())?;
        for table_name in table_names {
            let file_name = &export_path.join( format!("{}.csv", table_name));
            sqlite_conn.export_table_to_csv(&table_name, file_name).map_err(|err| err.to_string());
        }
        Ok(())
    } else {
        return Err("Database not opened".to_string());
    }
}

#[tauri::command]
pub fn perform_query(query: String, sqlite_manager: tauri::State<SqliteManagerLock>) -> Result<ExtractedRows, String> {
    let db = sqlite_manager.lock().map_err(|err| err.to_string())?;
    if let Some(sqlite_conn) = &db.sqlite_conn {
        sqlite_conn.query(&query, ()).map_err(|err| err.to_string())
    }else{
        Err("No database opened".into())
    }
}

#[tauri::command]
pub fn perform_execute(query: String, sqlite_manager: tauri::State<SqliteManagerLock>) -> Result<usize, String> {
    let db = sqlite_manager.lock().map_err(|err| err.to_string())?;
    if let Some(sqlite_conn) = &db.sqlite_conn {
        sqlite_conn.execute(&query, ()).map_err(|err| err.to_string())
    }else{
        Err("No database opened".into())
    }
}