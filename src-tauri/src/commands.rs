use serde::{Deserialize, Serialize};
use std::process::Command;
use sysinfo::{System, Disks, Networks};
use tauri::{AppHandle, Manager};

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
        shell: "7.5 Core".to_string(),
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
pub fn minimize_window(app: AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        win.minimize().ok();
    }
}

#[tauri::command]
pub fn maximize_window(app: AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let is_max = win.is_maximized().unwrap_or(false);
        if is_max { win.unmaximize().ok(); } else { win.maximize().ok(); }
    }
}

#[tauri::command]
pub fn close_window(app: AppHandle) {
    // Usar app.exit() en vez de window.close() para asegurar
    // que el proceso PTY server también se mata correctamente
    app.exit(0);
}

#[tauri::command]
pub fn toggle_fullscreen(app: AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let is_fs = win.is_fullscreen().unwrap_or(false);
        win.set_fullscreen(!is_fs).ok();
    }
}

// ── Native System Metrics ────────────────────────────────────────────────────

#[derive(Serialize, Deserialize)]
pub struct DiskInfo {
    pub name: String,
    pub mount: String,
    pub total_gb: f64,
    pub used_gb: f64,
    pub percent: f64,
}

#[derive(Serialize, Deserialize)]
pub struct NetInfo {
    pub name: String,
    pub rx_bytes: u64,
    pub tx_bytes: u64,
}

#[derive(Serialize, Deserialize)]
pub struct SystemMetrics {
    pub cpu_usage: f64,
    pub cpu_count: usize,
    pub ram_total_gb: f64,
    pub ram_used_gb: f64,
    pub ram_percent: f64,
    pub disks: Vec<DiskInfo>,
    pub net: Vec<NetInfo>,
    pub uptime_secs: u64,
}

#[tauri::command]
pub fn get_system_metrics() -> SystemMetrics {
    let mut sys = System::new_all();
    sys.refresh_all();
    std::thread::sleep(std::time::Duration::from_millis(200));
    sys.refresh_cpu_all();

    let cpu_usage = sys.cpus().iter().map(|c| c.cpu_usage() as f64).sum::<f64>()
        / sys.cpus().len().max(1) as f64;

    let ram_total = sys.total_memory() as f64 / 1_073_741_824.0;
    let ram_used  = sys.used_memory() as f64 / 1_073_741_824.0;
    let ram_pct   = if ram_total > 0.0 { (ram_used / ram_total) * 100.0 } else { 0.0 };

    let disks_info = Disks::new_with_refreshed_list();
    let disks: Vec<DiskInfo> = disks_info.iter().map(|d| {
        let total = d.total_space() as f64 / 1_073_741_824.0;
        let avail = d.available_space() as f64 / 1_073_741_824.0;
        let used  = total - avail;
        DiskInfo {
            name: d.name().to_string_lossy().to_string(),
            mount: d.mount_point().to_string_lossy().to_string(),
            total_gb: (total * 100.0).round() / 100.0,
            used_gb: (used * 100.0).round() / 100.0,
            percent: if total > 0.0 { ((used / total) * 100.0).round() } else { 0.0 },
        }
    }).collect();

    let nets = Networks::new_with_refreshed_list();
    let net: Vec<NetInfo> = nets.iter().map(|(name, data)| {
        NetInfo {
            name: name.clone(),
            rx_bytes: data.total_received(),
            tx_bytes: data.total_transmitted(),
        }
    }).collect();

    SystemMetrics {
        cpu_usage: (cpu_usage * 10.0).round() / 10.0,
        cpu_count: sys.cpus().len(),
        ram_total_gb: (ram_total * 100.0).round() / 100.0,
        ram_used_gb: (ram_used * 100.0).round() / 100.0,
        ram_percent: (ram_pct * 10.0).round() / 10.0,
        disks,
        net,
        uptime_secs: System::uptime(),
    }
}
