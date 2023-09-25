use std::path::{Path, PathBuf};

pub fn path_append_to_file_stem(path: &Path, to_append: &str) -> PathBuf{
    let mut file_name = path.file_stem().unwrap_or(Default::default()).to_owned();
    let     file_ext  = path.extension();
    file_name.push(to_append);
    if let Some(ext) = file_ext {
        file_name.push(".");
        file_name.push(ext);
    }
    path.with_file_name(file_name)
}