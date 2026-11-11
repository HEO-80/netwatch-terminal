import { useState, useEffect, useCallback, useRef, memo } from "react";
import { secureGet } from "../utils/secure-store";
import WinControls from "./WinControls";
import { useKeyboardNav, KB_HIGHLIGHT } from "../hooks/useKeyboardNav";

// ── Colores ───────────────────────────────────────────────────────────────────
const Y   = "#FCEE0A";
const G   = "#39FF14";
const C   = "var(--nw-accent)";
const M   = "#D9027D";
const R   = "#ff5555";
const DIM = "#888";
const W   = "#888";

// ── UI helpers ────────────────────────────────────────────────────────────────
const SectionTitle = ({ children }) => (
  <div style={{
    fontFamily: "var(--font-mono)", fontSize: "9px", color: C,
    letterSpacing: "0.12em", textTransform: "uppercase",
    borderBottom: "1px solid #1a1a1a",
    paddingBottom: "4px", marginBottom: "8px", marginTop: "14px",
  }}>
    {children}
  </div>
);

const Dot = ({ color, pulse }) => (
  <span style={{
    display: "inline-block", width: 6, height: 6,
    borderRadius: "50%", background: color,
    boxShadow: pulse ? `0 0 6px ${color}` : "none",
    marginRight: 5, flexShrink: 0,
    animation: pulse ? "blink 2s ease-in-out infinite" : "none",
  }}/>
);

const Row = ({ label, value, valueColor = G, mono = true }) => (
  <div style={{
    display: "flex", justifyContent: "space-between",
    alignItems: "baseline", marginBottom: "6px",
  }}>
    <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: DIM, letterSpacing: "0.06em" }}>
      {label}
    </span>
    <span style={{ fontFamily: mono ? "var(--font-mono)" : "inherit", fontSize: "11px", color: valueColor, fontWeight: 700 }}>
      {value}
    </span>
  </div>
);

const ActionBtn = ({ onClick, children }) => {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseOver={() => setH(true)}
      onMouseOut={() => setH(false)}
      style={{
        background: h ? "#1a1a1a" : "transparent",
        border: `1px solid ${h ? M : "#333"}`,
        color: M, fontFamily: "var(--font-mono)", fontSize: "8px",
        padding: "2px 8px", cursor: "pointer",
        filter: h ? "brightness(1.4)" : "none",
      }}
    >
      {children}
    </button>
  );
};

const detailStyle = (color) => ({
  padding: "6px 10px", background: "#111",
  borderLeft: `2px solid ${color}`,
  marginBottom: "6px", marginTop: "2px",
  display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center",
});

const hoverBg = {
  onMouseOver: (e) => { e.currentTarget.style.background = "#111"; },
  onMouseOut:  (e) => { e.currentTarget.style.background = "transparent"; },
};

const BROWSER_PORTS = [3000, 5173, 8080, 4200, 8000];

// ── Fetchers ──────────────────────────────────────────────────────────────────

// Kubernetes — via kubectl
async function fetchK8s() {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke("run_powershell", {
      command: "kubectl get pods --all-namespaces --no-headers 2>$null | Select-Object -First 20"
    });
    if (!result.success || !result.stdout.trim()) {
      return { available: false, pods: [] };
    }
    const pods = result.stdout.trim().split("\n").map(line => {
      const parts = line.trim().split(/\s+/);
      return {
        namespace: parts[0] || "",
        name:      parts[1] || "",
        ready:     parts[2] || "",
        status:    parts[3] || "",
        restarts:  parts[4] || "0",
      };
    }).filter(p => p.name);
    return { available: true, pods };
  } catch {
    return { available: false, pods: [] };
  }
}

// Terraform — leer tfstate local
async function fetchTerraform() {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    // Buscar terraform.tfstate en repos
    const result = await invoke("run_powershell", {
      command: `
        $states = Get-ChildItem -Path "$env:USERPROFILE\\Source\\Repos" -Recurse -Filter "terraform.tfstate" -ErrorAction SilentlyContinue | Select-Object -First 5
        if ($states) {
          $states | ForEach-Object {
            $content = Get-Content $_.FullName -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($content) {
              $resources = $content.resources.Count
              $dir = $_.DirectoryName | Split-Path -Leaf
              Write-Output "$dir|$resources"
            }
          }
        }
      `
    });
    if (!result.stdout.trim()) return { available: false, workspaces: [] };
    const workspaces = result.stdout.trim().split("\n").map(line => {
      const [name, count] = line.split("|");
      return { name: name?.trim(), resources: parseInt(count) || 0 };
    }).filter(w => w.name);
    return { available: true, workspaces };
  } catch {
    return { available: false, workspaces: [] };
  }
}

// SSH servers — ping
async function fetchSSHServers() {
  const servers = [
    { name: "Beelink",   host: "192.168.1.139", port: 38   },
    { name: "Localhost", host: "127.0.0.1",      port: 22  },
  ];

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const results = await Promise.all(servers.map(async (srv) => {
      const res = await invoke("run_powershell", {
        command: `Test-Connection -ComputerName ${srv.host} -Count 1 -Quiet -TimeoutSeconds 2`
      });
      const online = res.stdout?.trim().toLowerCase() === "true";
      return { ...srv, online, latency: online ? "< 2ms" : null };
    }));
    return results;
  } catch {
    return servers.map(s => ({ ...s, online: false, latency: null }));
  }
}

// Puertos locales — netstat
async function fetchPorts() {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke("run_powershell", {
      command: `
        $interesting = @(3000,3001,4000,5173,5174,7777,8080,8443,9000,27017,5432,6379,1337)
        $listening = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
          Where-Object { $interesting -contains $_.LocalPort } |
          Select-Object LocalPort -Unique |
          Sort-Object LocalPort
        $listening | ForEach-Object { $_.LocalPort }
      `
    });
    if (!result.stdout.trim()) return [];
    const ports = result.stdout.trim().split("\n")
      .map(p => parseInt(p.trim()))
      .filter(p => !isNaN(p));

    // Mapear puertos a nombres conocidos
    const portNames = {
      3000: "React/Node", 3001: "API/Bot", 4000: "GraphQL",
      5173: "Vite dev",   5174: "Vite alt", 7777: "PTY server",
      8080: "HTTP alt",   8443: "HTTPS alt", 9000: "Portainer",
      27017: "MongoDB",   5432: "PostgreSQL", 6379: "Redis",
      1337: "Strapi",
    };
    return ports.map(p => ({ port: p, name: portNames[p] || "service" }));
  } catch {
    return [];
  }
}

// GitHub — últimos commits y PRs via API
async function fetchGitHub() {
  const token = await secureGet("github-token");
  const user  = (await secureGet("github-user")) || "HEO-80";
  const headers = token ? { Authorization: `token ${token}` } : {};

  try {
    const [eventsRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${user}/events?per_page=5`, { headers, signal: AbortSignal.timeout(5000) }),
      fetch(`https://api.github.com/users/${user}/repos?sort=pushed&per_page=5`, { headers, signal: AbortSignal.timeout(5000) }),
    ]);

    const events = await eventsRes.json();
    const repos  = await reposRes.json();

    const commits = Array.isArray(events)
      ? events
          .filter(e => e.type === "PushEvent")
          .slice(0, 4)
          .map(e => ({
            repo:    e.repo?.name?.split("/")[1] || e.repo?.name,
            message: e.payload?.commits?.[0]?.message || "",
            url:     e.payload?.commits?.[0]?.sha && e.repo?.name
              ? `https://github.com/${e.repo.name}/commit/${e.payload.commits[0].sha}`
              : e.repo?.name ? `https://github.com/${e.repo.name}` : null,
            when:    timeAgo(new Date(e.created_at)),
          }))
      : [];

    const activeRepos = Array.isArray(repos)
      ? repos.slice(0, 4).map(r => ({
          name:     r.name,
          stars:    r.stargazers_count,
          language: r.language,
          pushed:   timeAgo(new Date(r.pushed_at)),
        }))
      : [];

    return { available: true, commits, activeRepos, user };
  } catch {
    return { available: false, commits: [], activeRepos: [], user };
  }
}

function timeAgo(date) {
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

// ── Main InfraPanel ───────────────────────────────────────────────────────────
function InfraPanel({ open, focused, onFocus, onOverlay, minimized, onMinimize }) {
  const [k8s,     setK8s]     = useState(null);
  const [tf,      setTf]      = useState(null);
  const [ssh,     setSsh]     = useState([]);
  const [ports,   setPorts]   = useState([]);
  const [github,  setGithub]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpd, setLastUpd] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [hovered, setHovered] = useState(false);
  const [pingResult, setPingResult] = useState({});
  const rootRef = useRef(null);

  const pingHost = async (host) => {
    setPingResult(prev => ({ ...prev, [host]: "Ping..." }));
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const res = await invoke("run_powershell", {
        command: `Test-Connection -ComputerName ${host} -Count 1 -Quiet`,
      });
      const ok = res.stdout?.trim().toLowerCase() === "true";
      setPingResult(prev => ({ ...prev, [host]: ok ? "Responde al ping" : "Servidor no responde" }));
    } catch {
      setPingResult(prev => ({ ...prev, [host]: "Ping fallido" }));
    }
  };

  const toggle = (section, i) =>
    setExpanded(expanded?.section === section && expanded?.index === i ? null : { section, index: i });
  const isOpen = (section, i) => expanded?.section === section && expanded?.index === i;

  // Click fuera cierra el detalle
  useEffect(() => {
    if (!expanded) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setExpanded(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [expanded]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [k, t, s, p, g] = await Promise.all([
      fetchK8s(),
      fetchTerraform(),
      fetchSSHServers(),
      fetchPorts(),
      fetchGitHub(),
    ]);
    setK8s(k);
    setTf(t);
    setSsh(s);
    setPorts(p);
    setGithub(g);
    setLastUpd(new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      refresh();
      const t = setInterval(refresh, 45000);
      return () => clearInterval(t);
    }
  }, [open, refresh]);

  // Keyboard navigation
  const [kbIndex] = useKeyboardNav("infra", ssh.length, focused);
  useEffect(() => {
    if (!focused) return;
    const onAction = (e) => {
      if (e.detail.panel !== "infra") return;
      const action = e.detail.action;
      if (action === "refresh") { refresh(); return; }
      const srv = ssh[kbIndex];
      if (!srv) return;
      if (action === "enter" || action === "space") toggle("ssh", kbIndex);
      else if (action === "copy") navigator.clipboard.writeText(srv.host);
    };
    window.addEventListener("nw-panel-action", onAction);
    return () => window.removeEventListener("nw-panel-action", onAction);
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      ref={rootRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
      boxShadow:  hovered && open ? "0 0 12px rgba(217,2,125,0.3)" : "none",
      width:      open ? (focused ? "350px" : "220px") : "0px",
      minWidth:   open ? (focused ? "350px" : "220px") : "0px",
      overflow:   "hidden",
      background: "#020200",
      borderRight: open ? (focused ? "1px solid var(--nw-accent)" : "1px solid rgba(0,240,255,0.3)") : "none",
      flexShrink: 0,
      transition: "width 0.2s ease, min-width 0.2s ease, box-shadow 0.2s ease",
      display:    "flex",
      flexDirection: "column",
      order: -1, // siempre a la izquierda
    }}>
      {open && (
        <div style={{ padding: "12px 14px", overflowY: minimized ? "hidden" : "auto", flex: minimized ? "none" : 1, height: minimized ? "28px" : undefined, boxSizing: "border-box" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: "4px" }} onDoubleClick={onOverlay}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: M, letterSpacing: "0.1em", cursor: "pointer" }} onClick={onFocus}>
              ◈ INFRA {focused ? "⊟" : ""}
            </span>
            <button
              onClick={refresh}
              style={{ marginLeft: "auto", background: "transparent", border: "none", color: loading ? DIM : M, fontFamily: "var(--font-mono)", fontSize: "9px", cursor: "pointer", padding: 0 }}
              title="Actualizar"
            >
              {loading ? "···" : "↺"}
            </button>
            <WinControls minimized={minimized} onMinimize={onMinimize} onOverlay={onOverlay} color={M} dim={DIM} />
          </div>
          {!minimized && <>
          {lastUpd &&<div style={{ fontSize: "8px", color: "#777", fontFamily: "var(--font-mono)", marginBottom: "4px" }}>upd: {lastUpd}</div>}

          {/* ── SSH ── */}
          <SectionTitle>SSH Servers</SectionTitle>
          {ssh.map((s, i) => (
            <div key={i}>
              <div
                onClick={() => toggle("ssh", i)}
                {...hoverBg}
                style={{ display: "flex", alignItems: "center", marginBottom: "6px", cursor: "pointer", ...(kbIndex === i ? KB_HIGHLIGHT : {}) }}
              >
                <Dot color={s.online ? G : R} pulse={s.online} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "10px", color: s.online ? Y : DIM, fontFamily: "var(--font-mono)" }}>{s.name}</span>
                    <span style={{ fontSize: "9px", color: s.online ? G : R, fontFamily: "var(--font-mono)" }}>
                      {s.online ? "ONLINE" : "OFFLINE"}
                    </span>
                  </div>
                  <div style={{ fontSize: "8px", color: DIM, fontFamily: "var(--font-mono)" }}>
                    {s.host}:{s.port}{s.latency ? ` · ${s.latency}` : ""}
                  </div>
                </div>
              </div>
              {isOpen("ssh", i) && !s.online && (
                <div style={detailStyle(M)}>
                  <span style={{ fontSize: "9px", color: DIM, fontFamily: "var(--font-mono)", width: "100%" }}>
                    {pingResult[s.host] ? pingResult[s.host] : "Servidor no responde"}
                  </span>
                  <ActionBtn onClick={() => pingHost(s.host)}>Ping</ActionBtn>
                  <ActionBtn onClick={() => navigator.clipboard.writeText(s.host)}>Copiar IP</ActionBtn>
                  <ActionBtn onClick={refresh}>Reintentar</ActionBtn>
                </div>
              )}
              {isOpen("ssh", i) && s.online && (
                <div style={detailStyle(M)}>
                  <ActionBtn onClick={() => window.dispatchEvent(new CustomEvent("nw-open-tab", { detail: "powershell" }))}>Conectar</ActionBtn>
                  <ActionBtn onClick={() => navigator.clipboard.writeText(s.host)}>Copiar IP</ActionBtn>
                </div>
              )}
            </div>
          ))}

          {/* ── PUERTOS ── */}
          <SectionTitle>Puertos Activos</SectionTitle>
          {ports.length === 0 ? (
            <div style={{ fontSize: "10px", color: DIM, fontFamily: "var(--font-mono)" }}>
              {loading ? "Escaneando..." : "Ninguno detectado"}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {ports.map((p, i) => (
                  <div
                    key={i}
                    onClick={() => toggle("port", i)}
                    onMouseOver={(e) => { e.currentTarget.style.background = "#111"; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = "#0a0a00"; }}
                    style={{
                      background: "#0a0a00",
                      border: `1px solid ${isOpen("port", i) ? M : "#1a1a1a"}`,
                      padding: "2px 6px", fontSize: "9px",
                      fontFamily: "var(--font-mono)", cursor: "pointer",
                    }}
                  >
                    <span style={{ color: C }}>:{p.port}</span>
                    <span style={{ color: DIM }}> {p.name}</span>
                  </div>
                ))}
              </div>
              {expanded?.section === "port" && ports[expanded.index] && (() => {
                const p = ports[expanded.index];
                return (
                  <div style={{ ...detailStyle(M), marginTop: "6px" }}>
                    <span style={{ fontSize: "9px", color: Y, fontFamily: "var(--font-mono)" }}>
                      {p.name} :{p.port}
                    </span>
                    {BROWSER_PORTS.includes(p.port) && (
                      <ActionBtn onClick={() => window.open(`http://localhost:${p.port}`, "_blank")}>Abrir en navegador</ActionBtn>
                    )}
                  </div>
                );
              })()}
            </>
          )}

          {/* ── KUBERNETES ── */}
          <SectionTitle>Kubernetes</SectionTitle>
          {!k8s?.available ? (
            <div style={{ fontSize: "10px", color: DIM, fontFamily: "var(--font-mono)" }}>
              {loading ? "Conectando..." : "kubectl no disponible"}
            </div>
          ) : k8s.pods.length === 0 ? (
            <div style={{ fontSize: "10px", color: DIM, fontFamily: "var(--font-mono)" }}>Sin pods</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "9px", color: DIM, fontFamily: "var(--font-mono)" }}>
                  {k8s.pods.filter(p => p.status === "Running").length} running
                </span>
                <span style={{ fontSize: "9px", color: R, fontFamily: "var(--font-mono)" }}>
                  {k8s.pods.filter(p => p.status !== "Running").length} other
                </span>
              </div>
              {k8s.pods.slice(0, 6).map((pod, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                  <Dot color={pod.status === "Running" ? G : pod.status === "Pending" ? Y : R} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "9px", color: W, fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {pod.name}
                    </div>
                    <div style={{ fontSize: "8px", color: DIM, fontFamily: "var(--font-mono)" }}>
                      {pod.namespace} · {pod.ready}
                    </div>
                  </div>
                </div>
              ))}
              {k8s.pods.length > 6 && (
                <div style={{ fontSize: "8px", color: DIM, fontFamily: "var(--font-mono)" }}>
                  +{k8s.pods.length - 6} más
                </div>
              )}
            </>
          )}

          {/* ── TERRAFORM ── */}
          <SectionTitle>Terraform</SectionTitle>
          {!tf?.available ? (
            <div style={{ fontSize: "10px", color: DIM, fontFamily: "var(--font-mono)" }}>
              {loading ? "Buscando states..." : "No se encontraron .tfstate"}
            </div>
          ) : (
            tf.workspaces.map((ws, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div>
                  <div style={{ fontSize: "10px", color: Y, fontFamily: "var(--font-mono)" }}>{ws.name}</div>
                  <div style={{ fontSize: "8px", color: DIM, fontFamily: "var(--font-mono)" }}>tfstate</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: G, fontFamily: "var(--font-mono)", fontWeight: 700 }}>{ws.resources}</div>
                  <div style={{ fontSize: "8px", color: DIM, fontFamily: "var(--font-mono)" }}>resources</div>
                </div>
              </div>
            ))
          )}

          {/* ── GITHUB ── */}
          <SectionTitle>GitHub</SectionTitle>
          {!github?.available ? (
            <div style={{ fontSize: "10px", color: DIM, fontFamily: "var(--font-mono)" }}>
              {loading ? "Conectando..." : "Sin conexión"}
            </div>
          ) : (
            <>
              {/* Últimos commits */}
              {github.commits.slice(0, 3).map((c, i) => (
                <div key={i}>
                  <div
                    onClick={() => toggle("github", i)}
                    {...hoverBg}
                    style={{ marginBottom: "6px", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "9px", color: C, fontFamily: "var(--font-mono)" }}>{c.repo}</span>
                      <span style={{ fontSize: "8px", color: DIM, fontFamily: "var(--font-mono)" }}>{c.when}</span>
                    </div>
                    <div style={{ fontSize: "9px", color: W, fontFamily: "var(--font-mono)", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.message.split("\n")[0].slice(0, 32)}
                    </div>
                  </div>
                  {isOpen("github", i) && (
                    <div style={{ ...detailStyle(M), flexDirection: "column", alignItems: "flex-start" }}>
                      <div style={{ fontSize: "9px", color: W, fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {c.message || "(sin mensaje)"}
                      </div>
                      {c.url && (
                        <ActionBtn onClick={() => window.open(c.url, "_blank")}>Abrir en GitHub</ActionBtn>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Token hint si no hay datos */}
              {github.commits.length === 0 && (
                <div style={{ fontSize: "8px", color: DIM, fontFamily: "var(--font-mono)", lineHeight: "14px" }}>
                  Añade token en:<br/>
                  <span style={{ color: Y }}>localStorage</span><br/>
                  nw-github-token
                </div>
              )}
            </>
          )}

          <div style={{ height: 1, background: "#1a1a1a", margin: "12px 0" }}/>
          <div style={{ fontSize: "8px", color: "#777", fontFamily: "var(--font-mono)", textAlign: "center" }}>
            Alt+I para cerrar
          </div>
          </>}
        </div>
      )}
    </div>
  );
}

export default memo(InfraPanel);
