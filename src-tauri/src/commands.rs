use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::Window;

// ── System Info ───────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize)]
pub struct SystemInfo {
    pub started: String,
    pub shell: String,
    pub cpu: String,
    pub ram: String,
    pub user: String,
    pub os: String,
}

#[tauri::command]
pub fn get_system_info() -> SystemInfo {
    let user = std::env::var("USERNAME").unwrap_or_else(|_| "Usuario".to_string());
    let os   = get_os_name();
    let ram  = get_ram();
    let cpu  = get_cpu();
    let now  = get_current_time();

    SystemInfo {
        started: now,
        shell: "7.5 Core".to_string(), // PowerShell version
        cpu,
        ram,
        user,
        os,
    }
}

fn get_os_name() -> String {
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", "(Get-CimInstance Win32_OperatingSystem).Caption"])
        .output();
    
    match output {
        Ok(o) => String::from_utf8_lossy(&o.stdout).trim().to_string(),
        Err(_) => "Microsoft Windows 11".to_string(),
    }
}

fn get_ram() -> String {
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", 
            "[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2).ToString() + ' GB'"])
        .output();
    
    match output {
        Ok(o) => String::from_utf8_lossy(&o.stdout).trim().to_string(),
        Err(_) => "N/A".to_string(),
    }
}

fn get_cpu() -> String {
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", "(Get-CimInstance Win32_Processor).Name"])
        .output();
    
    match output {
        Ok(o) => String::from_utf8_lossy(&o.stdout).trim().to_string(),
        Err(_) => "N/A".to_string(),
    }
}

fn get_current_time() -> String {
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", "Get-Date -Format 'yyyy-MM-dd HH:mm'"])
        .output();
    
    match output {
        Ok(o) => String::from_utf8_lossy(&o.stdout).trim().to_string(),
        Err(_) => "N/A".to_string(),
    }
}

// ── Docker ────────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize)]
pub struct DockerStatus {
    pub available: bool,
    pub containers: Vec<DockerContainer>,
}

#[derive(Serialize, Deserialize)]
pub struct DockerContainer {
    pub id: String,
    pub name: String,
    pub status: String,
    pub ports: String,
}

#[tauri::command]
pub fn get_docker_status() -> DockerStatus {
    let output = Command::new("docker")
        .args(["ps", "--format", "{{.ID}}|{{.Names}}|{{.Status}}|{{.Ports}}"])
        .output();
    
    match output {
        Ok(o) if o.status.success() => {
            let stdout = String::from_utf8_lossy(&o.stdout);
            let containers: Vec<DockerContainer> = stdout
                .lines()
                .filter(|l| !l.is_empty())
                .map(|line| {
                    let parts: Vec<&str> = line.splitn(4, '|').collect();
                    DockerContainer {
                        id:     parts.get(0).unwrap_or(&"").to_string(),
                        name:   parts.get(1).unwrap_or(&"").to_string(),
                        status: parts.get(2).unwrap_or(&"").to_string(),
                        ports:  parts.get(3).unwrap_or(&"").to_string(),
                    }
                })
                .collect();
            
            DockerStatus { available: true, containers }
        }
        _ => DockerStatus { available: false, containers: vec![] },
    }
}

// ── PowerShell execution ──────────────────────────────────────────────────────

#[derive(Serialize, Deserialize)]
pub struct PsResult {
    pub stdout: String,
    pub stderr: String,
    pub success: bool,
}

#[tauri::command]
pub fn run_powershell(command: String) -> PsResult {
    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &command])
        .output();
    
    match output {
        Ok(o) => PsResult {
            stdout:  String::from_utf8_lossy(&o.stdout).to_string(),
            stderr:  String::from_utf8_lossy(&o.stderr).to_string(),
            success: o.status.success(),
        },
        Err(e) => PsResult {
            stdout:  String::new(),
            stderr:  e.to_string(),
            success: false,
        },
    }
}

// ── Shortcuts ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn open_url(url: String) -> bool {
    Command::new("powershell")
        .args(["-Command", &format!("Start-Process '{}'", url)])
        .spawn()
        .is_ok()
}

#[tauri::command]
pub fn open_vscode(path: Option<String>) -> bool {
    let target = path.unwrap_or_else(|| ".".to_string());
    Command::new("code")
        .arg(&target)
        .spawn()
        .is_ok()
}

#[tauri::command]
pub fn ssh_beelink(host: String, port: u16) -> bool {
    Command::new("powershell")
        .args(["-Command", &format!("Start-Process wt -ArgumentList 'ssh {} -p {}'", host, port)])
        .spawn()
        .is_ok()
}

// ── Window controls ───────────────────────────────────────────────────────────

#[tauri::command]
pub fn minimize_window(window: Window) {
    window.minimize().ok();
}

#[tauri::command]
pub fn maximize_window(window: Window) {
    window.maximize().ok();
}

#[tauri::command]
pub fn close_window(window: Window) {
    window.close().ok();
}

#[tauri::command]
pub fn toggle_fullscreen(window: Window) {
    let is_fullscreen = window.is_fullscreen().unwrap_or(false);
    window.set_fullscreen(!is_fullscreen).ok();
}
