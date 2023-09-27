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


use std::borrow::Cow;
use std::ffi::{OsString, OsStr};

#[cfg(not(windows))]
pub fn get_correct_fopen_path(path: &Path) -> Option<Cow<'_, OsStr>> { Some(path.as_os_str()) }

#[cfg(windows)]
pub fn get_correct_fopen_path(path: &Path) -> Option<Cow<'_, OsStr>> {
    use windows::{Win32::Storage::FileSystem::GetShortPathNameW, core::PCWSTR};
    use std::os::windows::ffi::{OsStrExt, OsStringExt};

    let mut wstr = path.as_os_str().encode_wide().collect::<Vec<u16>>();
    if wstr.iter().find(|&&x| x > 127) == None {
        return Some(path.as_os_str().into());
    }
    wstr.push(0u16);
    let pcwstr = PCWSTR::from_raw(wstr.as_ptr());

    let len = unsafe { GetShortPathNameW(pcwstr, None) };
    if len <= 0 { return None }
    let mut short_buf = vec![0u16; len as usize];
    let len = unsafe { GetShortPathNameW(pcwstr, Some(&mut short_buf)) };
    if len <= 0 { return None }

    if let Some(0u16) = short_buf.last() {
        short_buf.pop();
    } else {
        println!("LAST CHAR: [{:?}] {}", short_buf.last(), OsString::from_wide(&short_buf).to_string_lossy());
    }
    Some(OsString::from_wide(&short_buf).into())
}