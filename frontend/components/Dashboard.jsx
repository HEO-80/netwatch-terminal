import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";

// ── Separador de sección ──────────────────────────────────────────────────────
const Separator = ({ char = "─", color = "var(--cy-border2)" }) => (
  <div style={{
    color,
    fontSize: "13px",
    letterSpacing: "0.02em",
    lineHeight: "22px",
    userSelect: "none",
  }}>
    {char.repeat(100)}
  </div>
);

// ── Línea de info: label → valor ──────────────────────────────────────────────
const InfoRow = ({ label, value, labelWidth = "80px" }) => (
  <div style={{ display: "flex", gap: "8px", lineHeight: "22px", fontSize: "13px" }}>
    <span style={{ color: "var(--cy-label)", minWidth: labelWidth }}>{label}</span>
    <span style={{ color: "var(--cy-dim)" }}>:</span>
    <span style={{ color: "var(--cy-value)" }}>{value}</span>
  </div>
);

// ── Shortcut row ──────────────────────────────────────────────────────────────
const ShortcutRow = ({ keyLabel, name, command, onClick }) => (
  <div
    style={{ display: "flex", gap: "4px", lineHeight: "22px", fontSize: "13px", cursor: "pointer" }}
    onClick={onClick}
    title={command}
  >
    <span style={{ color: "var(--cy-shortcut-key)", minWidth: "130px" }}>{name} ({keyLabel})</span>
    <span style={{ color: "var(--cy-dim)" }}>{"  "}</span>
    <span style={{ color: "var(--cy-shortcut-cmd)" }}>{command}</span>
  </div>
);

// ── Feature row ───────────────────────────────────────────────────────────────
const FeatureRow = ({ key: keybind, label, arrow = "->", desc }) => (
  <div style={{ display: "flex", gap: "8px", lineHeight: "22px", fontSize: "13px" }}>
    <span style={{ color: "var(--cy-white)", minWidth: "100px" }}>{keybind}</span>
    <span style={{ color: "var(--cy-white)", minWidth: "180px" }}>{label}</span>
    <span style={{ color: "var(--cy-dim)" }}>{arrow}</span>
    <span style={{ color: "var(--cy-white)" }}>{desc}</span>
  </div>
);

// ── Docker row ────────────────────────────────────────────────────────────────
const DockerRow = ({ container }) => (
  <div style={{ display: "flex", gap: "12px", lineHeight: "22px", fontSize: "12px" }}>
    <span style={{ color: "var(--cy-cyan)", minWidth: "80px" }}>{container.id.slice(0, 12)}</span>
    <span style={{ color: "var(--cy-yellow)", minWidth: "160px" }}>{container.name}</span>
    <span style={{ color: "var(--cy-green)" }}>{container.status}</span>
    {container.ports && (
      <span style={{ color: "var(--cy-dim)" }}>{container.ports}</span>
    )}
  </div>
);

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard({ onReady }) {
  const [sysInfo,    setSysInfo]    = useState(null);
  const [docker,     setDocker]     = useState(null);
  const [isLoading,  setIsLoading]  = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [info, dockerStatus] = await Promise.all([
          invoke("get_system_info"),
          invoke("get_docker_status"),
        ]);
        setSysInfo(info);
        setDocker(dockerStatus);
      } catch (err) {
        // Dev fallback cuando no estamos en Tauri
        setSysInfo({
          started: new Date().toLocaleString("es-ES", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" }).replace(",",""),
          shell: "7.5 Core",
          cpu: "AMD Ryzen 7 7800X3D",
          ram: "31,17 GB",
          user: "Usuario",
          os: "Microsoft Windows 11 Home",
        });
        setDocker({ available: false, containers: [] });
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  const handleShortcut = async (action) => {
    try {
      switch (action) {
        case "notion":   await invoke("open_url", { url: "https://www.notion.so/" }); break;
        case "obsidian": await invoke("open_url", { url: "obsidian://" }); break;
        case "gmail":    await invoke("open_url", { url: "https://mail.google.com" }); break;
        case "vscode":   await invoke("open_vscode", { path: null }); break;
        case "proj":     await invoke("open_vscode", { path: "C:\\Users\\Heo\\Source\\Repos" }); break;
        case "bee":      await invoke("ssh_beelink", { host: "heo@192.168.1.139", port: 38 }); break;
      }
    } catch (err) {
      console.error("Shortcut error:", err);
    }
  };

  if (isLoading) {
    return (
      <div style={{ color: "var(--cy-yellow)", padding: "16px 20px", fontSize: "13px" }}>
        <span style={{ animation: "blink 1s step-end infinite" }}>█</span>
        {" "}Booting NETWATCH OS...
      </div>
    );
  }

  return (
    <div style={{
      padding: "16px 20px",
      animation: "fadeIn 0.3s ease",
      color: "var(--cy-white)",
      lineHeight: "22px",
    }}>

      {/* ── Two-column layout: System Info | Shortcuts ── */}
      <div style={{ display: "flex", gap: "48px" }}>

        {/* Left: System Info */}
        <div style={{ flex: "0 0 auto", minWidth: "320px" }}>
          <div style={{ color: "var(--cy-cyan)", fontSize: "13px", marginBottom: "4px" }}>
            System Info
          </div>
          <div style={{ height: "4px" }} />
          <InfoRow label="Started" value={sysInfo.started} />
          <InfoRow label="Shell"   value={sysInfo.shell} />
          <InfoRow label="CPU"     value={sysInfo.cpu} />
          <InfoRow label="RAM"     value={sysInfo.ram} />
          <InfoRow label="User"    value={sysInfo.user} />
          <InfoRow label="OS"      value={sysInfo.os} />
        </div>

        {/* Vertical divider */}
        <div style={{
          width: "1px",
          background: "var(--cy-border2)",
          alignSelf: "stretch",
          opacity: 0.5,
        }} />

        {/* Right: Shortcuts */}
        <div style={{ flex: 1 }}>
          <div style={{ color: "var(--cy-cyan)", fontSize: "13px", marginBottom: "4px" }}>
            | Shortcuts
          </div>
          <div style={{ height: "4px" }} />
          <ShortcutRow keyLabel="n"   name="Notion"     command="start https://www.notion.so/"          onClick={() => handleShortcut("notion")} />
          <ShortcutRow keyLabel="o"   name="Obsidian"   command="start obsidian://"                     onClick={() => handleShortcut("obsidian")} />
          <ShortcutRow keyLabel="g"   name="Gmail"      command="start https://mail.google.com"         onClick={() => handleShortcut("gmail")} />
          <ShortcutRow keyLabel="vsc" name="VS Code"    command="code ."                                onClick={() => handleShortcut("vscode")} />
          <ShortcutRow keyLabel="proj" name="Abrir Proj" command={`code "C:\\Users\\Heo\\Source\\Repos"`} onClick={() => handleShortcut("proj")} />
          <ShortcutRow keyLabel="bee" name="Beelink"    command="ssh heo@192.168.1.139 -p 38"          onClick={() => handleShortcut("bee")} />
        </div>
      </div>

      {/* ── Separator ── */}
      <div style={{ margin: "12px 0" }}>
        <Separator char="─" color="var(--cy-magenta)" />
      </div>

      {/* ── Features instalados ── */}
      <div style={{ color: "var(--cy-cyan)", fontSize: "13px", marginBottom: "8px" }}>
        Features instalados
      </div>
      <div style={{ paddingLeft: "0" }}>
        <FeatureRow keybind="ls / dir"  label="Terminal-Icons" desc="iconos junto a archivos y carpetas" />
        <FeatureRow keybind="Ctrl+T"    label="Fzf Búsqueda"   desc="menú interactivo de archivos" />
        <FeatureRow keybind="Ctrl+R"    label="Fzf Historial"  desc="buscar en historial de comandos" />
        <FeatureRow keybind="Flecha →"  label="Autocompletado" desc="acepta sugerencia en gris" />
        <FeatureRow keybind="help-ps"   label="Ayuda"          desc="ver todos los comandos disponibles" />
      </div>

      {/* ── Separator ── */}
      <div style={{ margin: "12px 0" }}>
        <Separator char="─" color="var(--cy-magenta)" />
      </div>

      {/* ── Docker ── */}
      <div style={{ color: "var(--cy-cyan)", fontSize: "13px", marginBottom: "8px" }}>
        Docker
      </div>
      {!docker?.available ? (
        <div style={{ color: "var(--cy-dim)", fontSize: "13px" }}>
          Docker no disponible.
        </div>
      ) : docker.containers.length === 0 ? (
        <div style={{ color: "var(--cy-dim)", fontSize: "13px" }}>
          Sin contenedores activos.
        </div>
      ) : (
        docker.containers.map((c) => <DockerRow key={c.id} container={c} />)
      )}

      {/* ── Bottom separator ── */}
      <div style={{ margin: "12px 0" }}>
        <Separator char="═" color="var(--cy-magenta)" />
      </div>
    </div>
  );
}
