import { useEffect, useState, useRef, useCallback, memo } from "react";

const invoke = async (cmd, args) => {
  try {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    return await tauriInvoke(cmd, args);
  } catch { return null; }
};

const Y = "#FCEE0A";
const G = "#28c840";
const GF = "#39FF14";
const R = "#ff2a6d";
const AC = "var(--nw-accent)";
const DIM = "rgba(5,217,232,0.35)";
const BG = "#0d0d0d";
const CELL = { border: "1px solid rgba(5,217,232,0.15)", background: BG };
const ORBI = "'Orbitron', monospace";
const MONO = "var(--font-mono)";
const HIST = 40;

function pctColor(v) { return v < 60 ? G : v < 80 ? Y : R; }
function formatUptime(s) { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return `${h}h ${m}m`; }

// ── Sparkline SVG ────────────────────────────────────────────────────────────
function Sparkline({ data, color, width = 55, height = 12 }) {
  if (!data || data.length < 2) return (
    <svg width={width} height={height} style={{ display: "block", opacity: 0.5 }}>
      <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={color} strokeOpacity="0.15" strokeWidth="1" />
    </svg>
  );
  const mn = Math.min(...data), mx = Math.max(...data), range = mx - mn || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - mn) / range) * height * 0.8 - height * 0.1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block", opacity: 0.5 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1" />
    </svg>
  );
}

// ── MiniBar (vertical bars for metrics row) ──────────────────────────────────
function MiniBar({ data, color }) {
  if (!data || data.length < 2) return null;
  const bars = data.slice(-10);
  return (
    <div style={{ display: "flex", gap: 1, justifyContent: "center", alignItems: "flex-end", height: 22 }}>
      {bars.map((v, i) => {
        const h = Math.max(3, Math.round((v / 100) * 22));
        return <div key={i} style={{ width: 4, height: h, background: color }} />;
      })}
    </div>
  );
}

// ── ProgressBar (thin) ───────────────────────────────────────────────────────
function Bar({ pct, color, glow }) {
  return (
    <div style={{ height: 4, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
      <div style={{ height: "100%", background: color, boxShadow: glow ? `0 0 3px ${color}` : "none", transition: "width 0.5s", width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

// ── Corner Marks ─────────────────────────────────────────────────────────────
function CornerMarks() {
  const S = { position: "absolute", width: 16, height: 16, zIndex: 200, pointerEvents: "none" };
  return <>
    <div style={{ ...S, top: 3, left: 3, borderTop: `3px solid ${R}`, borderLeft: `3px solid ${R}` }} />
    <div style={{ ...S, top: 3, right: 3, borderTop: `3px solid ${R}`, borderRight: `3px solid ${R}` }} />
    <div style={{ ...S, bottom: 3, left: 3, borderBottom: `3px solid ${R}`, borderLeft: `3px solid ${R}` }} />
    <div style={{ ...S, bottom: 3, right: 3, borderBottom: `3px solid ${R}`, borderRight: `3px solid ${R}` }} />
  </>;
}

// ── Background Grid ──────────────────────────────────────────────────────────
function BgGrid() {
  return <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, backgroundImage: "linear-gradient(rgba(5,217,232,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(5,217,232,0.02) 1px,transparent 1px)", backgroundSize: "50px 50px" }} />;
}

// ── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
      <div style={{ width: 3, height: 10, background: color }} />
      <span style={{ fontSize: 10, color, letterSpacing: "1.5px", fontWeight: 700 }}>{label}</span>
    </div>
  );
}

// ── QuickLaunch Button ───────────────────────────────────────────────────────
function QLBtn({ icon, label, rgb, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        border: `1px solid rgba(${rgb},${hov ? 1 : 0.3})`,
        background: `rgba(${rgb},${hov ? 0.12 : 0.03})`,
        padding: "4px 6px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        cursor: "pointer", transition: "all 0.25s",
        boxShadow: hov ? `0 0 15px rgba(${rgb},0.6),0 0 30px rgba(${rgb},0.25),inset 0 0 20px rgba(${rgb},0.1)` : "none",
      }}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ fontSize: 10, color: `rgb(${rgb})`, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

// ── SSH Server Row ───────────────────────────────────────────────────────────
function SSHRow({ name, color, status }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 4px", borderLeft: `2px solid ${color}` }}>
      <span style={{ fontSize: 11, color: AC }}>{name}</span>
      <span style={{ fontSize: 9, color, fontWeight: 700 }}>{status}</span>
    </div>
  );
}

// ── Activity Row ─────────────────────────────────────────────────────────────
function ActivityRow({ cmd, time, onRerun }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 4px" }}>
      <span style={{ fontSize: 11, flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", color: AC }}>{cmd}</span>
      <span style={{ fontSize: 13, color: "rgba(5,217,232,0.25)", flexShrink: 0 }}>{time}</span>
      <span onClick={onRerun} style={{ fontSize: 7, color: "rgba(255,42,109,0.3)", cursor: "pointer" }}>⟳</span>
    </div>
  );
}

// ── Process Row ──────────────────────────────────────────────────────────────
function ProcRow({ name, pct }) {
  const c = pct > 10 ? R : pct > 4 ? Y : G;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 4px" }}>
      <span style={{ fontSize: 11, color: AC, flex: 1 }}>{name}</span>
      <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
        <div style={{ height: "100%", background: c, width: `${Math.min(pct * 5, 100)}%` }} />
      </div>
      <span style={{ fontSize: 11, color: c, fontWeight: 700, width: 38, textAlign: "right" }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

// ── Status Band Card ─────────────────────────────────────────────────────────
function StatusCard({ title, color, children, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        border: `1px solid ${color}33`, background: BG, padding: "3px 6px", cursor: "pointer",
        transition: "border-color 0.2s, box-shadow 0.2s",
        borderColor: hov ? `${color}88` : `${color}33`,
        boxShadow: hov ? `0 0 10px ${color}33` : "none",
      }}
    >
      <div style={{ fontSize: 12, color, letterSpacing: "1px" }}>{title}</div>
      {children}
    </div>
  );
}

// ── Metric Big Card ──────────────────────────────────────────────────────────
function MetricCard({ label, value, color, children }) {
  return (
    <div style={{ ...CELL, padding: "10px", textAlign: "center" }}>
      <div style={{ fontSize: 8, color: DIM, letterSpacing: "1px", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 32, color, fontFamily: ORBI, fontWeight: 700, textShadow: `0 0 8px ${color}44` }}>
        {value}
      </div>
      <div style={{ marginTop: 3 }}>{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function Dashboard({ onLaunchTerminal }) {
  // ── Metrics state (replicated from useMetrics pattern) ──
  const [metrics, setMetrics] = useState({
    cpu: 0, cpuH: [], ram: 0, ramH: [], ramUsed: 0, ramTotal: 31.17,
    disks: [], netRx: 0, netTx: 0, procs: [],
    source: "pending",
  });
  const [sysInfo, setSysInfo] = useState(null);
  const [docker, setDocker] = useState(null);
  const [git, setGit] = useState(null);
  const [ports, setPorts] = useState(null);
  const [uptime, setUptime] = useState(null);
  const [uptimeSec, setUptimeSec] = useState(0);
  const [history, setHistory] = useState([]);

  const timerRef = useRef(null);
  const fetchingRef = useRef(false);

  // ── Fetch metrics (Tauri native → mock fallback) ──
  const fetchMetrics = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
      const res = await tauriInvoke("get_system_metrics");
      if (res) {
        const netRx = res.net?.reduce((s, n) => s + n.rx_bytes, 0) || 0;
        const netTx = res.net?.reduce((s, n) => s + n.tx_bytes, 0) || 0;
        const disks = (res.disks || []).map(d => ({
          name: d.mount.replace(":\\", "").replace("/", "") || d.name,
          pct: d.percent, used: d.used_gb, total: d.total_gb,
        })).filter(d => d.total > 0.5);
        setMetrics(prev => ({
          cpu: res.cpu_usage, cpuH: [...prev.cpuH.slice(-(HIST - 1)), res.cpu_usage],
          ram: res.ram_percent, ramH: [...prev.ramH.slice(-(HIST - 1)), res.ram_percent],
          ramUsed: res.ram_used_gb, ramTotal: res.ram_total_gb,
          disks, netRx: Math.round(netRx / 1024), netTx: Math.round(netTx / 1024),
          procs: prev.procs, source: "native",
        }));
        fetchingRef.current = false;
        return;
      }
    } catch { /* fall through to mock */ }
    fetchingRef.current = false;
    // Mock fallback
    const t = Date.now() / 1000;
    const cpu = Math.round(Math.max(2, 15 + Math.sin(t * 0.4) * 12 + Math.random() * 8));
    const ram = Math.round(Math.max(40, 58 + Math.sin(t * 0.15) * 6 + Math.random() * 4));
    setMetrics(prev => ({
      cpu, cpuH: [...prev.cpuH.slice(-(HIST - 1)), cpu],
      ram, ramH: [...prev.ramH.slice(-(HIST - 1)), ram],
      ramUsed: parseFloat((31.17 * ram / 100).toFixed(1)), ramTotal: 31.17,
      disks: [
        { name: "C", pct: 89, used: 737, total: 824 },
        { name: "H", pct: 55, used: 268, total: 488 },
      ],
      netRx: Math.round(Math.abs(Math.sin(t * 0.6) * 400 + Math.random() * 150)),
      netTx: Math.round(Math.abs(Math.sin(t * 0.3) * 100 + Math.random() * 50)),
      procs: prev.procs.length ? prev.procs.map(p => ({ ...p, cpu: Math.max(0.3, Math.min(20, p.cpu + (Math.random() - 0.5))) })).sort((a, b) => b.cpu - a.cpu) : [
        { name: "chrome.exe", cpu: 5.2 }, { name: "node.exe", cpu: 3.9 },
        { name: "Code.exe", cpu: 2.8 }, { name: "pwsh.exe", cpu: 2.4 },
        { name: "explorer.exe", cpu: 1.4 },
      ],
      source: "mock",
    }));
  }, []);

  // ── Fetch static data (once) ──
  useEffect(() => {
    (async () => {
      const [info, dock] = await Promise.all([
        invoke("get_system_info"),
        invoke("get_docker_status"),
      ]);
      setSysInfo(info || {
        started: new Date().toLocaleString("es-ES").replace(",", ""),
        shell: "7.5 Core", cpu: "AMD Ryzen 7 7800X3D",
        ram: "31,17 GB", user: "Usuario", os: "Microsoft Windows 11 Home",
      });
      setDocker(dock || { available: false, containers: [] });

      // Git
      const gitRes = await invoke("run_powershell", {
        command: "$b = git branch --show-current 2>$null; $c = (git status --porcelain 2>$null | Measure-Object).Count; $a = git rev-list --count HEAD --not origin/main 2>$null; $r = (git remote get-url origin 2>$null) -replace '.*[\\\\/]|(\\.git)$',''; if ($b) { Write-Output \"$b|$c|$a|$r\" } else { Write-Output 'none|0|0|' }"
      });
      if (gitRes?.stdout) {
        const [branch, changes, ahead, repo] = gitRes.stdout.trim().split("|");
        setGit({ branch: branch || "none", changes: parseInt(changes) || 0, ahead: parseInt(ahead) || 0, repo: repo || "netwatch-terminal" });
      }

      // Ports
      const portRes = await invoke("run_powershell", {
        command: "Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -lt 10000 -and $_.LocalPort -gt 1024 } | Select-Object -Property LocalPort,OwningProcess -Unique | Sort-Object LocalPort | Select-Object -First 5 | ForEach-Object { $pn = (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName; \"$($_.LocalPort)|$pn\" }"
      });
      if (portRes?.stdout) {
        const lines = portRes.stdout.trim().split("\n").filter(Boolean).map(l => {
          const [port, proc] = l.trim().split("|");
          return { port: parseInt(port), proc: proc || "unknown" };
        });
        setPorts(lines);
      }

      // Uptime
      const upRes = await invoke("run_powershell", {
        command: "$ts = (Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime; \"$([int]$ts.TotalSeconds)|$((Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToString('HH:mm:ss'))\""
      });
      if (upRes?.stdout) {
        const [secs, boot] = upRes.stdout.trim().split("|");
        setUptimeSec(parseInt(secs) || 0);
        setUptime({ boot: boot || "??:??:??" });
      }

      // History from localStorage
      try {
        const raw = JSON.parse(localStorage.getItem("nw-history") || "[]");
        setHistory(raw.slice(-5).reverse());
      } catch { setHistory([]); }
    })();
  }, []);

  // ── Polling loop for metrics ──
  useEffect(() => {
    fetchMetrics();
    timerRef.current = setInterval(fetchMetrics, 3000);
    return () => clearInterval(timerRef.current);
  }, [fetchMetrics]);

  // ── Uptime counter ──
  useEffect(() => {
    const t = setInterval(() => setUptimeSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Quick Launch actions ──
  const launch = async (action) => {
    try {
      switch (action) {
        case "powershell": onLaunchTerminal?.(); break;
        case "wsl": window.dispatchEvent(new CustomEvent("nw-palette-execute", { detail: "wsl" })); break;
        case "cmd": window.dispatchEvent(new CustomEvent("nw-palette-execute", { detail: "cmd" })); break;
        case "vscode": await invoke("open_vscode", { path: null }); break;
        case "obsidian": await invoke("open_url", { url: "obsidian://" }); break;
        case "notion": await invoke("open_url", { url: "https://www.notion.so/" }); break;
        case "gmail": await invoke("open_url", { url: "https://mail.google.com" }); break;
        case "proj": await invoke("open_vscode", { path: "E:\\Cursos\\Projects" }); break;
        case "ai": window.dispatchEvent(new CustomEvent("nw-palette-execute", { detail: "nw ai" })); break;
        case "dojo": window.dispatchEvent(new CustomEvent("nw-palette-execute", { detail: "dojo" })); break;
        case "notebook": window.dispatchEvent(new CustomEvent("nw-palette-execute", { detail: "notebook" })); break;
        case "settings": window.dispatchEvent(new CustomEvent("nw-palette-execute", { detail: "nw config" })); break;
      }
    } catch { /* silent */ }
  };

  const cc = pctColor(metrics.cpu);
  const rc = pctColor(metrics.ram);
  const mainDisk = metrics.disks.find(d => d.name === "C") || metrics.disks[0];
  const mainDiskPct = mainDisk?.pct ?? 0;
  const dc = pctColor(mainDiskPct);
  const dockerContainers = docker?.containers || [];
  const dockerCount = dockerContainers.length;
  const portsData = ports || [];
  const shortCpu = sysInfo?.cpu?.replace(/AMD |Intel |8-Core Processor| 8-Core/g, "").trim().split(" ").slice(0, 2).join(" ") || "Ryzen 7";
  const shortOs = sysInfo?.os?.includes("11") ? "Win11" : sysInfo?.os?.includes("10") ? "Win10" : "Windows";

  const defaultHistory = [
    { cmd: "git push origin main", time: "2h" },
    { cmd: "nw status", time: "3h" },
    { cmd: "cargo build --release", time: "4h" },
    { cmd: "npm run dev", time: "5h" },
    { cmd: "docker-compose up -d", time: "1d" },
  ];
  const activityItems = history.length > 0
    ? history.map(h => ({ cmd: typeof h === "string" ? h : h.cmd || h.command || String(h), time: "" }))
    : defaultHistory;

  const procs = metrics.procs.length > 0
    ? metrics.procs.slice(0, 5)
    : [{ name: "chrome.exe", cpu: 5.2 }, { name: "node.exe", cpu: 3.9 }, { name: "Code.exe", cpu: 2.8 }, { name: "pwsh.exe", cpu: 2.4 }, { name: "explorer.exe", cpu: 1.4 }];

  const SSH_SERVERS = [
    { name: "Beelink", color: R, status: "OFFLINE" },
    { name: "Kali LAN", color: G, status: "ONLINE" },
    { name: "Kali Remoto", color: G, status: "ONLINE" },
    { name: "CyberLab", color: G, status: "ONLINE" },
    { name: "Proxmox", color: G, status: "ONLINE" },
  ];

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", fontFamily: MONO,
      background: "#0a0a0a", color: AC, fontSize: 11, overflow: "hidden",
      position: "relative",
    }}>
      <CornerMarks />
      <BgGrid />

      {/* ── COMMAND PROMPT ── */}
      <div style={{ padding: "6px 10px 0 10px", flexShrink: 0, zIndex: 10, position: "relative", width: "50%" }}>
        <div style={{
          position: "relative", border: `2px solid ${Y}`, padding: "5px 12px",
          display: "flex", alignItems: "center", gap: 8, background: "#0a0a0a",
        }}>
          <div style={{ position: "absolute", inset: -5, border: `1px solid ${Y}`, pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: -7, right: -7, width: 12, height: 12, borderTop: `2px solid ${Y}`, borderRight: `2px solid ${Y}` }} />
          <div style={{ position: "absolute", bottom: -7, right: -7, width: 12, height: 12, borderBottom: `2px solid ${Y}`, borderRight: `2px solid ${Y}` }} />
          <span style={{ fontFamily: MONO, fontSize: 12, color: AC, whiteSpace: "nowrap" }}>NETWATCH OS v2.077</span>
          <span style={{ fontSize: 12, color: DIM }}>·</span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: G, fontWeight: 700 }}>HEO-80</span>
          <span style={{ fontSize: 14, color: Y, animation: "blink 1s step-end infinite", marginLeft: 2 }}>█</span>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div style={{
        flex: 1, display: "grid",
        gridTemplateColumns: "200px 1fr",
        gridTemplateRows: "1fr auto 1fr auto",
        gap: 4, padding: "6px 10px", overflow: "hidden",
        position: "relative", zIndex: 1,
      }}>

        {/* ══ SYSTEM PANEL (left, spans 2 rows) ══ */}
        <div style={{
          gridRow: "1 / 3", ...CELL, padding: 6,
          display: "flex", flexDirection: "column", gap: 3, overflow: "hidden", width: 175,
        }}>
          {/* Header */}
          <div style={{ fontSize: 8, color: Y, letterSpacing: "2px", fontFamily: ORBI, paddingBottom: 3, borderBottom: `1px solid ${Y}18`, display: "flex", justifyContent: "space-between" }}>
            <span>SYSTEM</span>
            <span style={{ color: DIM, fontSize: 7 }}>LIVE ●</span>
          </div>
          {/* CPU */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 1 }}>
              <span style={{ fontSize: 13, color: DIM }}>CPU</span>
              <span style={{ fontSize: 9, color: cc, fontFamily: ORBI, marginLeft: "auto" }}>{metrics.cpu.toFixed(1)}%</span>
            </div>
            <Bar pct={metrics.cpu} color={cc} glow />
            <Sparkline data={metrics.cpuH} color={cc} width={55} height={12} />
          </div>
          {/* RAM */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 1 }}>
              <span style={{ fontSize: 13, color: DIM }}>RAM</span>
              <span style={{ fontSize: 9, color: rc, fontFamily: ORBI, marginLeft: "auto" }}>{metrics.ram.toFixed(1)}%</span>
            </div>
            <Bar pct={metrics.ram} color={rc} glow />
            <Sparkline data={metrics.ramH} color={rc} width={55} height={12} />
          </div>
          {/* Disks */}
          {metrics.disks.slice(0, 2).map(d => {
            const dkc = pctColor(d.pct);
            return (
              <div key={d.name}>
                <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 1 }}>
                  <span style={{ fontSize: 13, color: DIM }}>DSK {d.name}</span>
                  <span style={{ fontSize: 9, color: dkc, fontFamily: ORBI, marginLeft: "auto" }}>{d.pct}%</span>
                </div>
                <Bar pct={d.pct} color={dkc} />
              </div>
            );
          })}
          {/* Net */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 0", borderTop: "1px solid rgba(5,217,232,0.06)", fontSize: 8 }}>
            <span style={{ color: DIM }}>NET</span>
            <span style={{ color: G }}>↓{metrics.netRx}</span>
            <span style={{ color: Y }}>↑{metrics.netTx}</span>
            <span style={{ color: "rgba(5,217,232,0.12)" }}>KB/s</span>
          </div>
          {/* HW Info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, fontSize: 7, borderTop: "1px solid rgba(5,217,232,0.06)", paddingTop: 3 }}>
            <span style={{ color: DIM }}>CPU</span><span style={{ color: AC, textAlign: "right" }}>{shortCpu}</span>
            <span style={{ color: DIM }}>RAM</span><span style={{ color: AC, textAlign: "right" }}>{metrics.ramTotal} GB</span>
            <span style={{ color: DIM }}>OS</span><span style={{ color: G, textAlign: "right" }}>{shortOs}</span>
            <span style={{ color: DIM }}>Shell</span><span style={{ color: Y, textAlign: "right" }}>PS {sysInfo?.shell || "7.5"}</span>
          </div>
          {/* Monitor sparklines */}
          <div style={{ marginTop: "auto", borderTop: "1px solid rgba(5,217,232,0.06)", paddingTop: 4 }}>
            <div style={{ fontSize: 6, color: "rgba(5,217,232,0.15)", letterSpacing: "1px", marginBottom: 2 }}>MONITOR</div>
            <div style={{ display: "flex", gap: 3 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 6, color: DIM, marginBottom: 1 }}>CPU</div>
                <Sparkline data={metrics.cpuH} color={cc} width={75} height={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 6, color: DIM, marginBottom: 1 }}>RAM</div>
                <Sparkline data={metrics.ramH} color={rc} width={75} height={18} />
              </div>
            </div>
          </div>
        </div>

        {/* ══ QUICK LAUNCH ══ */}
        <div style={{ ...CELL, padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 8, color: Y, letterSpacing: "2px", fontFamily: ORBI, paddingBottom: 2, borderBottom: `1px solid ${Y}18` }}>QUICK LAUNCH</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 3, flex: 1 }}>
            <QLBtn icon="⌨" label="PowerShell" rgb="252,238,10" onClick={() => launch("powershell")} />
            <QLBtn icon="🐧" label="WSL" rgb="40,200,64" onClick={() => launch("wsl")} />
            <QLBtn icon=">_" label="CMD" rgb="5,217,232" onClick={() => launch("cmd")} />
            <QLBtn icon="</>" label="VS Code" rgb="5,217,232" onClick={() => launch("vscode")} />
            <QLBtn icon="📓" label="Obsidian" rgb="5,217,232" onClick={() => launch("obsidian")} />
            <QLBtn icon="📋" label="Notion" rgb="5,217,232" onClick={() => launch("notion")} />
            <QLBtn icon="✉" label="Gmail" rgb="5,217,232" onClick={() => launch("gmail")} />
            <QLBtn icon="📁" label="Abrir Proj" rgb="252,238,10" onClick={() => launch("proj")} />
            <QLBtn icon="✦" label="AI Chat" rgb="255,42,109" onClick={() => launch("ai")} />
            <QLBtn icon="🥋" label="Dojo" rgb="5,217,232" onClick={() => launch("dojo")} />
            <QLBtn icon="📒" label="Notebook" rgb="5,217,232" onClick={() => launch("notebook")} />
            <QLBtn icon="⚙" label="Settings" rgb="5,217,232" onClick={() => launch("settings")} />
          </div>
        </div>

        {/* ══ STATUS BAND ══ */}
        <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr", gap: 4 }}>
          {/* GIT */}
          <StatusCard title="GIT" color={Y}>
            <div style={{ fontSize: 14, color: Y, fontWeight: 700 }}>
              {(git?.branch || "main").toUpperCase()} {git?.changes > 0 && <span style={{ color: R }}>({git.changes})</span>}
            </div>
            <div style={{ fontSize: 13, color: `${Y}59`, marginTop: 1 }}>main · {git?.repo || "netwatch-terminal"}</div>
            <div style={{ fontSize: 13, color: `${Y}40`, marginTop: 1 }}>↑{git?.ahead || 0} ↓0 · ahead {git?.ahead || 0}</div>
          </StatusCard>

          {/* PORTS */}
          <StatusCard title="PORTS" color={G}>
            <div style={{ fontSize: 14, color: G, fontWeight: 700 }}>{portsData.length} activos</div>
            {portsData.slice(0, 3).map(p => (
              <div key={p.port} style={{ fontSize: 13, color: `${G}59`, marginTop: 1 }}>
                :{p.port} <span style={{ color: `${G}80` }}>{p.proc}</span>
              </div>
            ))}
            {portsData.length === 0 && <div style={{ fontSize: 13, color: `${G}40` }}>escaneando...</div>}
          </StatusCard>

          {/* DOCKER */}
          <StatusCard title="DOCKER" color={G}>
            <div style={{ fontSize: 14, color: G, fontWeight: 700 }}>
              {dockerCount > 0 ? `● ${dockerCount} running` : "○ parado"}
            </div>
            {dockerContainers.slice(0, 3).map(c => (
              <div key={c.id || c.name} style={{ fontSize: 13, color: `${G}59`, marginTop: 1 }}>
                {c.name} <span style={{ color: G }}>▲</span>
              </div>
            ))}
            {dockerCount === 0 && <div style={{ fontSize: 13, color: `${G}40` }}>sin contenedores</div>}
          </StatusCard>

          {/* AI */}
          <StatusCard title="AI" color={AC}>
            <div style={{ fontSize: 14, color: AC, fontWeight: 700 }}>Claude 3.5</div>
            <div style={{ fontSize: 13, color: DIM, marginTop: 1 }}>Provider: Anthropic</div>
            <div style={{ fontSize: 13, color: DIM }}>Status: <span style={{ color: G }}>activo</span></div>
          </StatusCard>

          {/* UPTIME */}
          <StatusCard title="UPTIME" color={AC}>
            <div style={{ fontSize: 14, color: AC, fontWeight: 700, fontFamily: ORBI }}>{formatUptime(uptimeSec)}</div>
            <div style={{ fontSize: 13, color: "rgba(5,217,232,0.25)", marginTop: 1 }}>Sesión: {formatUptime(uptimeSec)}</div>
            <div style={{ fontSize: 13, color: "rgba(5,217,232,0.25)" }}>Boot: {uptime?.boot || "??:??:??"}</div>
          </StatusCard>
        </div>

        {/* ══ SSH + ACTIVIDAD + PROCESOS ══ */}
        <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr", gap: 6, minHeight: 140 }}>
          {/* SSH Servers */}
          <div style={{ ...CELL, padding: "6px 8px", display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" }}>
            <SectionHeader color={R} label="SSH SERVERS" />
            {SSH_SERVERS.map(s => <SSHRow key={s.name} {...s} />)}
          </div>

          {/* Actividad Reciente */}
          <div style={{ ...CELL, padding: "6px 8px", display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" }}>
            <SectionHeader color={Y} label="ACTIVIDAD RECIENTE" />
            {activityItems.slice(0, 5).map((a, i) => (
              <ActivityRow key={i} cmd={a.cmd} time={a.time} onRerun={() => window.dispatchEvent(new CustomEvent("nw-palette-execute", { detail: a.cmd }))} />
            ))}
          </div>

          {/* Top Procesos */}
          <div style={{ ...CELL, padding: "6px 8px", display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" }}>
            <SectionHeader color={AC} label="TOP PROCESOS" />
            {procs.map((p, i) => <ProcRow key={i} name={p.name} pct={p.cpu} />)}
          </div>
        </div>

        {/* ══ METRICS ROW ══ */}
        <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
          <MetricCard label="CPU" value={`${metrics.cpu.toFixed(1)}%`} color={cc}>
            <MiniBar data={metrics.cpuH} color={cc} />
          </MetricCard>
          <MetricCard label="RAM" value={`${metrics.ram.toFixed(1)}%`} color={rc}>
            <MiniBar data={metrics.ramH} color={rc} />
          </MetricCard>
          <MetricCard label="DISK" value={`${mainDiskPct}%`} color={dc}>
            <div style={{ display: "flex", gap: 1, justifyContent: "center" }}>
              {metrics.disks.map(d => {
                const dkc = pctColor(d.pct);
                return <div key={d.name} style={{ width: 3, height: 10, background: dkc }} />;
              })}
              {metrics.disks.length === 0 && <>
                <div style={{ width: 3, height: 10, background: "rgba(255,255,255,0.06)" }} />
                <div style={{ width: 3, height: 10, background: "rgba(255,255,255,0.06)" }} />
              </>}
            </div>
          </MetricCard>
          <MetricCard label="NETWORK" value="" color={G}>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: -8 }}>
              <span style={{ fontSize: 26, color: G, fontFamily: ORBI, fontWeight: 700 }}>↓{metrics.netRx}</span>
              <span style={{ fontSize: 26, color: Y, fontFamily: ORBI, fontWeight: 700 }}>↑{metrics.netTx}</span>
            </div>
          </MetricCard>
        </div>
      </div>

      {/* ── CSS Keyframes (injected once) ── */}
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}

export default memo(Dashboard);
