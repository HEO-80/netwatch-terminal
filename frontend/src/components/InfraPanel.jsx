import { useState, useEffect, useCallback } from "react";

// ── Colores ───────────────────────────────────────────────────────────────────
const Y   = "#FCEE0A";
const G   = "#39FF14";
const C   = "#00F0FF";
const M   = "#D9027D";
const R   = "#ff5555";
const DIM = "#444";
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
  // Token opcional — sin él solo repos públicos
  const token = localStorage.getItem("nw-github-token") || "";
  const user  = localStorage.getItem("nw-github-user")  || "HEO-80";
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
            message: e.payload?.commits?.[0]?.message?.slice(0, 32) || "",
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
export default function InfraPanel({ open }) {
  const [k8s,     setK8s]     = useState(null);
  const [tf,      setTf]      = useState(null);
  const [ssh,     setSsh]     = useState([]);
  const [ports,   setPorts]   = useState([]);
  const [github,  setGithub]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpd, setLastUpd] = useState(null);

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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      width:      open ? "220px" : "0px",
      minWidth:   open ? "220px" : "0px",
      overflow:   "hidden",
      background: "#020200",
      borderRight: open ? "1px solid #D9027D" : "none",
      flexShrink: 0,
      transition: "width 0.2s ease, min-width 0.2s ease",
      display:    "flex",
      flexDirection: "column",
      order: -1, // siempre a la izquierda
    }}>
      {open && (
        <div style={{ padding: "12px 14px", overflowY: "auto", flex: 1 }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: M, letterSpacing: "0.1em" }}>
              ◈ INFRA
            </span>
            <button
              onClick={refresh}
              style={{ background: "transparent", border: "none", color: loading ? DIM : M, fontFamily: "var(--font-mono)", fontSize: "9px", cursor: "pointer", padding: 0 }}
              title="Actualizar"
            >
              {loading ? "···" : "↺"}
            </button>
          </div>
          {lastUpd && <div style={{ fontSize: "8px", color: "#333", fontFamily: "var(--font-mono)", marginBottom: "4px" }}>upd: {lastUpd}</div>}

          {/* ── SSH ── */}
          <SectionTitle>SSH Servers</SectionTitle>
          {ssh.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
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
          ))}

          {/* ── PUERTOS ── */}
          <SectionTitle>Puertos Activos</SectionTitle>
          {ports.length === 0 ? (
            <div style={{ fontSize: "10px", color: DIM, fontFamily: "var(--font-mono)" }}>
              {loading ? "Escaneando..." : "Ninguno detectado"}
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {ports.map((p, i) => (
                <div key={i} style={{
                  background: "#0a0a00", border: "1px solid #1a1a1a",
                  padding: "2px 6px", fontSize: "9px",
                  fontFamily: "var(--font-mono)",
                }}>
                  <span style={{ color: C }}>:{p.port}</span>
                  <span style={{ color: DIM }}> {p.name}</span>
                </div>
              ))}
            </div>
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
                <div key={i} style={{ marginBottom: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "9px", color: C, fontFamily: "var(--font-mono)" }}>{c.repo}</span>
                    <span style={{ fontSize: "8px", color: DIM, fontFamily: "var(--font-mono)" }}>{c.when}</span>
                  </div>
                  <div style={{ fontSize: "9px", color: W, fontFamily: "var(--font-mono)", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.message}
                  </div>
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
          <div style={{ fontSize: "8px", color: "#222", fontFamily: "var(--font-mono)", textAlign: "center" }}>
            Alt+I para cerrar
          </div>
        </div>
      )}
    </div>
  );
}
