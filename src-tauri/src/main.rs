// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use tauri::Manager;
use std::process::{Command, Child};
use std::sync::Mutex;

// Estado global para manejar el proceso sidecar
struct PtyServer(Mutex<Option<Child>>);

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(PtyServer(Mutex::new(None)))
        .setup(|app| {
            // Lanzar el servidor PTY como proceso hijo
            let app_dir = app.path().app_data_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("."));

            // En dev: buscar en sidecar/
            // En producción: el .exe estará junto al binario
            let pty_server_path = if cfg!(debug_assertions) {
                // Development: usa node directamente
                let sidecar_dir = std::env::current_dir()
                    .unwrap_or_default()
                    .join("sidecar");
                
                let child = Command::new("node")
                    .arg(sidecar_dir.join("pty-server.js"))
                    .spawn();

                match child {
                    Ok(child) => {
                        println!("[NETWATCH] PTY server arrancado (dev mode)");
                        *app.state::<PtyServer>().0.lock().unwrap() = Some(child);
                    }
                    Err(e) => {
                        eprintln!("[NETWATCH] Error arrancando PTY server: {}", e);
                        // No es fatal — el frontend mostrará error de conexión
                    }
                }
            } else {
                // Production: ejecutable compilado con pkg
                let exe_path = std::env::current_exe()
                    .unwrap_or_default()
                    .parent()
                    .unwrap_or(&std::path::Path::new("."))
                    .join("netwatch-pty-server.exe");

                let child = Command::new(&exe_path).spawn();

                match child {
                    Ok(child) => {
                        println!("[NETWATCH] PTY server arrancado (prod mode)");
                        *app.state::<PtyServer>().0.lock().unwrap() = Some(child);
                    }
                    Err(e) => {
                        eprintln!("[NETWATCH] Error arrancando PTY server: {}", e);
                    }
                }
            };

            Ok(())
        })
        .on_window_event(|window, event| {
            // Matar el PTY server al cerrar la ventana
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(mut child) = window.app_handle()
                    .state::<PtyServer>()
                    .0
                    .lock()
                    .unwrap()
                    .take()
                {
                    let _ = child.kill();
                    println!("[NETWATCH] PTY server detenido");
                }
            }
        })
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
