use std::{sync::{OnceLock, atomic::{AtomicUsize, Ordering}, Mutex}, path::PathBuf, fs::File, io::Read};
use tauri::Manager;

#[derive(Debug, Default)]
struct TestGreetStateInner {
    test_file_path: PathBuf,
    counter: AtomicUsize,
    last_name: Mutex<String>
}

impl TestGreetState {
    pub fn init(app: &mut tauri::App) {
        let resolver = app.path_resolver();
        let test_txt_path = resolver.resolve_resource("resources/test.txt").expect("Unable to resolve test resource path");
        app.state::<TestGreetState>().0.set(TestGreetStateInner {
             test_file_path: test_txt_path,
             counter: 0.into(),
             ..Default::default() 
        }).expect("Unable to inicialize state");
    }
}


#[derive(Debug, Default)]
pub struct TestGreetState(OnceLock<TestGreetStateInner>);


#[tauri::command]
pub fn greet(name: &str, state: tauri::State<TestGreetState>) -> String {
    let state = state.0.get().unwrap();
    let cnt = state.counter.fetch_add(1, Ordering::Relaxed);

    let mut last_name_guard = state.last_name.lock().unwrap();
    let last_name = last_name_guard.clone();
    *last_name_guard = name.to_string();
    drop(last_name_guard);

    let mut test_file_content = "Cannot read file".to_string();
    let test_file = File::open(&state.test_file_path);
    if let Ok(mut file) = test_file {
        test_file_content.clear();
        file.read_to_string(&mut test_file_content).expect("Error reading the test file");
    }


    format!("Hello, {}! You've been greeted from Rust! The path is: '{}'. Counter is {}.\n Last    name was '{}'. \n File contents: [{}]", 
                name, 
                state.test_file_path.to_string_lossy(), 
                cnt,
                last_name,
                test_file_content
    )
}
