import React, { useState, useEffect, useCallback, useRef } from "react";

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
const MONO = "var(--font-mono)";
const ORBI = "'Orbitron', monospace";

const ps = async (cmd) => invoke("run_powershell", { command: cmd });

function pctColor(v) { return v < 60 ? G : v < 80 ? Y : R; }

// ── Shared small components ─────────────────────────────────────────────────

function Loading() {
  return <div style={{ fontFamily: MONO, fontSize: 10, color: DIM, padding: 8 }}>Cargando...</div>;
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: "flex", gap: 8, fontFamily: MONO, fontSize: 11, lineHeight: "22px" }}>
      <span style={{ color: DIM, minWidth: 100 }}>{label}</span>
      <span style={{ color: color || AC }}>{value}</span>
    </div>
  );
}

function ActionBtn({ label, color = AC, onClick, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov && !disabled ? `${color}22` : "transparent",
        border: `1px solid ${disabled ? "#333" : color}`,
        color: disabled ? "#555" : color,
        fontFamily: MONO, fontSize: 9, padding: "3px 10px",
        cursor: disabled ? "default" : "pointer",
        transition: "all 0.15s", letterSpacing: "0.05em",
      }}
    >{label}</button>
  );
}

function SectionTitle({ children, color = Y }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 10, color, letterSpacing: "0.1em", marginBottom: 6, marginTop: 12, borderBottom: `1px solid ${color}22`, paddingBottom: 3 }}>
      {children}
    </div>
  );
}

function BigSparkline({ data, color, width = 600, height = 60 }) {
  if (!data || data.length < 2) return null;
  const mn = Math.min(...data), mx = Math.max(...data), range = mx - mn || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - mn) / range) * height * 0.85 - height * 0.05;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: "block", margin: "6px 0" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function BarFull({ pct, color, label }) {
  const c = pctColor(pct);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
      {label && <span style={{ fontFamily: MONO, fontSize: 9, color: DIM, width: 50 }}>{label}</span>}
      <div style={{ flex: 1, height: 6, background: "#111", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color || c, transition: "width 0.4s" }} />
      </div>
      <span style={{ fontFamily: MONO, fontSize: 9, color: color || c, width: 36, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

// ── GIT OVERLAY ─────────────────────────────────────────────────────────────

function GitOverlay({ data, onAction }) {
  const [files, setFiles] = useState([]);
  const [commits, setCommits] = useState([]);
  const [diffStat, setDiffStat] = useState("");
  const [loading, setLoading] = useState(true);
  const [commitMsg, setCommitMsg] = useState("");
  const [showCommitInput, setShowCommitInput] = useState(false);

  useEffect(() => {
    (async () => {
      const [filesRes, logRes, diffRes] = await Promise.all([
        ps("git status --porcelain 2>$null"),
        ps("git log --oneline -10 --format='%h|%s|%ar' 2>$null"),
        ps("git diff --stat 2>$null"),
      ]);
      if (filesRes?.stdout) {
        setFiles(filesRes.stdout.trim().split("\n").filter(Boolean).map(l => {
          const status = l.substring(0, 2).trim();
          const name = l.substring(3).trim();
          return { status, name };
        }));
      }
      if (logRes?.stdout) {
        setCommits(logRes.stdout.trim().split("\n").filter(Boolean).map(l => {
          const [hash, msg, date] = l.split("|");
          return { hash, msg, date };
        }));
      }
      if (diffRes?.stdout) setDiffStat(diffRes.stdout.trim());
      setLoading(false);
    })();
  }, []);

  const doGit = (cmd) => onAction?.({ type: "shell", cmd });

  const doCommit = () => {
    if (!commitMsg.trim()) return;
    doGit(`git add -A && git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
    setCommitMsg("");
    setShowCommitInput(false);
  };

  if (loading) return <Loading />;

  const statusColor = { M: Y, A: G, D: R, "?": DIM, U: R };

  return (
    <div style={{ fontFamily: MONO, fontSize: 11 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
        <span style={{ color: Y, fontWeight: 700 }}>{(data?.branch || "main").toUpperCase()}</span>
        <span style={{ color: DIM }}>·</span>
        <span style={{ color: AC }}>{data?.repo || "netwatch-terminal"}</span>
        <span style={{ color: DIM }}>·</span>
        <span style={{ color: G }}>↑{data?.ahead || 0}</span>
        {data?.changes > 0 && <span style={{ color: R }}>{data.changes} cambios</span>}
      </div>

      <SectionTitle>ARCHIVOS MODIFICADOS ({files.length})</SectionTitle>
      {files.length === 0 ? (
        <div style={{ color: DIM, fontSize: 10 }}>Working tree limpio</div>
      ) : (
        <div style={{ maxHeight: 140, overflowY: "auto" }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 8, padding: "2px 0" }}>
              <span style={{ color: statusColor[f.status?.[0]] || DIM, width: 16, fontWeight: 700 }}>{f.status}</span>
              <span style={{ color: "#ccc" }}>{f.name}</span>
            </div>
          ))}
        </div>
      )}

      <SectionTitle>ÚLTIMOS COMMITS</SectionTitle>
      <div style={{ maxHeight: 180, overflowY: "auto" }}>
        {commits.map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 8, padding: "2px 0", fontSize: 10 }}>
            <span style={{ color: AC, width: 56, flexShrink: 0 }}>{c.hash}</span>
            <span style={{ color: "#ccc", flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{c.msg}</span>
            <span style={{ color: DIM, flexShrink: 0 }}>{c.date}</span>
          </div>
        ))}
      </div>

      {diffStat && (
        <>
          <SectionTitle>DIFF STAT</SectionTitle>
          <pre style={{ fontSize: 9, color: "#888", margin: 0, whiteSpace: "pre-wrap", maxHeight: 80, overflowY: "auto" }}>{diffStat}</pre>
        </>
      )}

      <SectionTitle>ACCIONES</SectionTitle>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <ActionBtn label="Commit" color={G} onClick={() => setShowCommitInput(!showCommitInput)} />
        <ActionBtn label="Push" color={Y} onClick={() => doGit("git push")} />
        <ActionBtn label="Pull" color={AC} onClick={() => doGit("git pull")} />
        <ActionBtn label="Stash" color={DIM} onClick={() => doGit("git stash -u")} />
        <ActionBtn label="Stash Pop" color={DIM} onClick={() => doGit("git stash pop")} />
      </div>
      {showCommitInput && (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input
            value={commitMsg} onChange={e => setCommitMsg(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") doCommit(); }}
            placeholder="Mensaje de commit..."
            style={{ flex: 1, background: "#111", border: "1px solid #333", color: "#ccc", fontFamily: MONO, fontSize: 10, padding: "3px 8px", outline: "none" }}
            autoFocus
          />
          <ActionBtn label="✓" color={G} onClick={doCommit} disabled={!commitMsg.trim()} />
        </div>
      )}
    </div>
  );
}

// ── PORTS OVERLAY ───────────────────────────────────────────────────────────

function PortsOverlay({ data }) {
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(true);

  const scan = useCallback(async () => {
    setLoading(true);
    const res = await ps(`Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -lt 65000 -and $_.LocalPort -gt 0 } | Sort-Object LocalPort -Unique | ForEach-Object { $p = (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue); "$($_.LocalPort)|$($p.ProcessName)|$($_.OwningProcess)|TCP" }`);
    if (res?.stdout) {
      const seen = new Set();
      setPorts(res.stdout.trim().split("\n").filter(Boolean).map(l => {
        const [port, proc, pid, proto] = l.trim().split("|");
        const p = parseInt(port);
        if (seen.has(p)) return null;
        seen.add(p);
        return { port: p, proc: proc || "unknown", pid: parseInt(pid), proto };
      }).filter(Boolean).sort((a, b) => a.port - b.port));
    }
    setLoading(false);
  }, []);

  useEffect(() => { scan(); }, [scan]);

  const httpPorts = new Set([80, 443, 3000, 3001, 4000, 5000, 5173, 5174, 8000, 8080, 8443, 8888, 9000]);
  const openInBrowser = (port) => invoke("open_url", { url: `http://localhost:${port}` });

  if (loading) return <Loading />;

  return (
    <div style={{ fontFamily: MONO, fontSize: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ color: G, fontWeight: 700 }}>{ports.length} puertos activos</span>
        <ActionBtn label="↺ Escanear" color={AC} onClick={scan} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 70px 50px auto", gap: "2px 8px", fontSize: 10 }}>
        <span style={{ color: Y, fontWeight: 700 }}>PORT</span>
        <span style={{ color: Y, fontWeight: 700 }}>PROCESO</span>
        <span style={{ color: Y, fontWeight: 700 }}>PID</span>
        <span style={{ color: Y, fontWeight: 700 }}>PROTO</span>
        <span />
        {ports.map(p => (
          <React.Fragment key={p.port}>
            <span style={{ color: AC }}>{p.port}</span>
            <span style={{ color: "#ccc" }}>{p.proc}</span>
            <span style={{ color: DIM }}>{p.pid}</span>
            <span style={{ color: DIM }}>{p.proto}</span>
            {httpPorts.has(p.port) ? (
              <span onClick={() => openInBrowser(p.port)} style={{ color: G, cursor: "pointer", fontSize: 9 }}>🌐 Abrir</span>
            ) : <span />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── DOCKER OVERLAY ──────────────────────────────────────────────────────────

function DockerOverlay({ data }) {
  const [containers, setContainers] = useState([]);
  const [images, setImages] = useState([]);
  const [volumes, setVolumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsId, setLogsId] = useState(null);
  const [logsText, setLogsText] = useState("");
  const [noDocker, setNoDocker] = useState(false);

  useEffect(() => {
    (async () => {
      const cRes = await ps("docker ps -a --format '{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}' 2>$null");
      if (!cRes?.stdout && !cRes?.stderr?.includes("running")) {
        const check = await ps("docker --version 2>$null");
        if (!check?.stdout) { setNoDocker(true); setLoading(false); return; }
      }
      if (cRes?.stdout) {
        setContainers(cRes.stdout.trim().split("\n").filter(Boolean).map(l => {
          const [id, name, image, status, ports] = l.split("|");
          return { id, name, image, status, ports, running: status?.includes("Up") };
        }));
      }
      const iRes = await ps("docker images --format '{{.Repository}}|{{.Tag}}|{{.Size}}' 2>$null");
      if (iRes?.stdout) {
        setImages(iRes.stdout.trim().split("\n").filter(Boolean).map(l => {
          const [repo, tag, size] = l.split("|");
          return { repo, tag, size };
        }));
      }
      const vRes = await ps("docker volume ls --format '{{.Name}}' 2>$null");
      if (vRes?.stdout) {
        setVolumes(vRes.stdout.trim().split("\n").filter(Boolean));
      }
      setLoading(false);
    })();
  }, []);

  const dockerCmd = async (cmd) => { await ps(cmd); };
  const showLogs = async (name) => {
    if (logsId === name) { setLogsId(null); return; }
    setLogsId(name);
    const res = await ps(`docker logs --tail 20 "${name}" 2>&1`);
    setLogsText(res?.stdout || "Sin output.");
  };

  if (loading) return <Loading />;
  if (noDocker) return (
    <div style={{ fontFamily: MONO, textAlign: "center", padding: 20 }}>
      <div style={{ fontSize: 14, color: R, marginBottom: 12 }}>Docker no disponible</div>
      <div style={{ fontSize: 10, color: DIM }}>Instalar Docker Desktop o iniciar el servicio</div>
    </div>
  );

  return (
    <div style={{ fontFamily: MONO, fontSize: 11 }}>
      <SectionTitle color={G}>CONTENEDORES ({containers.length})</SectionTitle>
      {containers.length === 0 ? (
        <div style={{ color: DIM, fontSize: 10 }}>Sin contenedores</div>
      ) : containers.map(c => (
        <div key={c.id} style={{ marginBottom: 8, padding: "6px 8px", background: "#111", border: "1px solid #1a1a1a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ color: c.running ? G : R, fontSize: 9 }}>{c.running ? "●" : "○"}</span>
            <span style={{ color: Y, fontWeight: 700 }}>{c.name}</span>
            <span style={{ color: DIM, fontSize: 9 }}>{c.image}</span>
            <span style={{ color: DIM, fontSize: 9, marginLeft: "auto" }}>{c.id?.slice(0, 12)}</span>
          </div>
          <div style={{ fontSize: 9, color: DIM, marginBottom: 4 }}>{c.status}{c.ports ? ` · ${c.ports}` : ""}</div>
          <div style={{ display: "flex", gap: 4 }}>
            {c.running ? (
              <>
                <ActionBtn label="Stop" color={R} onClick={() => dockerCmd(`docker stop ${c.name}`)} />
                <ActionBtn label="Restart" color={Y} onClick={() => dockerCmd(`docker restart ${c.name}`)} />
              </>
            ) : (
              <ActionBtn label="Start" color={G} onClick={() => dockerCmd(`docker start ${c.name}`)} />
            )}
            <ActionBtn label="Logs" color={AC} onClick={() => showLogs(c.name)} />
          </div>
          {logsId === c.name && (
            <pre style={{ fontSize: 9, color: "#888", marginTop: 6, maxHeight: 120, overflowY: "auto", whiteSpace: "pre-wrap", background: "#0a0a0a", padding: 6 }}>{logsText}</pre>
          )}
        </div>
      ))}

      {images.length > 0 && (
        <>
          <SectionTitle>IMÁGENES ({images.length})</SectionTitle>
          <div style={{ maxHeight: 100, overflowY: "auto" }}>
            {images.map((img, i) => (
              <div key={i} style={{ display: "flex", gap: 8, fontSize: 10, padding: "1px 0" }}>
                <span style={{ color: AC, flex: 1 }}>{img.repo}</span>
                <span style={{ color: DIM }}>{img.tag}</span>
                <span style={{ color: Y }}>{img.size}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {volumes.length > 0 && (
        <>
          <SectionTitle>VOLÚMENES ({volumes.length})</SectionTitle>
          <div style={{ fontSize: 10, color: DIM }}>{volumes.join(", ")}</div>
        </>
      )}
    </div>
  );
}

// ── AI OVERLAY ──────────────────────────────────────────────────────────────

function AIOverlay({ data, onClose }) {
  const [stats, setStats] = useState({ messages: 0, tokens: 0 });

  useEffect(() => {
    try {
      const hist = JSON.parse(localStorage.getItem("nw-ai-history") || "[]");
      const tokens = hist.reduce((acc, m) => acc + Math.ceil((m.content || "").length / 4), 0);
      setStats({ messages: hist.length, tokens });
    } catch { /* ignore */ }
  }, []);

  const openPanel = () => {
    window.dispatchEvent(new CustomEvent("nw-ai-toggle"));
    onClose();
  };

  return (
    <div style={{ fontFamily: MONO, fontSize: 11 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ color: data?.provider ? G : R }}>●</span>
        <span style={{ color: Y, fontWeight: 700 }}>{data?.provider || "Sin provider"}</span>
        {data?.model && <span style={{ color: DIM }}>· {data.model}</span>}
      </div>

      <SectionTitle>PROVIDERS</SectionTitle>
      {["Ollama", "Claude API", "Gemini CLI"].map(p => (
        <div key={p} style={{ padding: "3px 0", color: p === data?.provider ? G : DIM }}>
          {p === data?.provider ? "● " : "○ "}{p}
        </div>
      ))}

      <SectionTitle>ESTADÍSTICAS</SectionTitle>
      <Row label="Mensajes" value={stats.messages} />
      <Row label="Tokens (est.)" value={`~${stats.tokens.toLocaleString()}`} />

      <div style={{ marginTop: 16 }}>
        <ActionBtn label="Abrir panel AI" color={G} onClick={openPanel} />
      </div>
    </div>
  );
}

// ── UPTIME OVERLAY ──────────────────────────────────────────────────────────

function UptimeOverlay({ data }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveSec, setLiveSec] = useState(data?.uptimeSec || 0);

  useEffect(() => {
    (async () => {
      const [hostRes, ipRes, osRes, archRes, cpuRes] = await Promise.all([
        ps("$env:COMPUTERNAME"),
        ps("(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.*' } | Select-Object -First 1).IPAddress"),
        ps("(Get-CimInstance Win32_OperatingSystem).Caption + '|' + (Get-CimInstance Win32_OperatingSystem).Version"),
        ps("[System.Environment]::Is64BitOperatingSystem"),
        ps("(Get-CimInstance Win32_Processor).Name"),
      ]);
      setInfo({
        hostname: hostRes?.stdout?.trim() || "?",
        ip: ipRes?.stdout?.trim() || "?",
        os: osRes?.stdout?.trim().split("|")[0] || "Windows",
        osVersion: osRes?.stdout?.trim().split("|")[1] || "?",
        arch: archRes?.stdout?.trim() === "True" ? "x64" : "x86",
        cpu: cpuRes?.stdout?.trim() || "?",
      });
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setLiveSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  };

  if (loading) return <Loading />;

  return (
    <div style={{ fontFamily: MONO, fontSize: 11 }}>
      <div style={{ fontSize: 28, color: AC, fontFamily: ORBI, fontWeight: 700, marginBottom: 12 }}>
        {fmt(liveSec)}
      </div>
      <Row label="Boot" value={data?.boot || "??:??:??"} />
      <Row label="Sesión" value={fmt(liveSec)} color={G} />
      <SectionTitle>SISTEMA</SectionTitle>
      <Row label="Hostname" value={info.hostname} />
      <Row label="IP local" value={info.ip} color={G} />
      <Row label="OS" value={info.os} />
      <Row label="Versión" value={info.osVersion} />
      <Row label="Arquitectura" value={info.arch} />
      <Row label="CPU" value={info.cpu} color={Y} />
    </div>
  );
}

// ── CPU OVERLAY ─────────────────────────────────────────────────────────────

function CPUOverlay({ data }) {
  const [cores, setCores] = useState([]);
  const [procs, setProcs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [coreRes, procRes] = await Promise.all([
        ps("Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne '_Total' } | ForEach-Object { \"$($_.Name)|$($_.PercentProcessorTime)\" }"),
        ps("Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 | ForEach-Object { \"$($_.ProcessName)|$([math]::Round($_.CPU, 1))|$($_.Id)|$([math]::Round($_.WorkingSet64 / 1MB, 0))\" }"),
      ]);
      if (coreRes?.stdout) {
        setCores(coreRes.stdout.trim().split("\n").filter(Boolean).map(l => {
          const [name, pct] = l.trim().split("|");
          return { name: `Core ${name}`, pct: parseInt(pct) || 0 };
        }));
      }
      if (procRes?.stdout) {
        setProcs(procRes.stdout.trim().split("\n").filter(Boolean).map(l => {
          const [name, cpu, pid, mem] = l.trim().split("|");
          return { name, cpu: parseFloat(cpu) || 0, pid: parseInt(pid), mem: parseInt(mem) || 0 };
        }));
      }
      setLoading(false);
    })();
  }, []);

  const cc = pctColor(data?.cpu || 0);

  return (
    <div style={{ fontFamily: MONO, fontSize: 11 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 36, color: cc, fontFamily: ORBI, fontWeight: 700 }}>{(data?.cpu || 0).toFixed(1)}%</span>
        <span style={{ color: DIM, fontSize: 10 }}>CPU</span>
      </div>

      <BigSparkline data={data?.cpuH} color={cc} />

      {!loading && cores.length > 0 && (
        <>
          <SectionTitle>POR NÚCLEO ({cores.length} cores)</SectionTitle>
          {cores.map(c => (
            <BarFull key={c.name} pct={c.pct} label={c.name} />
          ))}
        </>
      )}

      <SectionTitle>TOP PROCESOS POR CPU</SectionTitle>
      {loading ? <Loading /> : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 60px 60px", gap: "2px 8px", fontSize: 10 }}>
          <span style={{ color: Y, fontWeight: 700 }}>PROCESO</span>
          <span style={{ color: Y, fontWeight: 700 }}>CPU (s)</span>
          <span style={{ color: Y, fontWeight: 700 }}>PID</span>
          <span style={{ color: Y, fontWeight: 700 }}>RAM MB</span>
          {procs.map((p, i) => (
            <React.Fragment key={i}>
              <span style={{ color: AC }}>{p.name}</span>
              <span style={{ color: pctColor(p.cpu > 100 ? 90 : p.cpu) }}>{p.cpu.toFixed(1)}</span>
              <span style={{ color: DIM }}>{p.pid}</span>
              <span style={{ color: DIM }}>{p.mem}</span>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ── RAM OVERLAY ─────────────────────────────────────────────────────────────

function RAMOverlay({ data }) {
  const [memInfo, setMemInfo] = useState(null);
  const [procs, setProcs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [memRes, procRes] = await Promise.all([
        ps("$os = Get-CimInstance Win32_OperatingSystem; \"$([math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / 1MB, 2))|$([math]::Round($os.TotalVisibleMemorySize / 1MB, 2))|$([math]::Round($os.FreePhysicalMemory / 1MB, 2))\""),
        ps("Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10 | ForEach-Object { \"$($_.ProcessName)|$([math]::Round($_.WorkingSet64 / 1MB, 0))|$($_.Id)\" }"),
      ]);
      if (memRes?.stdout) {
        const [used, total, free] = memRes.stdout.trim().split("|");
        setMemInfo({ used: parseFloat(used), total: parseFloat(total), free: parseFloat(free) });
      }
      if (procRes?.stdout) {
        setProcs(procRes.stdout.trim().split("\n").filter(Boolean).map(l => {
          const [name, mem, pid] = l.trim().split("|");
          return { name, mem: parseInt(mem) || 0, pid: parseInt(pid) };
        }));
      }
      setLoading(false);
    })();
  }, []);

  const rc = pctColor(data?.ram || 0);

  return (
    <div style={{ fontFamily: MONO, fontSize: 11 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 36, color: rc, fontFamily: ORBI, fontWeight: 700 }}>{(data?.ram || 0).toFixed(1)}%</span>
        <span style={{ color: DIM, fontSize: 10 }}>RAM</span>
      </div>

      <BigSparkline data={data?.ramH} color={rc} />

      <Row label="Usada" value={`${data?.ramUsed || "?"} GB`} color={rc} />
      <Row label="Total" value={`${data?.ramTotal || "?"} GB`} />
      {memInfo && <Row label="Libre" value={`${memInfo.free.toFixed(2)} GB`} color={G} />}

      <BarFull pct={data?.ram || 0} color={rc} label="RAM" />

      <SectionTitle>TOP PROCESOS POR RAM</SectionTitle>
      {loading ? <Loading /> : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 60px", gap: "2px 8px", fontSize: 10 }}>
          <span style={{ color: Y, fontWeight: 700 }}>PROCESO</span>
          <span style={{ color: Y, fontWeight: 700 }}>RAM (MB)</span>
          <span style={{ color: Y, fontWeight: 700 }}>PID</span>
          {procs.map((p, i) => (
            <React.Fragment key={i}>
              <span style={{ color: AC }}>{p.name}</span>
              <span style={{ color: p.mem > 500 ? R : p.mem > 200 ? Y : G }}>{p.mem}</span>
              <span style={{ color: DIM }}>{p.pid}</span>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DISK OVERLAY ────────────────────────────────────────────────────────────

function DiskOverlay({ data }) {
  const [selected, setSelected] = useState(null);
  const [bigFolders, setBigFolders] = useState([]);
  const [loading, setLoading] = useState(false);

  const disks = data?.disks || [];

  useEffect(() => {
    if (disks.length > 0 && !selected) setSelected(disks[0].name);
  }, [disks, selected]);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    (async () => {
      const res = await ps(`Get-ChildItem "${selected}:\\" -Directory -ErrorAction SilentlyContinue | Select-Object -First 10 | ForEach-Object { $s = 0; try { $s = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum } catch {}; "$($_.Name)|$([math]::Round($s / 1GB, 2))" } | Sort-Object { [double]($_.Split('|')[1]) } -Descending | Select-Object -First 5`);
      if (res?.stdout) {
        setBigFolders(res.stdout.trim().split("\n").filter(Boolean).map(l => {
          const [name, size] = l.trim().split("|");
          return { name, size: parseFloat(size) || 0 };
        }));
      } else {
        setBigFolders([]);
      }
      setLoading(false);
    })();
  }, [selected]);

  return (
    <div style={{ fontFamily: MONO, fontSize: 11 }}>
      <SectionTitle>DISCOS</SectionTitle>
      {disks.map(d => {
        const dc = pctColor(d.pct);
        const isSelected = selected === d.name;
        return (
          <div key={d.name}
            onClick={() => setSelected(d.name)}
            style={{
              padding: "6px 8px", marginBottom: 4, cursor: "pointer",
              background: isSelected ? "#111" : "transparent",
              border: `1px solid ${isSelected ? dc : "#1a1a1a"}`,
              transition: "all 0.15s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <span style={{ color: dc, fontWeight: 700 }}>DSK {d.name}:</span>
              <span style={{ color: dc }}>{d.pct}% · {d.used} / {d.total} GB</span>
            </div>
            <BarFull pct={d.pct} color={dc} />
          </div>
        );
      })}

      {selected && (
        <>
          <SectionTitle>CARPETAS MÁS GRANDES — {selected}:\</SectionTitle>
          {loading ? <Loading /> : bigFolders.length === 0 ? (
            <div style={{ color: DIM, fontSize: 10 }}>Sin datos</div>
          ) : bigFolders.map((f, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
              <span style={{ color: AC }}>{f.name}</span>
              <span style={{ color: Y }}>{f.size} GB</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── NET OVERLAY ─────────────────────────────────────────────────────────────

function NetOverlay({ data }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [ipRes, pubRes, adapterRes] = await Promise.all([
        ps("(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.*' } | Select-Object -First 1).IPAddress"),
        ps("try { (Invoke-RestMethod -Uri 'https://ifconfig.me/ip' -TimeoutSec 3).Trim() } catch { 'N/A' }"),
        ps("Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Up' } | ForEach-Object { \"$($_.Name)|$($_.InterfaceDescription)|$($_.LinkSpeed)\" }"),
      ]);
      setInfo({
        localIp: ipRes?.stdout?.trim() || "?",
        publicIp: pubRes?.stdout?.trim() || "N/A",
        adapters: (adapterRes?.stdout || "").trim().split("\n").filter(Boolean).map(l => {
          const [name, desc, speed] = l.trim().split("|");
          return { name, desc, speed };
        }),
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <Loading />;

  return (
    <div style={{ fontFamily: MONO, fontSize: 11 }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
        <div>
          <span style={{ color: G, fontSize: 24, fontFamily: ORBI, fontWeight: 700 }}>↓{data?.netRx || 0}</span>
          <span style={{ color: DIM, fontSize: 9 }}> KB/s</span>
        </div>
        <div>
          <span style={{ color: Y, fontSize: 24, fontFamily: ORBI, fontWeight: 700 }}>↑{data?.netTx || 0}</span>
          <span style={{ color: DIM, fontSize: 9 }}> KB/s</span>
        </div>
      </div>

      <SectionTitle>DIRECCIÓN</SectionTitle>
      <Row label="IP Local" value={info.localIp} color={G} />
      <Row label="IP Pública" value={info.publicIp} color={AC} />

      {info.adapters.length > 0 && (
        <>
          <SectionTitle>ADAPTADORES</SectionTitle>
          {info.adapters.map((a, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <Row label={a.name} value={a.desc} />
              <div style={{ paddingLeft: 108, color: Y, fontSize: 9 }}>{a.speed}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── PROCESS OVERLAY ─────────────────────────────────────────────────────────

function ProcessOverlay({ data, onAction, onClose }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmKill, setConfirmKill] = useState(false);

  useEffect(() => {
    if (!data?.name) { setLoading(false); return; }
    (async () => {
      const res = await ps(`Get-Process -Name "${data.name}" -ErrorAction SilentlyContinue | Select-Object -First 1 | ForEach-Object { "$($_.Id)|$($_.Path)|$([math]::Round($_.WorkingSet64 / 1MB, 0))|$($_.Threads.Count)|$($_.StartTime.ToString('yyyy-MM-dd HH:mm:ss'))" }`);
      if (res?.stdout) {
        const [pid, path, mem, threads, started] = res.stdout.trim().split("|");
        setInfo({ pid: parseInt(pid), path, mem: parseInt(mem), threads: parseInt(threads), started });
      }
      setLoading(false);
    })();
  }, [data?.name]);

  const kill = async () => {
    if (!confirmKill) { setConfirmKill(true); return; }
    await ps(`Stop-Process -Name "${data.name}" -Force -ErrorAction SilentlyContinue`);
    onClose();
  };

  if (loading) return <Loading />;

  return (
    <div style={{ fontFamily: MONO, fontSize: 11 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18, color: AC, fontWeight: 700 }}>{data?.name}</span>
        {data?.cpu !== undefined && <span style={{ color: pctColor(data.cpu > 10 ? 80 : 30), fontSize: 12 }}>{data.cpu.toFixed(1)}% CPU</span>}
      </div>

      {info && (
        <>
          <Row label="PID" value={info.pid} />
          <Row label="Path" value={info.path || "N/A"} />
          <Row label="RAM" value={`${info.mem} MB`} color={info.mem > 500 ? R : info.mem > 200 ? Y : G} />
          <Row label="Threads" value={info.threads} />
          <Row label="Inicio" value={info.started || "?"} />
        </>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 6 }}>
        <ActionBtn
          label={confirmKill ? "¿Seguro? Click para confirmar" : "Matar proceso"}
          color={R}
          onClick={kill}
        />
        {confirmKill && (
          <ActionBtn label="Cancelar" color={DIM} onClick={() => setConfirmKill(false)} />
        )}
      </div>
    </div>
  );
}

// ── SSH OVERLAY ─────────────────────────────────────────────────────────────

function SSHOverlay({ data, onAction, onClose }) {
  const [pingResult, setPingResult] = useState(null);
  const [pinging, setPinging] = useState(false);

  const host = data?.host || data?.name?.toLowerCase().replace(/\s+/g, "");
  const isOnline = data?.status === "ONLINE";

  const SSH_CONFIG = {
    "Beelink": { host: "192.168.1.139", port: 38, user: "heo" },
    "Kali LAN": { host: "192.168.1.150", port: 22, user: "kali" },
    "Kali Remoto": { host: "kali.remote", port: 22, user: "kali" },
    "CyberLab": { host: "cyberlab.local", port: 22, user: "admin" },
    "Proxmox": { host: "192.168.1.100", port: 22, user: "root" },
  };

  const cfg = SSH_CONFIG[data?.name] || { host: host || "?", port: 22, user: "user" };

  const doPing = async () => {
    setPinging(true);
    const res = await ps(`Test-Connection -ComputerName "${cfg.host}" -Count 1 -ErrorAction SilentlyContinue | ForEach-Object { "$($_.ResponseTime)ms" }`);
    setPingResult(res?.stdout?.trim() || "Sin respuesta");
    setPinging(false);
  };

  const connect = () => {
    onAction?.({ type: "shell", cmd: `ssh ${cfg.user}@${cfg.host} -p ${cfg.port}` });
    onClose();
  };

  const copyIp = () => {
    navigator.clipboard?.writeText(cfg.host);
  };

  return (
    <div style={{ fontFamily: MONO, fontSize: 11 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ color: isOnline ? G : R, fontSize: 14 }}>{isOnline ? "●" : "○"}</span>
        <span style={{ fontSize: 16, color: Y, fontWeight: 700 }}>{data?.name}</span>
        <span style={{ color: isOnline ? G : R }}>{data?.status}</span>
      </div>

      <Row label="Host" value={cfg.host} color={G} />
      <Row label="Puerto" value={cfg.port} />
      <Row label="Usuario" value={cfg.user} color={Y} />

      {pingResult && (
        <div style={{ marginTop: 8, padding: "4px 8px", background: "#111", border: "1px solid #1a1a1a" }}>
          <span style={{ color: DIM, fontSize: 9 }}>Ping: </span>
          <span style={{ color: pingResult.includes("ms") ? G : R, fontSize: 10 }}>{pingResult}</span>
        </div>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {isOnline && <ActionBtn label="Conectar SSH" color={G} onClick={connect} />}
        <ActionBtn label="Copiar IP" color={AC} onClick={copyIp} />
        <ActionBtn label={pinging ? "Pinging..." : "Ping"} color={Y} onClick={doPing} disabled={pinging} />
      </div>

      {!isOnline && (
        <div style={{ marginTop: 12, color: DIM, fontSize: 10 }}>
          No responde — intenta ping para verificar
        </div>
      )}
    </div>
  );
}

// ── QUICK LAUNCH CONFIG ─────────────────────────────────────────────────────

const DEFAULT_QL = [
  { id: "powershell", icon: "⌨", label: "PowerShell", rgb: "252,238,10", action: "powershell" },
  { id: "wsl", icon: "🐧", label: "WSL", rgb: "40,200,64", action: "wsl" },
  { id: "cmd", icon: ">_", label: "CMD", rgb: "5,217,232", action: "cmd" },
  { id: "vscode", icon: "</>", label: "VS Code", rgb: "5,217,232", action: "vscode" },
  { id: "obsidian", icon: "📓", label: "Obsidian", rgb: "5,217,232", action: "obsidian" },
  { id: "notion", icon: "📋", label: "Notion", rgb: "5,217,232", action: "notion" },
  { id: "gmail", icon: "✉", label: "Gmail", rgb: "5,217,232", action: "gmail" },
  { id: "proj", icon: "📁", label: "Abrir Proj", rgb: "252,238,10", action: "proj" },
  { id: "ai", icon: "✦", label: "AI Chat", rgb: "255,42,109", action: "ai" },
  { id: "dojo", icon: "🥋", label: "Dojo", rgb: "5,217,232", action: "dojo" },
  { id: "notebook", icon: "📒", label: "Notebook", rgb: "5,217,232", action: "notebook" },
  { id: "settings", icon: "⚙", label: "Settings", rgb: "5,217,232", action: "settings" },
];

const QL_STORAGE_KEY = "nw-quicklaunch-config";

function loadQLConfig() {
  try { return JSON.parse(localStorage.getItem(QL_STORAGE_KEY)); } catch { return null; }
}

function QuickLaunchConfig({ data, onAction, onClose }) {
  const [items, setItems] = useState(() => loadQLConfig() || [...DEFAULT_QL]);
  const [editIdx, setEditIdx] = useState(null);
  const dragRef = useRef(null);

  const save = () => {
    localStorage.setItem(QL_STORAGE_KEY, JSON.stringify(items));
    onAction?.({ type: "ql-update", items });
    onClose();
  };

  const reset = () => {
    setItems([...DEFAULT_QL]);
    localStorage.removeItem(QL_STORAGE_KEY);
  };

  const moveUp = (i) => {
    if (i <= 0) return;
    const next = [...items];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setItems(next);
  };
  const moveDown = (i) => {
    if (i >= items.length - 1) return;
    const next = [...items];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    setItems(next);
  };
  const remove = (i) => {
    if (items.length <= 6) return;
    setItems(items.filter((_, idx) => idx !== i));
  };
  const addItem = () => {
    if (items.length >= 12) return;
    setItems([...items, { id: `custom-${Date.now()}`, icon: "★", label: "Nuevo", rgb: "5,217,232", action: "settings" }]);
  };

  const updateField = (i, field, value) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: value };
    setItems(next);
  };

  return (
    <div style={{ fontFamily: MONO, fontSize: 11 }}>
      <div style={{ maxHeight: 350, overflowY: "auto" }}>
        {items.map((item, i) => (
          <div key={item.id + i} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "4px 6px",
            marginBottom: 2, background: editIdx === i ? "#111" : "transparent",
            border: "1px solid #1a1a1a",
          }}>
            <span style={{ fontSize: 10, color: DIM }}>{i + 1}</span>
            <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{item.icon}</span>
            {editIdx === i ? (
              <>
                <input value={item.icon} onChange={e => updateField(i, "icon", e.target.value)} style={{ width: 24, background: "#0a0a0a", border: "1px solid #333", color: "#ccc", fontFamily: MONO, fontSize: 10, padding: "1px 3px", outline: "none", textAlign: "center" }} />
                <input value={item.label} onChange={e => updateField(i, "label", e.target.value)} style={{ flex: 1, background: "#0a0a0a", border: "1px solid #333", color: "#ccc", fontFamily: MONO, fontSize: 10, padding: "1px 4px", outline: "none" }} />
                <input value={item.action} onChange={e => updateField(i, "action", e.target.value)} placeholder="acción" style={{ width: 80, background: "#0a0a0a", border: "1px solid #333", color: Y, fontFamily: MONO, fontSize: 9, padding: "1px 4px", outline: "none" }} />
                <span onClick={() => setEditIdx(null)} style={{ color: G, cursor: "pointer", fontSize: 9 }}>✓</span>
              </>
            ) : (
              <>
                <span style={{ color: `rgb(${item.rgb})`, flex: 1 }}>{item.label}</span>
                <span style={{ color: DIM, fontSize: 9 }}>{item.action}</span>
                <span onClick={() => setEditIdx(i)} style={{ color: AC, cursor: "pointer", fontSize: 9 }}>✎</span>
              </>
            )}
            <span onClick={() => moveUp(i)} style={{ color: DIM, cursor: i > 0 ? "pointer" : "default", opacity: i > 0 ? 1 : 0.3, fontSize: 9 }}>▲</span>
            <span onClick={() => moveDown(i)} style={{ color: DIM, cursor: i < items.length - 1 ? "pointer" : "default", opacity: i < items.length - 1 ? 1 : 0.3, fontSize: 9 }}>▼</span>
            <span onClick={() => remove(i)} style={{ color: items.length > 6 ? R : "#333", cursor: items.length > 6 ? "pointer" : "default", fontSize: 9 }}>✕</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        <ActionBtn label="+ Añadir" color={G} onClick={addItem} disabled={items.length >= 12} />
        <ActionBtn label="Restaurar defaults" color={DIM} onClick={reset} />
        <div style={{ flex: 1 }} />
        <ActionBtn label="Guardar" color={G} onClick={save} />
      </div>
      <div style={{ marginTop: 4, color: DIM, fontSize: 9 }}>
        Mín 6, máx 12 · Edita icon, nombre y acción
      </div>
    </div>
  );
}

// ── OVERLAY MAP + TITLES ────────────────────────────────────────────────────

const OVERLAY_MAP = {
  git: GitOverlay,
  ports: PortsOverlay,
  docker: DockerOverlay,
  ai: AIOverlay,
  uptime: UptimeOverlay,
  cpu: CPUOverlay,
  ram: RAMOverlay,
  disk: DiskOverlay,
  net: NetOverlay,
  process: ProcessOverlay,
  ssh: SSHOverlay,
  "quicklaunch-config": QuickLaunchConfig,
};

const OVERLAY_TITLES = {
  git: "◈ GIT — DETALLE",
  ports: "◈ PUERTOS ACTIVOS",
  docker: "◈ DOCKER",
  ai: "◈ AI — CONFIGURACIÓN",
  uptime: "◈ UPTIME — SISTEMA",
  cpu: "◈ CPU — DETALLE",
  ram: "◈ RAM — DETALLE",
  disk: "◈ DISCOS — DETALLE",
  net: "◈ RED — DETALLE",
  process: "◈ PROCESO — DETALLE",
  ssh: "◈ SSH SERVER",
  "quicklaunch-config": "◈ QUICK LAUNCH — CONFIGURAR",
};

// ── MAIN OVERLAY COMPONENT ──────────────────────────────────────────────────

function DashOverlay({ type, data, onClose, onAction }) {
  useEffect(() => {
    if (!type) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [type, onClose]);

  if (!type) return null;
  const Content = OVERLAY_MAP[type];
  if (!Content) return null;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "dashOverlayIn 0.2s ease",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#0a0a0a", border: "1px solid var(--nw-accent)",
        maxWidth: 700, width: "90%", maxHeight: "80vh",
        display: "flex", flexDirection: "column",
        animation: "dashOverlayScale 0.2s ease",
        overflow: "hidden",
      }}>
        <div style={{
          display: "flex", alignItems: "center", padding: "8px 12px",
          borderBottom: "1px solid rgba(5,217,232,0.15)",
          background: BG,
        }}>
          <span style={{ fontFamily: MONO, fontSize: 11, color: Y, letterSpacing: "0.1em", flex: 1 }}>
            {OVERLAY_TITLES[type] || type.toUpperCase()}
          </span>
          <span onClick={onClose} style={{ color: "#ff5555", cursor: "pointer", fontSize: 14, padding: "0 4px" }}
            onMouseOver={e => e.currentTarget.style.textShadow = "0 0 6px #ff5555"}
            onMouseOut={e => e.currentTarget.style.textShadow = "none"}
          >✕</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
          <Content data={data} onAction={onAction} onClose={onClose} />
        </div>
      </div>
      <style>{`
        @keyframes dashOverlayIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes dashOverlayScale { from { transform: scale(0.95); opacity: 0 } to { transform: scale(1); opacity: 1 } }
      `}</style>
    </div>
  );
}

export default DashOverlay;
export { DashOverlay, DEFAULT_QL, QL_STORAGE_KEY, loadQLConfig };
