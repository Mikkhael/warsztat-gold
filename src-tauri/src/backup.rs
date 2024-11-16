
use std::fs;
use std::io;
use std::path::Path;
use std::path::PathBuf;
use regex::Regex;




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


pub fn get_backup_variant_entries(variant_dirpath: &Path, prefix: &str, ext: &str) -> io::Result<Vec<BackupsListEntry>> {
    let prefix_escaped = regex::escape(prefix);
    let ext_escaped    = regex::escape(ext);
    let backup_regex_re = format!(r"^{}_(\d\d\d\d\.\d\d\.\d\d_\d\d\.\d\d\.\d\d){}$", &prefix_escaped, &ext_escaped);
    let backup_regex = Regex::new(&backup_regex_re).unwrap();

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



#[tauri::command]
pub fn perform_backup_lists(dirpath: String, prefix: String, ext: String, variant_names: Vec<String>) -> Result<BackupLists, String> {
    println!("[INVOKE] perform_backup_lists: {}, {}, {}", dirpath, prefix, ext);
    let dirpath = Path::new(&dirpath);
    let lists = get_backup_lists(dirpath, &prefix, &ext, &variant_names).map_err(|err| err.to_string())?;
    println!("RESULT: {:?}", lists);
    Ok(lists)
}