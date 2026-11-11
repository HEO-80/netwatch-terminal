use super::{NwPipeline, NwResult, PipeStage};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Read;
use std::path::Path;
use std::collections::HashMap;
use sysinfo::System;
use walkdir::WalkDir;

// ANSI helpers — match the NETWATCH palette
macro_rules! y { ($t:expr) => { format!("\x1b[33m{}\x1b[0m", $t) } }
macro_rules! g { ($t:expr) => { format!("\x1b[32m{}\x1b[0m", $t) } }
macro_rules! c { ($t:expr) => { format!("\x1b[36m{}\x1b[0m", $t) } }
macro_rules! m { ($t:expr) => { format!("\x1b[35m{}\x1b[0m", $t) } }
macro_rules! r { ($t:expr) => { format!("\x1b[31m{}\x1b[0m", $t) } }
macro_rules! d { ($t:expr) => { format!("\x1b[38;5;237m{}\x1b[0m", $t) } }
macro_rules! dim { ($t:expr) => { format!("\x1b[38;5;66m{}\x1b[0m", $t) } }

const NL: &str = "\r\n";
const SEP: &str = "\x1b[38;5;237m────────────────────────────────────────────────────────\x1b[0m";

pub async fn dispatch(pipeline: NwPipeline) -> NwResult {
    let result = if pipeline.command == "run" {
        cmd_run(&pipeline.args)
    } else {
        run_command(&pipeline.command, &pipeline.args)
    };

    match result {
        Ok(mut output) => {
            for pipe in &pipeline.pipes {
                output = apply_pipe(&output, pipe);
            }
            NwResult { handled: true, output, error: None }
        }
        Err(ref e) if e == "NOT_HANDLED" => NwResult {
            handled: false,
            output: String::new(),
            error: None,
        },
        Err(e) => NwResult {
            handled: true,
            output: format!("{nl}{err}{nl}", nl = NL, err = r!(format!("✗ Error: {}", e))),
            error: Some(e),
        },
    }
}

fn run_command(command: &str, args: &[String]) -> Result<String, String> {
    match command {
        "proc"  => cmd_proc(args),
        "ports" => cmd_ports(args),
        "kill"  => cmd_kill(args),
        "find"  => cmd_find(args),
        "size"  => cmd_size(args),
        "hash"  => cmd_hash(args),
        "diff"  => cmd_diff(args),
        "clean" => cmd_clean(args),
        "dupes" => cmd_dupes(args),
        "env"   => cmd_env(args),
        "help2" => cmd_help_rust(),
        _ => Err("NOT_HANDLED".to_string()),
    }
}

// ── nw proc ──────────────────────────────────────────────────────────────────
fn cmd_proc(_args: &[String]) -> Result<String, String> {
    let mut sys = System::new_all();
    sys.refresh_all();
    std::thread::sleep(std::time::Duration::from_millis(200));
    sys.refresh_cpu_all();

    let mut procs: Vec<(String, u32, f32, u64)> = sys
        .processes()
        .values()
        .map(|p| {
            (
                p.name().to_string_lossy().to_string(),
                p.pid().as_u32(),
                p.cpu_usage(),
                p.memory() / 1_048_576, // MB
            )
        })
        .collect();

    procs.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap_or(std::cmp::Ordering::Equal));
    let top = &procs[..procs.len().min(20)];

    let mut out = String::new();
    out.push_str(&format!("{nl}{header}{nl}{sep}{nl}{nl}",
        nl = NL, header = c!("◈ PROCESSES (top CPU)"), sep = SEP));

    out.push_str(&format!("  {pid:<8}{name:<30}{cpu:<10}{mem}{nl}",
        pid = d!("PID"), name = d!("NAME"), cpu = d!("CPU%"), mem = d!("MEM"), nl = NL));
    out.push_str(&format!("  {}{nl}", d!("─".repeat(54)), nl = NL));

    for (name, pid, cpu, mem) in top {
        let cpu_color = if *cpu > 50.0 {
            r!(format!("{:>5.1}%", cpu))
        } else if *cpu > 20.0 {
            y!(format!("{:>5.1}%", cpu))
        } else {
            g!(format!("{:>5.1}%", cpu))
        };

        let mem_str = if *mem > 1024 {
            c!(format!("{:.1} GB", *mem as f64 / 1024.0))
        } else {
            dim!(format!("{} MB", mem))
        };

        out.push_str(&format!("  {:<8}{:<30}{:<10}{}{nl}",
            dim!(pid), name.chars().take(28).collect::<String>(),
            cpu_color, mem_str, nl = NL));
    }
    out.push_str(&format!("{nl}  {} procesos totales{nl}{nl}",
        dim!(procs.len()), nl = NL));
    Ok(out)
}

// ── nw ports ─────────────────────────────────────────────────────────────────
fn cmd_ports(_args: &[String]) -> Result<String, String> {
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | \
             Select-Object LocalPort, OwningProcess | \
             Sort-Object LocalPort -Unique | \
             ForEach-Object { \
               $name = (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName; \
               \"$($_.LocalPort)|$($_.OwningProcess)|$name\" \
             }",
        ])
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut out = String::new();
    out.push_str(&format!("{nl}{header}{nl}{sep}{nl}{nl}",
        nl = NL, header = c!("◈ LISTENING PORTS"), sep = SEP));

    out.push_str(&format!("  {port:<10}{pid:<10}{name}{nl}",
        port = d!("PORT"), pid = d!("PID"), name = d!("PROCESS"), nl = NL));
    out.push_str(&format!("  {}{nl}", d!("─".repeat(40)), nl = NL));

    let mut count = 0;
    for line in stdout.lines().filter(|l| !l.trim().is_empty()) {
        let parts: Vec<&str> = line.splitn(3, '|').collect();
        if parts.len() >= 3 {
            let port = parts[0].trim();
            let pid = parts[1].trim();
            let name = parts[2].trim();

            let port_num: u16 = port.parse().unwrap_or(0);
            let port_color = match port_num {
                80 | 443 | 8080 | 8443 => y!(port),
                5432 | 27017 | 6379 => m!(port),
                3000..=3999 | 5173..=5174 => c!(port),
                _ => dim!(port).to_string(),
            };

            out.push_str(&format!("  {:<10}{:<10}{}{nl}",
                port_color, dim!(pid), name, nl = NL));
            count += 1;
        }
    }
    out.push_str(&format!("{nl}  {} puertos escuchando{nl}{nl}",
        dim!(count), nl = NL));
    Ok(out)
}

// ── nw kill ──────────────────────────────────────────────────────────────────
fn cmd_kill(args: &[String]) -> Result<String, String> {
    if args.is_empty() {
        return Ok(format!("{nl}  {}{nl}{nl}",
            dim!("Uso: nw kill <nombre|pid>"), nl = NL));
    }

    let target = &args[0];
    let sys = System::new_all();

    // Try as PID first
    if let Ok(pid_num) = target.parse::<u32>() {
        let pid = sysinfo::Pid::from_u32(pid_num);
        if let Some(process) = sys.process(pid) {
            let name = process.name().to_string_lossy().to_string();
            if process.kill() {
                return Ok(format!("{nl}  {} Proceso {} (PID {}) terminado{nl}{nl}",
                    g!("✓"), y!(&name), pid_num, nl = NL));
            } else {
                return Ok(format!("{nl}  {} No se pudo matar PID {}{nl}{nl}",
                    r!("✗"), pid_num, nl = NL));
            }
        }
        return Ok(format!("{nl}  {} PID {} no encontrado{nl}{nl}",
            r!("✗"), pid_num, nl = NL));
    }

    // Search by name
    let target_lower = target.to_lowercase();
    let mut killed = 0;
    for (_pid, process) in sys.processes() {
        let pname = process.name().to_string_lossy().to_lowercase();
        if pname.contains(&target_lower) {
            if process.kill() {
                killed += 1;
            }
        }
    }

    if killed > 0 {
        Ok(format!("{nl}  {} {} proceso(s) '{}' terminado(s){nl}{nl}",
            g!("✓"), killed, y!(target), nl = NL))
    } else {
        Ok(format!("{nl}  {} Ningún proceso '{}' encontrado{nl}{nl}",
            r!("✗"), target, nl = NL))
    }
}

// ── nw find ──────────────────────────────────────────────────────────────────
fn cmd_find(args: &[String]) -> Result<String, String> {
    if args.is_empty() {
        return Ok(format!("{nl}  {}{nl}{nl}",
            dim!("Uso: nw find <patron> [ruta]"), nl = NL));
    }

    let pattern = args[0].to_lowercase();
    let base = if args.len() > 1 { &args[1] } else { "." };
    let base_path = Path::new(base);

    if !base_path.exists() {
        return Ok(format!("{nl}  {} Ruta '{}' no existe{nl}{nl}",
            r!("✗"), base, nl = NL));
    }

    let mut out = String::new();
    out.push_str(&format!("{nl}{header}{nl}{sep}{nl}{nl}",
        nl = NL, header = c!(format!("◈ FIND '{}'", pattern)), sep = SEP));

    let mut count = 0;
    let max_results = 50;

    for entry in WalkDir::new(base_path)
        .max_depth(8)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            !name.starts_with('.') && name != "node_modules" && name != "target" && name != ".git"
        })
        .filter_map(|e| e.ok())
    {
        let name = entry.file_name().to_string_lossy().to_lowercase();
        if name.contains(&pattern) {
            let path = entry.path().display().to_string();
            let is_dir = entry.file_type().is_dir();
            let icon = if is_dir { "📁" } else { "  " };
            let colored_path = if is_dir { c!(&path) } else { dim!(&path).to_string() };

            out.push_str(&format!("  {} {}{nl}", icon, colored_path, nl = NL));
            count += 1;
            if count >= max_results {
                out.push_str(&format!("  {} ... truncado a {} resultados{nl}",
                    y!("⚠"), max_results, nl = NL));
                break;
            }
        }
    }

    if count == 0 {
        out.push_str(&format!("  {}{nl}", dim!("Sin resultados."), nl = NL));
    } else {
        out.push_str(&format!("{nl}  {} resultados{nl}", dim!(count), nl = NL));
    }
    out.push_str(NL);
    Ok(out)
}

// ── nw size ──────────────────────────────────────────────────────────────────
fn cmd_size(args: &[String]) -> Result<String, String> {
    let n: usize = args.first().and_then(|a| a.parse().ok()).unwrap_or(15);
    let base = if args.len() > 1 { &args[1] } else { "." };

    let mut files: Vec<(String, u64)> = Vec::new();

    for entry in WalkDir::new(base)
        .max_depth(6)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            !name.starts_with('.') && name != "node_modules" && name != "target"
        })
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            if let Ok(meta) = entry.metadata() {
                files.push((entry.path().display().to_string(), meta.len()));
            }
        }
    }

    files.sort_by(|a, b| b.1.cmp(&a.1));
    let top = &files[..files.len().min(n)];

    let mut out = String::new();
    out.push_str(&format!("{nl}{header}{nl}{sep}{nl}{nl}",
        nl = NL, header = c!(format!("◈ TOP {} ARCHIVOS POR TAMAÑO", n)), sep = SEP));

    for (i, (path, size)) in top.iter().enumerate() {
        let size_str = format_size(*size);
        let color_size = if *size > 100_000_000 {
            r!(&size_str)
        } else if *size > 10_000_000 {
            y!(&size_str)
        } else {
            dim!(&size_str).to_string()
        };

        let short_path = if path.len() > 50 {
            format!("...{}", &path[path.len() - 47..])
        } else {
            path.clone()
        };

        out.push_str(&format!("  {} {:<10} {}{nl}",
            dim!(format!("{:>2}.", i + 1)), color_size, c!(&short_path), nl = NL));
    }

    out.push_str(&format!("{nl}  {} archivos escaneados{nl}{nl}",
        dim!(files.len()), nl = NL));
    Ok(out)
}

// ── nw hash ──────────────────────────────────────────────────────────────────
fn cmd_hash(args: &[String]) -> Result<String, String> {
    if args.is_empty() {
        return Ok(format!("{nl}  {}{nl}{nl}",
            dim!("Uso: nw hash <archivo>"), nl = NL));
    }

    let path = Path::new(&args[0]);
    if !path.exists() {
        return Ok(format!("{nl}  {} Archivo '{}' no existe{nl}{nl}",
            r!("✗"), args[0], nl = NL));
    }

    let mut file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];
    loop {
        let n = file.read(&mut buffer).map_err(|e| e.to_string())?;
        if n == 0 { break; }
        hasher.update(&buffer[..n]);
    }
    let hash = format!("{:x}", hasher.finalize());

    let meta = fs::metadata(path).ok();
    let size = meta.as_ref().map(|m| format_size(m.len())).unwrap_or_default();

    let mut out = String::new();
    out.push_str(&format!("{nl}{header}{nl}{sep}{nl}{nl}",
        nl = NL, header = c!("◈ FILE HASH"), sep = SEP));
    out.push_str(&format!("  {} {}{nl}", d!("File:"), c!(&args[0]), nl = NL));
    out.push_str(&format!("  {} {}{nl}", d!("Size:"), dim!(&size), nl = NL));
    out.push_str(&format!("  {} {}{nl}", d!("SHA256:"), g!(&hash), nl = NL));
    out.push_str(NL);
    Ok(out)
}

// ── nw diff ──────────────────────────────────────────────────────────────────
fn cmd_diff(args: &[String]) -> Result<String, String> {
    if args.len() < 2 {
        return Ok(format!("{nl}  {}{nl}{nl}",
            dim!("Uso: nw diff <archivo_a> <archivo_b>"), nl = NL));
    }

    let path_a = Path::new(&args[0]);
    let path_b = Path::new(&args[1]);

    if !path_a.exists() {
        return Ok(format!("{nl}  {} '{}' no existe{nl}{nl}", r!("✗"), args[0], nl = NL));
    }
    if !path_b.exists() {
        return Ok(format!("{nl}  {} '{}' no existe{nl}{nl}", r!("✗"), args[1], nl = NL));
    }

    let content_a = fs::read_to_string(path_a).map_err(|e| e.to_string())?;
    let content_b = fs::read_to_string(path_b).map_err(|e| e.to_string())?;

    let lines_a: Vec<&str> = content_a.lines().collect();
    let lines_b: Vec<&str> = content_b.lines().collect();

    let mut out = String::new();
    out.push_str(&format!("{nl}{header}{nl}{sep}{nl}{nl}",
        nl = NL, header = c!("◈ DIFF"), sep = SEP));
    out.push_str(&format!("  {} {}{nl}", r!("---"), c!(&args[0]), nl = NL));
    out.push_str(&format!("  {} {}{nl}{nl}", g!("+++"), c!(&args[1]), nl = NL));

    if content_a == content_b {
        out.push_str(&format!("  {}{nl}{nl}", g!("✓ Archivos idénticos"), nl = NL));
        return Ok(out);
    }

    let max_lines = lines_a.len().max(lines_b.len()).min(200);
    let mut diffs = 0;
    for i in 0..max_lines {
        let a = lines_a.get(i).unwrap_or(&"");
        let b = lines_b.get(i).unwrap_or(&"");
        if a != b {
            if diffs < 30 {
                out.push_str(&format!("  {} {}{nl}", d!(format!("L{}", i + 1)), r!(format!("- {}", a)), nl = NL));
                out.push_str(&format!("  {}   {}{nl}", d!("  "), g!(format!("+ {}", b)), nl = NL));
            }
            diffs += 1;
        }
    }

    if diffs > 30 {
        out.push_str(&format!("{nl}  {} ... y {} diferencias más{nl}",
            y!("⚠"), diffs - 30, nl = NL));
    }

    out.push_str(&format!("{nl}  {} diferencias en {} líneas{nl}{nl}",
        y!(diffs), dim!(max_lines), nl = NL));
    Ok(out)
}

// ── nw clean ─────────────────────────────────────────────────────────────────
fn cmd_clean(args: &[String]) -> Result<String, String> {
    let dry = args.iter().any(|a| a == "--dry" || a == "-d");

    let mut out = String::new();
    out.push_str(&format!("{nl}{header}{nl}{sep}{nl}{nl}",
        nl = NL,
        header = c!(if dry { "◈ CLEAN (dry run)" } else { "◈ CLEAN" }),
        sep = SEP));

    let patterns = [
        ("*.log", "Archivos de log"),
        ("*.tmp", "Archivos temporales"),
        ("*.bak", "Archivos de backup"),
        ("thumbs.db", "Windows thumbnails"),
        ("desktop.ini", "Windows desktop.ini"),
    ];

    let mut total_files = 0;
    let mut total_size: u64 = 0;

    for (pattern, desc) in &patterns {
        let glob_lower = pattern.to_lowercase();
        let mut count = 0;
        let mut size: u64 = 0;

        for entry in WalkDir::new(".")
            .max_depth(5)
            .into_iter()
            .filter_entry(|e| {
                let name = e.file_name().to_string_lossy();
                !name.starts_with('.') && name != "node_modules" && name != "target"
            })
            .filter_map(|e| e.ok())
        {
            if entry.file_type().is_file() {
                let name = entry.file_name().to_string_lossy().to_lowercase();
                let matches = if glob_lower.starts_with('*') {
                    name.ends_with(&glob_lower[1..])
                } else {
                    name == glob_lower
                };

                if matches {
                    if let Ok(meta) = entry.metadata() {
                        size += meta.len();
                        count += 1;
                        if !dry {
                            let _ = fs::remove_file(entry.path());
                        }
                    }
                }
            }
        }

        if count > 0 {
            let action = if dry { dim!("encontrados") } else { g!("eliminados") };
            out.push_str(&format!("  {} {}: {} archivos ({}) {}{nl}",
                if dry { dim!("○") } else { g!("●") },
                desc, y!(count), dim!(format_size(size)),
                action, nl = NL));
            total_files += count;
            total_size += size;
        }
    }

    if total_files == 0 {
        out.push_str(&format!("  {}{nl}", g!("✓ Nada que limpiar"), nl = NL));
    } else {
        let verb = if dry { "se limpiarían" } else { "limpiados" };
        out.push_str(&format!("{nl}  {} archivos {} ({}){nl}",
            y!(total_files), verb, dim!(format_size(total_size)), nl = NL));
        if dry {
            out.push_str(&format!("  {}{nl}",
                dim!("Ejecuta 'nw clean' sin --dry para eliminar"), nl = NL));
        }
    }
    out.push_str(NL);
    Ok(out)
}

// ── nw dupes ────────────────────────────────────────────────────────────────
fn cmd_dupes(args: &[String]) -> Result<String, String> {
    let base = if args.is_empty() { "." } else { &args[0] };
    let base_path = Path::new(base);

    if !base_path.exists() {
        return Ok(format!("{nl}  {} Ruta '{}' no existe{nl}{nl}",
            r!("✗"), base, nl = NL));
    }

    let mut out = String::new();
    out.push_str(&format!("{nl}{header}{nl}{sep}{nl}{nl}",
        nl = NL, header = c!("◈ DUPLICATE FILES"), sep = SEP));

    let mut size_map: HashMap<u64, Vec<String>> = HashMap::new();
    for entry in WalkDir::new(base_path)
        .max_depth(6)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            !name.starts_with('.') && name != "node_modules" && name != "target"
        })
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            if let Ok(meta) = entry.metadata() {
                if meta.len() > 0 {
                    size_map.entry(meta.len()).or_default()
                        .push(entry.path().display().to_string());
                }
            }
        }
    }

    let mut dupe_groups: Vec<(String, Vec<String>, u64)> = Vec::new();
    for (size, paths) in &size_map {
        if paths.len() < 2 { continue; }
        let mut hash_map: HashMap<String, Vec<String>> = HashMap::new();
        for path in paths {
            if let Ok(h) = hash_file(path) {
                hash_map.entry(h).or_default().push(path.clone());
            }
        }
        for (hash, group) in hash_map {
            if group.len() >= 2 {
                dupe_groups.push((hash, group, *size));
            }
        }
    }

    if dupe_groups.is_empty() {
        out.push_str(&format!("  {}{nl}{nl}",
            g!("✓ No se encontraron duplicados"), nl = NL));
    } else {
        dupe_groups.sort_by(|a, b| b.2.cmp(&a.2));
        let mut total_waste: u64 = 0;

        for (i, (hash, group, size)) in dupe_groups.iter().enumerate() {
            if i >= 20 {
                out.push_str(&format!("  {} ... y {} grupos más{nl}",
                    y!("⚠"), dupe_groups.len() - 20, nl = NL));
                break;
            }
            let waste = size * (group.len() as u64 - 1);
            total_waste += waste;

            out.push_str(&format!("  {} {} ({} copias, {}){nl}",
                y!(format!("#{}", i + 1)),
                dim!(&hash[..16]),
                r!(group.len()),
                c!(format_size(*size)),
                nl = NL));

            for path in group {
                let short = if path.len() > 60 {
                    format!("...{}", &path[path.len() - 57..])
                } else {
                    path.clone()
                };
                out.push_str(&format!("    {} {}{nl}",
                    dim!("·"), c!(&short), nl = NL));
            }
            out.push_str(NL);
        }

        out.push_str(&format!("  {} grupo(s), {} desperdiciado{nl}{nl}",
            y!(dupe_groups.len()),
            r!(format_size(total_waste)),
            nl = NL));
    }
    Ok(out)
}

fn hash_file(path: &str) -> Result<String, String> {
    let mut file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 8192];
    loop {
        let n = file.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 { break; }
        hasher.update(&buf[..n]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}

// ── nw env ──────────────────────────────────────────────────────────────────
fn env_file_path() -> std::path::PathBuf {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());
    let dir = Path::new(&home).join(".netwatch");
    if !dir.exists() {
        let _ = fs::create_dir_all(&dir);
    }
    dir.join("env.json")
}

fn load_env() -> HashMap<String, String> {
    let path = env_file_path();
    fs::read_to_string(&path)
        .ok()
        .and_then(|c| serde_json::from_str(&c).ok())
        .unwrap_or_default()
}

fn save_env(vars: &HashMap<String, String>) {
    if let Ok(json) = serde_json::to_string_pretty(vars) {
        let _ = fs::write(env_file_path(), json);
    }
}

fn cmd_env(args: &[String]) -> Result<String, String> {
    let sub = args.first().map(|s| s.as_str()).unwrap_or("list");
    let mut vars = load_env();

    match sub {
        "set" => {
            if args.len() < 3 {
                return Ok(format!("{nl}  {}{nl}{nl}",
                    dim!("Uso: nw env set <clave> <valor>"), nl = NL));
            }
            let key = args[1].to_uppercase();
            let value = args[2..].join(" ");
            vars.insert(key.clone(), value.clone());
            save_env(&vars);
            Ok(format!("{nl}  {} {} = {}{nl}{nl}",
                g!("✓"), c!(&key), y!(&value), nl = NL))
        }
        "get" => {
            if args.len() < 2 {
                return Ok(format!("{nl}  {}{nl}{nl}",
                    dim!("Uso: nw env get <clave>"), nl = NL));
            }
            let key = args[1].to_uppercase();
            match vars.get(&key) {
                Some(v) => Ok(format!("{nl}  {} = {}{nl}{nl}",
                    c!(&key), y!(v), nl = NL)),
                None => Ok(format!("{nl}  {} Variable '{}' no definida{nl}{nl}",
                    r!("✗"), key, nl = NL)),
            }
        }
        "del" | "rm" => {
            if args.len() < 2 {
                return Ok(format!("{nl}  {}{nl}{nl}",
                    dim!("Uso: nw env del <clave>"), nl = NL));
            }
            let key = args[1].to_uppercase();
            if vars.remove(&key).is_some() {
                save_env(&vars);
                Ok(format!("{nl}  {} Variable '{}' eliminada{nl}{nl}",
                    g!("✓"), key, nl = NL))
            } else {
                Ok(format!("{nl}  {} Variable '{}' no existe{nl}{nl}",
                    r!("✗"), key, nl = NL))
            }
        }
        _ => {
            let mut out = String::new();
            out.push_str(&format!("{nl}{header}{nl}{sep}{nl}{nl}",
                nl = NL, header = c!("◈ NETWATCH ENV"), sep = SEP));

            let defaults = [
                ("NW_PROJECTS", "ruta a proyectos"),
                ("NW_SERVERS", "servidores SSH guardados"),
                ("NW_SHELL", "shell activo (ps, wsl, cmd)"),
            ];

            for (key, desc) in &defaults {
                let label = format!("${}", key);
                let has_val = vars.contains_key(*key);
                let display_val = if has_val {
                    y!(vars.get(*key).unwrap())
                } else {
                    dim!("(no definido)").to_string()
                };
                out.push_str(&format!("  {:<20} {} {} {}{nl}",
                    c!(&label), d!("="), display_val, dim!(desc), nl = NL));
            }

            let custom: Vec<_> = vars.keys()
                .filter(|k| !defaults.iter().any(|(d, _)| *d == k.as_str()))
                .cloned()
                .collect();

            if !custom.is_empty() {
                out.push_str(&format!("{nl}  {}{nl}", d!("Variables custom:"), nl = NL));
                for key in &custom {
                    let label = format!("${}", key);
                    out.push_str(&format!("  {:<20} {} {}{nl}",
                        c!(&label), d!("="), y!(vars.get(key).unwrap()), nl = NL));
                }
            }

            out.push_str(&format!("{nl}  {}{nl}{nl}",
                dim!("nw env set <clave> <valor> · nw env get · nw env del"), nl = NL));
            Ok(out)
        }
    }
}

// ── nw run (scripting .nw) ──────────────────────────────────────────────────
fn cmd_run(args: &[String]) -> Result<String, String> {
    if args.is_empty() {
        return Ok(format!("{nl}  {}{nl}{nl}",
            dim!("Uso: nw run <script.nw>"), nl = NL));
    }

    let path = &args[0];
    if !Path::new(path).exists() {
        return Ok(format!("{nl}  {} Archivo '{}' no existe{nl}{nl}",
            r!("✗"), path, nl = NL));
    }

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let lines: Vec<String> = content.lines().map(|l| l.to_string()).collect();

    let mut out = String::new();
    out.push_str(&format!("{nl}{header}{nl}{sep}{nl}{nl}",
        nl = NL, header = c!(format!("◈ RUN {}", path)), sep = SEP));

    let mut vars = load_env();
    execute_block(&lines, 0, lines.len(), &mut vars, &mut out)?;

    out.push_str(&format!("{nl}  {} Script completado{nl}{nl}",
        g!("✓"), nl = NL));
    Ok(out)
}

fn execute_block(
    lines: &[String], start: usize, end: usize,
    vars: &mut HashMap<String, String>, out: &mut String,
) -> Result<(), String> {
    let mut i = start;
    while i < end {
        let line = substitute_vars(lines[i].trim(), vars);
        if line.is_empty() || line.starts_with('#') { i += 1; continue; }

        if line.starts_with("let ") {
            if let Some(eq) = line.find('=') {
                let name = line[4..eq].trim().to_string();
                let value = line[eq + 1..].trim().to_string();
                vars.insert(name, value);
            }
            i += 1;
            continue;
        }
        if line.starts_with("if ") {
            i = script_if(lines, i, vars, out)?;
            continue;
        }
        if line.starts_with("for ") {
            i = script_for(lines, i, vars, out)?;
            continue;
        }
        if line.starts_with("nw ") {
            run_nw_line(&line, out);
            i += 1;
            continue;
        }
        i += 1;
    }
    Ok(())
}

fn find_block_end(lines: &[String], start: usize) -> (Option<usize>, Option<usize>) {
    let mut else_idx = None;
    let mut depth = 0;
    for i in (start + 1)..lines.len() {
        let t = lines[i].trim();
        if t.starts_with("if ") || t.starts_with("for ") { depth += 1; }
        if t == "end" {
            if depth == 0 { return (Some(i), else_idx); }
            depth -= 1;
        }
        if t == "else" && depth == 0 { else_idx = Some(i); }
    }
    (None, else_idx)
}

fn script_if(
    lines: &[String], start: usize,
    vars: &mut HashMap<String, String>, out: &mut String,
) -> Result<usize, String> {
    let line = substitute_vars(lines[start].trim(), vars);
    let cond_str = line[3..].trim();
    let cond = eval_condition(cond_str);

    let (end_idx, else_idx) = find_block_end(lines, start);
    let end_idx = end_idx.ok_or("Script error: 'if' sin 'end'")?;

    let (exec_start, exec_end) = if cond {
        (start + 1, else_idx.unwrap_or(end_idx))
    } else if let Some(ei) = else_idx {
        (ei + 1, end_idx)
    } else {
        (end_idx, end_idx)
    };

    execute_block(lines, exec_start, exec_end, vars, out)?;
    Ok(end_idx + 1)
}

fn script_for(
    lines: &[String], start: usize,
    vars: &mut HashMap<String, String>, out: &mut String,
) -> Result<usize, String> {
    let line = substitute_vars(lines[start].trim(), vars);
    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.len() < 4 || parts[2] != "in" {
        return Err("Syntax: for VAR in item1 item2 ...".to_string());
    }

    let var_name = parts[1].to_string();
    let items: Vec<String> = parts[3..].iter().map(|s| s.to_string()).collect();

    let (end_idx, _) = find_block_end(lines, start);
    let end_idx = end_idx.ok_or("Script error: 'for' sin 'end'")?;

    for item in &items {
        vars.insert(var_name.clone(), item.clone());
        execute_block(lines, start + 1, end_idx, vars, out)?;
    }
    Ok(end_idx + 1)
}

fn substitute_vars(line: &str, vars: &HashMap<String, String>) -> String {
    let mut result = line.to_string();
    let mut keys: Vec<&String> = vars.keys().collect();
    keys.sort_by(|a, b| b.len().cmp(&a.len()));
    for key in keys {
        result = result.replace(&format!("${}", key), &vars[key]);
    }
    result
}

fn eval_condition(cond: &str) -> bool {
    let parts: Vec<&str> = cond.split_whitespace().collect();
    match parts.len() {
        3 => {
            let (left, op, right) = (parts[0], parts[1], parts[2]);
            match op {
                "==" | "=" => left == right,
                "!=" => left != right,
                ">"  => left.parse::<f64>().unwrap_or(0.0) > right.parse::<f64>().unwrap_or(0.0),
                "<"  => left.parse::<f64>().unwrap_or(0.0) < right.parse::<f64>().unwrap_or(0.0),
                ">=" => left.parse::<f64>().unwrap_or(0.0) >= right.parse::<f64>().unwrap_or(0.0),
                "<=" => left.parse::<f64>().unwrap_or(0.0) <= right.parse::<f64>().unwrap_or(0.0),
                _ => false,
            }
        }
        1 => !parts[0].is_empty() && parts[0] != "false" && parts[0] != "0",
        _ => false,
    }
}

fn run_nw_line(line: &str, out: &mut String) {
    if let Some(pipeline) = super::parse(line) {
        match run_command(&pipeline.command, &pipeline.args) {
            Ok(mut output) => {
                for pipe in &pipeline.pipes {
                    output = apply_pipe(&output, pipe);
                }
                out.push_str(&output);
            }
            Err(ref e) if e == "NOT_HANDLED" => {
                out.push_str(&format!("  {} Comando '{}' no disponible en scripts{nl}",
                    r!("✗"), pipeline.command, nl = NL));
            }
            Err(e) => {
                out.push_str(&format!("  {} {}{nl}", r!("✗"), e, nl = NL));
            }
        }
    }
}

// ── nw help2 (Rust-native commands) ──────────────────────────────────────────
fn cmd_help_rust() -> Result<String, String> {
    let mut out = String::new();
    out.push_str(&format!("{nl}{header}{nl}{sep}{nl}{nl}",
        nl = NL,
        header = format!("{} {}", y!("NETWATCH"), c!("DSL — Comandos nativos (Rust)")),
        sep = SEP));

    let cmds = [
        ("nw proc",              "lista procesos (top CPU/RAM)"),
        ("nw ports",             "puertos TCP escuchando"),
        ("nw kill <nombre|pid>", "matar proceso por nombre o PID"),
        ("nw find <patron>",     "buscar archivos por nombre"),
        ("nw size [n]",          "archivos más grandes (default 15)"),
        ("nw dupes [ruta]",      "encontrar archivos duplicados"),
        ("nw hash <archivo>",    "SHA-256 de un archivo"),
        ("nw diff <a> <b>",      "comparar dos archivos"),
        ("nw clean [--dry]",     "limpiar logs/tmp/bak"),
        ("nw env [set|get|del]", "variables NETWATCH persistentes"),
        ("nw run <script.nw>",   "ejecutar script .nw"),
    ];

    for (cmd, desc) in &cmds {
        let padded_cmd = format!("{:<25}", cmd);
        out.push_str(&format!("  {} {} {}{nl}",
            y!(&padded_cmd), d!("→"), dim!(desc), nl = NL));
    }

    out.push_str(&format!("{nl}  {}{nl}{nl}",
        dim!("Estos comandos corren en Rust nativo — sin PowerShell."), nl = NL));
    Ok(out)
}

// ── Pipe processing ──────────────────────────────────────────────────────────
fn apply_pipe(input: &str, pipe: &PipeStage) -> String {
    match pipe.name.as_str() {
        "filter" => pipe_filter(input, &pipe.args),
        "top" => pipe_top(input, &pipe.args),
        "grep" => pipe_grep(input, &pipe.args),
        _ => input.to_string(),
    }
}

fn pipe_filter(input: &str, args: &[String]) -> String {
    if args.len() < 3 {
        return input.to_string();
    }
    let field = &args[0].to_lowercase();
    let op = &args[1];
    let value: f64 = args[2].parse().unwrap_or(0.0);

    // Filter lines that contain numbers matching the condition
    // This is a simplified filter — works on tabular output
    input
        .lines()
        .filter(|line| {
            let plain = strip_ansi(line);
            if plain.trim().is_empty() || plain.contains("───") || plain.contains("◈") {
                return true; // keep headers
            }
            // Try to find a number in the line to compare
            let numbers: Vec<f64> = plain
                .split_whitespace()
                .filter_map(|w| w.trim_end_matches('%').parse::<f64>().ok())
                .collect();

            if numbers.is_empty() {
                return true;
            }

            // Use first numeric that looks like CPU percentage
            let test_val = if field == "cpu" {
                numbers.iter().find(|&&n| n >= 0.0 && n <= 100.0).copied().unwrap_or(0.0)
            } else {
                numbers[0]
            };

            match op.as_str() {
                ">"  => test_val > value,
                ">=" => test_val >= value,
                "<"  => test_val < value,
                "<=" => test_val <= value,
                "="  | "==" => (test_val - value).abs() < 0.1,
                _    => true,
            }
        })
        .collect::<Vec<&str>>()
        .join("\r\n")
}

fn pipe_top(input: &str, args: &[String]) -> String {
    let n: usize = args.first().and_then(|a| a.parse().ok()).unwrap_or(10);
    let lines: Vec<&str> = input.lines().collect();

    // Keep header lines (first few) + top N data lines
    let mut header_end = 0;
    for (i, line) in lines.iter().enumerate() {
        let plain = strip_ansi(line);
        if plain.contains("───") {
            header_end = i + 1;
            break;
        }
    }

    let header = &lines[..header_end.min(lines.len())];
    let data = &lines[header_end..];
    let data_lines: Vec<&str> = data
        .iter()
        .filter(|l| !strip_ansi(l).trim().is_empty())
        .take(n)
        .copied()
        .collect();

    let mut result: Vec<&str> = header.to_vec();
    result.extend(data_lines);
    result.push(""); // trailing newline
    result.join("\r\n")
}

fn pipe_grep(input: &str, args: &[String]) -> String {
    if args.is_empty() {
        return input.to_string();
    }
    let pattern = args[0].to_lowercase();
    input
        .lines()
        .filter(|line| {
            let plain = strip_ansi(line).to_lowercase();
            plain.contains(&pattern) || plain.contains("───") || plain.contains("◈")
        })
        .collect::<Vec<&str>>()
        .join("\r\n")
}

// ── Helpers ──────────────────────────────────────────────────────────────────
fn format_size(bytes: u64) -> String {
    if bytes >= 1_073_741_824 {
        format!("{:.1} GB", bytes as f64 / 1_073_741_824.0)
    } else if bytes >= 1_048_576 {
        format!("{:.1} MB", bytes as f64 / 1_048_576.0)
    } else if bytes >= 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else {
        format!("{} B", bytes)
    }
}

fn strip_ansi(s: &str) -> String {
    let mut result = String::new();
    let mut in_escape = false;
    for ch in s.chars() {
        if ch == '\x1b' {
            in_escape = true;
        } else if in_escape {
            if ch == 'm' {
                in_escape = false;
            }
        } else {
            result.push(ch);
        }
    }
    result
}
