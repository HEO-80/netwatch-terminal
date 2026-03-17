import { useEffect, useState } from "react";

const invoke = async (cmd, args) => {
  try {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    return await tauriInvoke(cmd, args);
  } catch {
    return null;
  }
};

// ── Helpers de color ──────────────────────────────────────────────────────────
const Y  = { color: "#FCEE0A" };   // yellow
const G  = { color: "#39FF14" };   // green fosforito
const C  = { color: "#00F0FF" };   // cyan
const M  = { color: "#D9027D" };   // magenta
const DIM = { color: "#555" };

// ── Separador ─────────────────────────────────────────────────────────────────
const Sep = ({ color = "#D9027D" }) => (
  <div style={{
    height: 1,
    background: `linear-gradient(to right, transparent, ${color}, transparent)`,
    margin: "12px 0",
    opacity: 0.6,
  }}/>
);

// ── InfoRow ───────────────────────────────────────────────────────────────────
const InfoRow = ({ label, value }) => (
  <div style={{ display: "flex", gap: "8px", lineHeight: "22px", fontSize: "13px", fontFamily: "var(--font-mono)" }}>
    <span style={{ ...C, minWidth: "72px" }}>{label}</span>
    <span style={DIM}>:</span>
    <span style={G}>{value}</span>
  </div>
);

// ── ShortcutRow ───────────────────────────────────────────────────────────────
const ShortcutRow = ({ name, cmd, onClick }) => (
  <div onClick={onClick} style={{
    display: "flex", gap: "12px", lineHeight: "22px", fontSize: "13px",
    fontFamily: "var(--font-mono)", cursor: "pointer",
  }}
    onMouseOver={e => e.currentTarget.style.opacity = "0.7"}
    onMouseOut={e => e.currentTarget.style.opacity = "1"}
  >
    <span style={{ ...Y, minWidth: "160px" }}>{name}</span>
    <span style={G}>{cmd}</span>
  </div>
);

// ── FeatureRow ────────────────────────────────────────────────────────────────
const FeatureRow = ({ keybind, label, desc }) => (
  <div style={{ display: "flex", gap: "8px", lineHeight: "22px", fontSize: "13px", fontFamily: "var(--font-mono)" }}>
    <span style={{ color: "#fff", minWidth: "100px" }}>{keybind}</span>
    <span style={{ color: "#fff", minWidth: "170px" }}>{label}</span>
    <span style={DIM}>→</span>
    <span style={G}>{desc}</span>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Dashboard({ onLaunchTerminal }) {
  const [sysInfo, setSysInfo] = useState(null);
  const [docker,  setDocker]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [info, dock] = await Promise.all([
        invoke("get_system_info"),
        invoke("get_docker_status"),
      ]);
      setSysInfo(info || {
        started: new Date().toLocaleString("es-ES").replace(",",""),
        shell: "7.5 Core",
        cpu: "AMD Ryzen 7 7800X3D",
        ram: "31,17 GB",
        user: "Usuario",
        os: "Microsoft Windows 11 Home",
      });
      setDocker(dock || { available: false, containers: [] });
      setLoading(false);
    }
    load();
  }, []);

  const shortcut = async (action) => {
    try {
      switch (action) {
        case "notion":   await invoke("open_url", { url: "https://www.notion.so/" }); break;
        case "obsidian": await invoke("open_url", { url: "obsidian://" }); break;
        case "gmail":    await invoke("open_url", { url: "https://mail.google.com" }); break;
        case "vscode":   await invoke("open_vscode", { path: null }); break;
        case "proj":     await invoke("open_vscode", { path: "C:\\Users\\Heo\\Source\\Repos" }); break;
        case "bee":      await invoke("ssh_beelink", { host: "heo@192.168.1.139", port: 38 }); break;
      }
    } catch {}
  };

  // Banner NETWATCH estilo profile.ps1
  const Banner = () => (
    <div style={{ marginBottom: "16px", fontFamily: "var(--font-mono)" }}>
      <div style={{ ...Y, fontSize: "13px", letterSpacing: "0.05em" }}>
        ╔══════════════════════════════════════════════════╗
      </div>
      <div style={{ ...Y, fontSize: "13px" }}>
        ║{"  "}<span style={G}>NETWATCH OS v2.077</span>{"  "}·{"  "}<span style={C}>HEO-80</span>{"  "}{"  "}{"  "}{"  "}{"  "}{"  "}{"  "}{"  "}{"  "}║
      </div>
      <div style={{ ...Y, fontSize: "13px", letterSpacing: "0.05em" }}>
        ╚══════════════════════════════════════════════════╝
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ padding: "20px", fontFamily: "var(--font-mono)", ...Y }}>
      Booting NETWATCH OS...
    </div>
  );

  return (
    <div style={{
      flex: 1,
      overflowY: "auto",
      padding: "20px 24px",
      fontFamily: "var(--font-mono)",
      background: "#050500",
    }}>
      <Banner />

      {/* System Info + Shortcuts — 2 columnas */}
      <div style={{ display: "flex", gap: "48px" }}>
        <div style={{ minWidth: "320px" }}>
          <div style={{ ...C, fontSize: "13px", marginBottom: "6px" }}>System Info</div>
          <InfoRow label="Started" value={sysInfo.started} />
          <InfoRow label="Shell"   value={sysInfo.shell} />
          <InfoRow label="CPU"     value={sysInfo.cpu} />
          <InfoRow label="RAM"     value={sysInfo.ram} />
          <InfoRow label="User"    value={sysInfo.user} />
          <InfoRow label="OS"      value={sysInfo.os} />
        </div>
        <div style={{ width: 1, background: "#222" }} />
        <div style={{ flex: 1 }}>
          <div style={{ ...C, fontSize: "13px", marginBottom: "6px" }}>| Shortcuts</div>
          <ShortcutRow name="Notion (n)"       cmd="start https://www.notion.so/"        onClick={() => shortcut("notion")} />
          <ShortcutRow name="Obsidian (o)"     cmd="start obsidian://"                   onClick={() => shortcut("obsidian")} />
          <ShortcutRow name="Gmail (g)"        cmd="start https://mail.google.com"        onClick={() => shortcut("gmail")} />
          <ShortcutRow name="VS Code (vsc)"    cmd="code ."                               onClick={() => shortcut("vscode")} />
          <ShortcutRow name="Abrir Proj (proj)" cmd={`code "C:\\Users\\Heo\\Source\\Repos"`} onClick={() => shortcut("proj")} />
          <ShortcutRow name="Beelink (bee)"    cmd="ssh heo@192.168.1.139 -p 38"         onClick={() => shortcut("bee")} />
        </div>
      </div>

      <Sep color="#D9027D" />

      {/* Features */}
      <div style={{ ...C, fontSize: "13px", marginBottom: "8px" }}>Features instalados</div>
      <FeatureRow keybind="ls / dir"  label="Terminal-Icons" desc="iconos junto a archivos y carpetas" />
      <FeatureRow keybind="Ctrl+T"    label="Fzf Búsqueda"   desc="menú interactivo de archivos" />
      <FeatureRow keybind="Ctrl+R"    label="Fzf Historial"  desc="buscar en historial de comandos" />
      <FeatureRow keybind="Flecha →"  label="Autocompletado" desc="acepta sugerencia en gris" />
      <FeatureRow keybind="help-ps"   label="Ayuda"          desc="ver todos los comandos disponibles" />

      <Sep color="#D9027D" />

      {/* Docker */}
      <div style={{ ...C, fontSize: "13px", marginBottom: "8px" }}>Docker</div>
      {!docker?.available ? (
        <div style={{ ...DIM, fontSize: "13px" }}>Sin contenedores activos.</div>
      ) : docker.containers.length === 0 ? (
        <div style={{ ...DIM, fontSize: "13px" }}>Sin contenedores activos.</div>
      ) : docker.containers.map(c => (
        <div key={c.id} style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
          <span style={C}>{c.id.slice(0,12)}</span>
          <span style={Y}>{c.name}</span>
          <span style={G}>{c.status}</span>
        </div>
      ))}

      <Sep color="#39FF14" />

      {/* Launch terminal button */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "8px" }}>
        <button
          onClick={onLaunchTerminal}
          style={{
            background: "transparent",
            border: "1px solid #39FF14",
            color: "#39FF14",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            letterSpacing: "0.12em",
            padding: "8px 24px",
            cursor: "pointer",
            textTransform: "uppercase",
            transition: "all 0.15s",
          }}
          onMouseOver={e => { e.target.style.background = "#39FF14"; e.target.style.color = "#000"; }}
          onMouseOut={e => { e.target.style.background = "transparent"; e.target.style.color = "#39FF14"; }}
        >
          ▸ LAUNCH TERMINAL
        </button>
        <span style={{ ...DIM, fontSize: "11px" }}>o escribe un comando en la titlebar → terminal</span>
      </div>
    </div>
  );
}
