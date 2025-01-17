
use std::ffi::OsStr;
use std::ffi::OsString;
use std::fs;
use std::io;
use std::path::Path;
use std::path::PathBuf;
use regex::Regex;

use crate::sqlite_manager;




#[derive(Debug, serde::Serialize)]
pub struct BackupsListEntry {
    path: PathBuf,
    date: String
}
#[derive(Debug, serde::Serialize)]
pub struct BackupList {
    name: String,
    entries: Vec<BackupsListEntry>
}
pub type BackupLists = Vec<BackupList>;

fn get_regex(prefix: &str, ext: &str) -> Regex {
    let prefix_escaped = regex::escape(prefix);
    let ext_escaped    = regex::escape(ext);
    let backup_regex_re = format!(r"^{}_(\d\d\d\d\.\d\d\.\d\d_\d\d\.\d\d\.\d\d){}$", &prefix_escaped, &ext_escaped);
    let backup_regex = Regex::new(&backup_regex_re).unwrap();
    return backup_regex;
}

fn has_valid_backup_filename(prefix: &str, ext: &str, filepath: &Path) -> bool {
    let backup_regex = get_regex(prefix, ext);
    if let Some(filename) = filepath.file_name() {
        let filename_str = filename.to_string_lossy();
        return backup_regex.is_match(&filename_str);
    }
    return false;
}

pub fn get_backup_variant_entries(variant_dirpath: &Path, prefix: &str, ext: &str) -> io::Result<Vec<BackupsListEntry>> {
    let backup_regex = get_regex(prefix, ext);

    let mut res = Vec::<BackupsListEntry>::new();
    let entries = fs::read_dir(variant_dirpath)?;
    for entry in entries {
        let entry = entry?;
        let filename_os = entry.file_name();
        let Some(filename) = filename_os.to_str() else { continue; };
        let match_res = backup_regex.captures(filename);
        let Some(match_res) = match_res else { continue; };
        let Some(date) = match_res.get(1) else { continue; };
        let path = entry.path();
        if !path.is_file() { continue; };
        let date = date.as_str();

        res.push(BackupsListEntry{path: path, date: date.to_owned()});
    }

    Ok(res)
}

pub fn get_backup_lists<T: AsRef<str>>(dirpath: &Path, prefix: &str, ext: &str, variant_names: &[T]) -> io::Result<BackupLists>{

    let mut res = BackupLists::new();

    for variant_name in variant_names {
        let variant_name = variant_name.as_ref();
        let variant_dirpath = dirpath.join(variant_name);
        let entries = 
            if !variant_dirpath.is_dir() { Vec::new() }
            else { get_backup_variant_entries(&variant_dirpath, prefix, ext)? };
        res.push(BackupList{name: variant_name.to_string(), entries: entries});
    }

    Ok(res)
}

pub fn check_if_path_is_in_backup_dir (current_path: &Path, backup_dir: &Path) -> Result<(), String> {
    println!("CHECKING {} | backup: {}", current_path.display(), backup_dir.display());
    if !backup_dir.exists() { return Ok(()); };
    let canon_current = current_path.canonicalize().map_err(|err| "\"Niepoprawna ścierzka\": ".to_owned() + (&err.to_string()) )?;
    let canon_backup  = backup_dir  .canonicalize().map_err(|err| "\"Niepoprawna ścierzka\": ".to_owned() + (&err.to_string()) )?;
    println!("CANON    {} | backup: {}", canon_current.display(), canon_backup.display());
    let is_in_backup_dir = canon_current.starts_with(canon_backup);
    if !is_in_backup_dir { return Ok(()); };
    return Err("Nie można wykonać kopi zapasowej. Aktualnie otwarta jest kopia zapasowa.".into());
}



#[tauri::command]
pub fn perform_backup_lists(dirpath: String, prefix: String, ext: String, variant_names: Vec<String>, sqlite_manager: tauri::State<sqlite_manager::SqliteManagerLock>) -> Result<BackupLists, String> {
    println!("[INVOKE] perform_backup_lists: {}, {}, {}", dirpath, prefix, ext);

    // Ensuring, backup isn't performed, if currently opened database is in the backup folder
    let sqlite_manager_quard = sqlite_manager.lock().map_err(|err| err.to_string())?;
    if let Some(current_path) = sqlite_manager_quard.get_path() {
        let backup_dir : PathBuf = AsRef::<OsStr>::as_ref(&dirpath).into();
        check_if_path_is_in_backup_dir(current_path, &backup_dir)?;
    }
    drop(sqlite_manager_quard);
    

    let dirpath = Path::new(&dirpath);
    let lists = get_backup_lists(dirpath, &prefix, &ext, &variant_names).map_err(|err| err.to_string())?;
    println!("RESULT: {:?}", lists);
    Ok(lists)
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct BackupNewFormat {
    path: String,
    variant: String,
    date: String
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct BackupResult {
    good: Vec<BackupNewFormat>,
    bad:  Vec<(BackupNewFormat, String)>,
}

fn get_backup_dir_from_backup_path(backup_path: &Path) -> &Path{
    let variant_dir = backup_path.parent().unwrap_or(backup_path);
    let backup_dir  = variant_dir.parent().unwrap_or(variant_dir);
    return backup_dir;
}


#[tauri::command]
pub fn perform_backup(prefix: &str, ext: &str, filepaths_to_delete: Vec<PathBuf>, copies_to_create: Vec<BackupNewFormat>, nodelete: bool, sqlite_manager: tauri::State<sqlite_manager::SqliteManagerLock>) -> Result<BackupResult, String> {
    println!("[INVOKE] perform_backup: {:?}, {:?}", filepaths_to_delete, copies_to_create);
    let mut good_paths : Vec<BackupNewFormat>           = Default::default();
    let mut bad_paths  : Vec<(BackupNewFormat, String)> = Default::default();
    
    // Ensuring, backup isn't performed, if currently opened database is in the backup folder
    let sqlite_manager_quard = sqlite_manager.lock().map_err(|err| err.to_string())?;
    if let Some(current_path) = sqlite_manager_quard.get_path() {
        for filepath_to_delete in &filepaths_to_delete {
            let backup_dir = get_backup_dir_from_backup_path(&filepath_to_delete);
            check_if_path_is_in_backup_dir(current_path, backup_dir)?;
        }
        for copy_to_create in &copies_to_create {
            let backup_dir : PathBuf = AsRef::<OsStr>::as_ref(&copy_to_create.path).into();
            check_if_path_is_in_backup_dir(current_path, &backup_dir)?;
        }
    }
    drop(sqlite_manager_quard);

    if let Some(first_copy_format) = copies_to_create.first() {
        // TEMP file
        let mut temp_filename = OsString::new();
        temp_filename.push("warsztat_backup_temp_");
        temp_filename.push(&first_copy_format.date);
        temp_filename.push(".temp");
        let mut temp_filepath = std::env::temp_dir();
        temp_filepath.push(temp_filename);
        println!("Starting temp backup {:?}", temp_filepath);
        sqlite_manager::save_database_impl(&temp_filepath, &sqlite_manager, 100, std::time::Duration::from_millis(1))?;

        // Creating folder tree structure
        for copy_format in copies_to_create {
            let filepath = PathBuf::from(&copy_format.path);
            // filepath.push(&copy_format.variant);
            println!("Creating folder tree {:?}", filepath);
            if !filepath.exists() {
                let result = fs::create_dir_all(&filepath);
                if let Err(err) = result {
                    bad_paths.push((copy_format, err.to_string()));
                    continue;
                }
            }
            if !filepath.is_dir() {
                bad_paths.push((copy_format, "Ścierzka nie jest folderem".into()));
                continue;
            }
            good_paths.push(copy_format);
        }

        // Creating copies
        for copy_format in &good_paths {
            let mut filename = OsString::new();
            filename.push(prefix);
            filename.push("_");
            filename.push(&copy_format.date);
            filename.push(ext);
            let mut filepath = PathBuf::from(&copy_format.path);
            filepath.push(&copy_format.variant);
            fs::create_dir_all(&filepath).map_err(|err| err.to_string())?;
            filepath.push(filename);
            println!("Creating dest backup {:?}", filepath);
            fs::copy(&temp_filepath, &filepath).map_err(|err| err.to_string())?;
        }

        // Removing TEMP
        println!("Removing temp backup {:?}", temp_filepath);
        fs::remove_file(temp_filepath).map_err(|err| err.to_string())?;
    }
    for filepath in filepaths_to_delete {
        println!("Removing old backup {:?}", filepath);
        if !filepath.is_file() || !has_valid_backup_filename(prefix, ext, &filepath) {
            println!("Invalid filename {}_.{} or not a file", prefix, ext);
            continue;
        }
        if !nodelete {
            fs::remove_file(filepath).map_err(|err| err.to_string())?;
        }
    }

    let result = BackupResult {
        good: good_paths,
        bad:  bad_paths
    };
    Ok(result)
}