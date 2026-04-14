mod commands;
mod ssh;
mod telnet;

use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;

pub use commands::AppState;
pub type SharedState = Arc<Mutex<AppState>>;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let state: SharedState = Arc::new(Mutex::new(AppState::default()));
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::connect,
            commands::disconnect,
            commands::send_input,
            commands::resize_terminal,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
