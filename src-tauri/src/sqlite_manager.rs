use rusqlite::Rows;
use rusqlite::{Connection, Result, Error, backup::Backup};
use tauri::App;
use tauri::Manager;
use std::error;
use std::fs::{self, OpenOptions};
use std::io::{BufWriter, Read, Write};
use std::path::{Path, PathBuf};
use rusqlite::types::ValueRef;
use std::sync::Mutex;

use crate::encoding;
use crate::utils;

#[derive(Default)]
pub struct SqliteManager{
    decimal_extension_path: PathBuf,
    vsv_extension_path:     PathBuf,
    main_tables_path:       PathBuf,
    structure_sql_path:     PathBuf,

    argv: Vec<String>,

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
pub fn extract_all_rows<'a>(rows: &'a mut Rows, cols: usize, max_rows: Option<usize>) -> Result<ExtractedRows> {
    let mut res : ExtractedRows = Vec::new();
    while let Some(row) = rows.next()? {
        let mut row_strings = Vec::with_capacity(cols);
        for i in 0..cols {
            row_strings.push( valueref_to_json(row.get_ref(i)?) );
        }
        res.push(row_strings);
        if let Some(max_rows) = max_rows {
            if res.len() >= max_rows {
                break;
            }
        }
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
    // pub fn is_open(&self)  -> bool { self.sqlite_conn.is_some() }
    
    pub fn init(app: &mut App) {
        let resolver = app.path_resolver();
        let state_lock = app.state::<SqliteManagerLock>();
        let mut state = state_lock.lock().expect("Unable to lock sqlite manager");

        state.argv = std::env::args().collect();

        state.decimal_extension_path = resolver.resolve_resource("resources/sqlite/decimal").expect("Cannot resolve decimal path");
        state.vsv_extension_path     = resolver.resolve_resource("resources/sqlite/vsv").expect("Cannot resolve vsv path");
        state.main_tables_path       = resolver.resolve_resource("resources/sqlite/main_tables.txt").expect("Cannot resolve main tables path");
        state.structure_sql_path     = resolver.resolve_resource("resources/sqlite/database_structure.sql").expect("Cannot resolve structure sql path");


        println!("decimal:       {}", state.decimal_extension_path.display());
        println!("vsv:           {}", state.vsv_extension_path.display());
        println!("main tables:   {}", state.main_tables_path.display());
        println!("structure sql: {}", state.structure_sql_path.display());
    }

    pub fn open(&mut self, path: &Path) -> Result<(), Error>{ 
        let res = Connection::open(path); 
        if let Ok(conn) = res {
            println!("Opened database");
            unsafe {
                let _guard = rusqlite::LoadExtensionGuard::new(&conn)?;
                conn.load_extension(&self.decimal_extension_path, None)?;
                conn.load_extension(&self.vsv_extension_path, None)?;
            }
            println!("Loaded extensions");
            // rusqlite::vtab::csvtab::load_module(&conn)?;
            self.sqlite_conn = Some(SqliteConn { 
                conn: conn, 
                path: path.to_path_buf() 
            });
            return Ok(());
        } else {
            println!("Failed opening database");
            self.sqlite_conn = None;
            return Err(res.err().unwrap());
        }
    }
    pub fn rebuild(&self, with_vacuum: bool) -> Result<bool, SqliteOrIOError>{
        if let Some(ref conn) = self.sqlite_conn {
            let trans = conn.conn.unchecked_transaction()?;
            conn.execute_file(&self.structure_sql_path)?;
            trans.commit()?;
            if with_vacuum {
                conn.execute("VACUUM", ())?;
            }
            return Ok(true);
        } else {
            return Ok(false);
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
        Real(v)    => write!(w, "{}", v),
            //  {
            // let mut bytes = v.to_string().into_bytes();
            // for ch in bytes.iter_mut() {
            //     if *ch == b'.' {
            //         *ch = b',';
            //         break;
            //     }
            // }
            // w.write(&bytes).and(Ok(()))
        // }
        _          => Ok(()) // TODO blob
    }
}
fn write_string_for_csv<W : Write>(w: &mut W, v: &str) -> std::io::Result<()> {
    if v.contains("\"") { write!(w, "\"{}\"", v.replace('"', "\"\"")) }
    else                { write!(w, "\"{}\"", v) }
}

pub enum SqliteOrIOError {
    Sqlite(Error),
    IO(std::io::Error)
}
impl From<Error> for SqliteOrIOError {
    fn from(value: Error) -> Self { SqliteOrIOError::Sqlite(value) }
}
impl From<std::io::Error> for SqliteOrIOError {
    fn from(value: std::io::Error) -> Self { SqliteOrIOError::IO(value) }
}
impl SqliteConn{
    pub fn execute<P : rusqlite::Params>(&self, query: &str, params: P) -> Result<usize> {
        self.conn.execute(&query, params)
    }
    pub fn execute_batch(&self, query: &str) -> Result<()> {
        self.conn.execute_batch(&query)
    }
    pub fn execute_batch_get_rowid(&self, query: &str) -> Result<i64> {
        self.conn.execute_batch(&query)?;
        Ok(self.conn.last_insert_rowid())
    }
    pub fn execute_file(&self, path: &Path) -> Result<(), SqliteOrIOError> {
        let mut file = std::fs::File::open(path)?;
        let mut buf  = String::default();
        file.read_to_string(&mut buf)?;
        return Ok(self.execute_batch(&buf)?);
    }
    pub fn query<P : rusqlite::Params>(&self, query: &str, params: P, max_rows: Option<usize>) -> Result<(ExtractedRows, rusqlite::Statement)> {
        let mut stmt = self.conn.prepare(&query)?;
        let cols = stmt.column_count();
        let mut rows = stmt.query(params)?;
        let extracted_rows = extract_all_rows(&mut rows, cols, max_rows)?;
        drop(rows);
        Ok((extracted_rows, stmt))
    }

    pub fn export_table_to_csv(&self, table_name: &str, file_path: &Path, use_encoding: bool) -> DynResult<()> {
        print!("Exporting CSV [{}]... ", table_name);
        std::io::stdout().flush()?;
        let file = fs::OpenOptions::new().write(true).truncate(true).create(true).open(file_path)?;
        let mut file = BufWriter::new(file);
        let mut temp_line = Vec::<u8>::new();

        let select_sql = format!("SELECT * FROM `{}`", table_name);
        let mut stmt = self.conn.prepare(&select_sql)?;
        let col_count = stmt.column_count();
        if col_count == 0 {
            return Err(rusqlite::Error::QueryReturnedNoRows.into());
        }
        let mut col_names = stmt.column_names().into_iter();

        if let Some(val) = col_names.next() {
            write_string_for_csv(&mut temp_line, val)?; }
        for val in col_names {
            write!(temp_line, ";")?;
            write_string_for_csv(&mut temp_line, val)?;
        }
        write!(temp_line, "\r\n")?;
        if use_encoding { temp_line = encoding::encode_buf(&temp_line)? }
        file.write(&temp_line)?;
        temp_line.clear();

        let mut rows = stmt.query(())?;
        let mut done_rows = 0usize;
        
        while let Some(row) = rows.next()? {
            write_value_for_csv(&mut temp_line, row.get_ref(0)?)?;
            for i in 1..col_count {
                write!(temp_line, ";")?;
                write_value_for_csv(&mut temp_line, row.get_ref(i)?)?;
            }
            write!(temp_line, "\r\n")?;
            if use_encoding { temp_line = encoding::encode_buf(&temp_line)? }
            file.write(&temp_line)?;
            temp_line.clear();
            done_rows += 1;
        }
        
        println!("{} rows", done_rows);

        file.flush()?;
        Ok(())
    }

    pub fn import_table_from_csv(&self, table_name: &str, file_path: &Path, use_encoding: bool) -> DynResult<()> {
        print!("Importing CSV [{}]... ", table_name);
        std::io::stdout().flush()?;

        let temp_table_name = format!("csv_{}", table_name);
        let decoded_file_path: PathBuf;
        let mut accual_file_path = file_path;
        if use_encoding {
            decoded_file_path = utils::path_append_to_file_stem(file_path, "_utf8");
            encoding::decode_file(file_path, &decoded_file_path)?;
            print!("decoded... ");
            std::io::stdout().flush()?;
            accual_file_path = &decoded_file_path;
        }

        let file_path_str_winsafe = utils::get_correct_fopen_path(accual_file_path).unwrap_or(accual_file_path.as_os_str().into());
        let file_path_str = file_path_str_winsafe.to_string_lossy();
        let opened_file = OpenOptions::new().read(true).open(accual_file_path);
        drop(opened_file);

        let vtab_sql   = format!("CREATE VIRTUAL TABLE temp.`{}` USING vsv(filename=\"{}\", header=yes, fsep=';', nulls=yes)", temp_table_name, file_path_str);
        self.conn.execute(&vtab_sql, ())?;

        let delete_sql = format!("DELETE FROM `{}`", table_name);
        let deleted_rows = self.conn.execute(&delete_sql, ())?;

        let insert_sql = format!("INSERT INTO `{}` SELECT * FROM temp.`{}`", table_name, temp_table_name);
        let inserted_rows = self.conn.execute(&insert_sql, ())?;

        println!(" DELETED {}, INSERTED {}", deleted_rows, inserted_rows);

        let drop_sql = format!("DROP TABLE temp.`{}`", temp_table_name);
        self.conn.execute(&drop_sql, ())?;

        Ok(())
    }


}

#[derive(serde::Serialize)]
pub struct CurrentDbState {
    is_open: bool,
    path: PathBuf,
    argv: Vec<String>,
}
#[tauri::command]
pub fn get_current_db_state(sqlite_manager: tauri::State<SqliteManagerLock>) -> Result<CurrentDbState, String>{
    let db = sqlite_manager.lock().map_err(|err| err.to_string())?;
    if let Some(sqlite_conn) = &db.sqlite_conn {
        Ok(CurrentDbState {
            is_open: true,
            path: sqlite_conn.path.clone(),
            argv: db.argv.clone()
        })
    }else{
        Ok(CurrentDbState {
            is_open: false,
            path: "".into(),
            argv: db.argv.clone()
        })
    }
}


#[tauri::command]
pub fn open_database(path: PathBuf, sqlite_manager: tauri::State<SqliteManagerLock>) -> Result<(), String> {
    println!("[INVOKE] open_database");
    let mut db = sqlite_manager.lock().map_err(|err| err.to_string())?;
    println!("got mutex");
    db.open(&path).map_err(|err| err.to_string())?;
    Ok(())
}
#[tauri::command]
pub fn rebuild_database(with_vacuum: bool, sqlite_manager: tauri::State<SqliteManagerLock>) -> Result<(), String> {
    println!("[INVOKE] rebuild_database");
    let db = sqlite_manager.lock().map_err(|err| err.to_string())?;
    let is_opened = db.rebuild(with_vacuum).map_err(|err| match err {
        SqliteOrIOError::IO(val)     => val.to_string(),
        SqliteOrIOError::Sqlite(val) => val.to_string()
    })?;
    if is_opened {Ok(())} else {Err("Nie otworzono bazy danych".to_string())}
}
#[tauri::command]
pub fn close_database(sqlite_manager: tauri::State<SqliteManagerLock>) -> Result<(), String> {
    println!("[INVOKE] close_database");
    let mut db = sqlite_manager.lock().map_err(|err| err.to_string())?;
    db.close();
    Ok(())
}

pub fn save_database_impl(path: &Path, sqlite_manager: &SqliteManagerLock, pages: i32, pause: std::time::Duration) -> Result<(), String> {
    let db = sqlite_manager.lock().map_err(|err| err.to_string())?;
    if let Some(sqlite_conn) = &db.sqlite_conn {
        let db_conn = &sqlite_conn.conn;
        let mut backup_conn = Connection::open(path).map_err(|err| err.to_string())?;
        if db_conn.path() == backup_conn.path() {
            return Err("Connection to self".to_string());
        }
        let backup = Backup::new(db_conn, &mut backup_conn).map_err(|err| err.to_string())?;
        backup.run_to_completion(pages, pause, Some(|p| {
            let done = p.pagecount - p.remaining;
            let total = p.pagecount;
            println!("Saving Progress: {}%  ({}/{})", done*100/total, done, total);
        })).map_err(|err| err.to_string())?;
        Ok(())
    } else {
       Err("Nie otworzono bazy danych".to_string())
    }
}

#[tauri::command]
pub fn save_database(path: PathBuf, sqlite_manager: tauri::State<SqliteManagerLock>) -> Result<(), String> {
    println!("[INVOKE] save_database");
    return save_database_impl(&path, &sqlite_manager, 100, std::time::Duration::from_millis(0));
}

#[tauri::command]
pub fn export_csv(export_path: PathBuf, sqlite_manager: tauri::State<SqliteManagerLock>) -> Result<(), String> {
    println!("[INVOKE] export_csv");
    let db = sqlite_manager.lock().map_err(|err| err.to_string())?;
    if let Some(ref sqlite_conn) = db.sqlite_conn {
        dbg!(&export_path);
        fs::create_dir_all(&export_path).map_err(|err| err.to_string())?;
        let table_names = db.get_main_tables().map_err(|err| err.to_string())?;
        for mut table_name in table_names {
            let file_name = export_path.join( format!("{}.txt", table_name));
            table_name.push_str("_csv_view");
            sqlite_conn.export_table_to_csv(&table_name, &file_name, true).map_err(|err| err.to_string())?;
        }
        Ok(())
    } else {
        return Err("Nie otworzono bazy danych".to_string());
    }
}
#[tauri::command]
pub fn import_csv(import_path: PathBuf, sqlite_manager: tauri::State<SqliteManagerLock>) -> Result<(), String> {
    println!("[INVOKE] import_csv");
    let db = sqlite_manager.lock().map_err(|err| err.to_string())?;
    if let Some(ref sqlite_conn) = db.sqlite_conn {
        // dbg!(&import_path);
        let table_names = db.get_main_tables().map_err(|err| err.to_string())?;
        for table_name in table_names {
            let file_path = import_path.join( format!("{}.txt", table_name));
            if !file_path.is_file() {
                println!("Specified import csv path {} is not a file", file_path.display());
                continue;
            }
            sqlite_conn.import_table_from_csv(&table_name, &file_path, true).map_err(|err| err.to_string())?;
        }
        Ok(())
    } else {
        return Err("Nie otworzono bazy danych".to_string());
    }
}

#[tauri::command]
pub fn perform_query(query: String, sqlite_manager: tauri::State<SqliteManagerLock>) -> Result<(ExtractedRows, Vec<String>), String> {
    println!("[INVOKE] perform_query:   {}", query);
    let db = sqlite_manager.lock().map_err(|err| err.to_string())?;
    if let Some(sqlite_conn) = &db.sqlite_conn {
        let (extracted_rows, stmt) = sqlite_conn.query(&query, (), Some(100)).map_err(|err| err.to_string())?;
        let col_names : Vec<String> = stmt.column_names().into_iter().map(|s| s.to_owned()).collect();
        Ok((extracted_rows, col_names))
    }else{
        Err("Nie otworzono bazy danych".into())
    }
}

// #[tauri::command]
// pub fn perform_insert(query: String, sqlite_manager: tauri::State<SqliteManagerLock>) -> Result<i64, String> {
//     println!("[INVOKE] perform_insert: {}", query);
//     let db = sqlite_manager.lock().map_err(|err| err.to_string())?;
//     if let Some(sqlite_conn) = &db.sqlite_conn {
//         sqlite_conn.insert(&query, ()).map_err(|err| err.to_string())
//     }else{
//         Err("Nie otworzono bazy danych".into())
//     }
// }
#[tauri::command]
pub fn perform_execute(query: String, as_batch: bool, get_last_rowid: bool, sqlite_manager: tauri::State<SqliteManagerLock>) -> Result<i64, String> {
    println!("[INVOKE] perform_execute: {}", query);
    let db = sqlite_manager.lock().map_err(|err| err.to_string())?;
    if let Some(sqlite_conn) = &db.sqlite_conn {
        if get_last_rowid {
            let last_rowid = sqlite_conn.execute_batch_get_rowid(&query).map_err(|err| err.to_string())?;
            return Ok(last_rowid);
        } else if as_batch {
            sqlite_conn.execute_batch(&query).map_err(|err| err.to_string())?;
            return Ok(0);
        } else {
            let affected_rows = sqlite_conn.execute(&query, ()).map_err(|err| err.to_string())?;
            return Ok(affected_rows.try_into().unwrap());
        }
    }else{
        Err("Nie otworzono bazy danych".into())
    }
}
// #[tauri::command]
// pub fn perform_execute_batch(query: String, sqlite_manager: tauri::State<SqliteManagerLock>) -> Result<(), String> {
//     println!("[INVOKE] perform_batch:   {}", query);
//     let db = sqlite_manager.lock().map_err(|err| err.to_string())?;
//     if let Some(sqlite_conn) = &db.sqlite_conn {
//         sqlite_conn.execute_batch(&query).map_err(|err| err.to_string())
//     }else{
//         Err("Nie otworzono bazy danych".into())
//     }
// }