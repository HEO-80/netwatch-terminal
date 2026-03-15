// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_system_info,
            commands::get_docker_status,
            commands::run_powershell,
            commands::open_url,
            commands::open_vscode,
            commands::ssh_beelink,
            commands::minimize_window,
            commands::maximize_window,
            commands::close_window,
            commands::toggle_fullscreen,
        ])
        .run(tauri::generate_context!())
        .expect("error while running NETWATCH Terminal");
}
