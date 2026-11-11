import { useState, useRef, useEffect, useCallback, memo } from "react";

const Y = "#FCEE0A";
const G = "#39FF14";
const C = "var(--nw-accent)";
const M = "#D9027D";
const R = "#ff5555";
const DIM = "#888";

const TABS = ["ATAJOS", "COMANDOS NW", "PANELES", "ACERCA"];

const SHORTCUTS = [
  { title: "TERMINAL", color: G, keys: [
    ["Alt+T", "Nueva terminal PowerShell"],
    ["Alt+W", "Cerrar tab actual"],
    ["Alt+D", "Ir a Dashboard"],
    ["Alt+1-9", "Saltar a tab por numero"],
    ["Ctrl+Shift+P", "Paleta de comandos"],
  ]},
  { title: "PANELES", color: M, keys: [
    ["Alt+I", "Toggle panel INFRA"],
    ["Alt+A", "Toggle panel AI"],
    ["Alt+M", "Toggle panel METRICS"],
    ["Alt+P", "Ciclar panel derecho"],
    ["Alt+V", "Clipboard manager"],
  ]},
  { title: "FOCUS (fuera de terminal)", color: C, keys: [
    ["F1", "Focus panel izquierdo (INFRA)"],
    ["F2", "Focus panel derecho"],
    ["F3", "Focus panel superior (AI)"],
    ["F4", "Focus panel inferior (METRICS)"],
    ["F5", "Volver a la terminal"],
    ["Tab / Shift+Tab", "Ciclar entre paneles abiertos"],
    ["Ctrl+F2", "Ciclar paneles derechos"],
    ["Esc", "Cerrar overlay / quitar focus"],
  ]},
  { title: "DENTRO DE PANEL", color: Y, keys: [
    ["↑ / ↓", "Navegar entre elementos"],
    ["Enter", "Ejecutar accion principal"],
    ["Space", "Expandir / colapsar"],
    ["c", "Copiar (IP, precio, path, linea)"],
    ["o", "Abrir en navegador"],
    ["e", "Editar"],
    ["d", "Eliminar / desconectar"],
    ["r", "Refrescar datos del panel"],
    ["m", "Minimizar panel"],
    ["x", "Maximizar panel (overlay)"],
    ["[ / ]", "Ciclar al panel anterior / siguiente"],
  ]},
  { title: "GENERAL", color: R, keys: [
    ["? / F12", "Abrir esta ayuda"],
  ]},
];

const NW_COMMANDS = [
  { cmd: "nw help", desc: "Lista todos los comandos disponibles" },
  { cmd: "nw status", desc: "Info del sistema, puertos activos, repos" },
  { cmd: "nw eth", desc: "Precios BTC/ETH + gas fee ETH" },
  { cmd: "nw repos", desc: "Lista repos git con rama y estado" },
  { cmd: "nw ssh", desc: "Servidores SSH guardados, conectar" },
  { cmd: "nw snip", desc: "Snippets: guardar, listar, ejecutar" },
  { cmd: "nw deploy", desc: "Wizard de deploy (Tauri/Next/Docker)" },
  { cmd: "nw ai <pregunta>", desc: "Chat con AI desde la terminal" },
  { cmd: "nw clip", desc: "Historial de clipboard" },
  { cmd: "nw config", desc: "Ver/modificar configuracion de modulos" },
  { cmd: "nw config on/off <key>", desc: "Activar/desactivar un modulo" },
  { cmd: "nw config preset <name>", desc: "Aplicar un preset de config" },
  { cmd: "nw config reset", desc: "Resetear toda la configuracion" },
  { cmd: "nw setup", desc: "Relanzar el wizard de configuracion" },
  { cmd: "nw perf", desc: "Metricas de rendimiento (uptime, heap, modulos)" },
  { cmd: "nw storage", desc: "Uso de localStorage por modulo" },
  { cmd: "nw storage clean", desc: "Limpiar cache y datos temporales" },
];

const PANELS_INFO = [
  { name: "INFRA", color: M, shortcut: "Alt+I", desc: "SSH servers, puertos activos, Kubernetes, Terraform, GitHub activity" },
  { name: "AI", color: G, shortcut: "Alt+A", desc: "Chat multi-provider (Ollama local, Gemini, Claude). Comandos rapidos: /code, /git, /explain" },
  { name: "METRICS", color: G, shortcut: "Alt+M", desc: "CPU, RAM, disco, red en tiempo real con sparklines y barras. Refresh cada 3s" },
  { name: "CRYPTO", color: C, shortcut: "Alt+P", desc: "Precios BTC/ETH, gas ETH, Docker containers, MEV bots status" },
  { name: "GIT", color: M, shortcut: "Alt+P", desc: "Repo actual: archivos modificados, diff inline, ramas" },
  { name: "TASKS", color: Y, shortcut: "Alt+P", desc: "Kanban de tareas: pendiente → en curso → hecho. Persistente en localStorage" },
  { name: "NOTES", color: G, shortcut: "Alt+P", desc: "Notas rapidas con pin, copy, export. Guardadas en localStorage" },
  { name: "LOGS", color: R, shortcut: "Alt+P", desc: "Logs del sistema con filtro por nivel, busqueda y scroll virtualizado" },
  { name: "SETTINGS", color: M, shortcut: "Alt+P", desc: "Gestion de API keys (Gemini, Claude, GitHub). Almacenamiento seguro con Tauri Store" },
];

const MAX_BODY = "min(55vh, 500px)";

function TabContent({ tab }) {
  if (tab === 0) return SHORTCUTS.map(section => (
    <div key={section.title} style={{ marginBottom: "14px" }}>
      <div style={{
        color: section.color, fontSize: "9px", letterSpacing: "0.12em",
        marginBottom: "6px", borderBottom: `1px solid ${section.color}33`, paddingBottom: "3px",
      }}>{section.title}</div>
      {section.keys.map(([key, desc]) => (
        <div key={key} style={{ display: "flex", gap: "12px", padding: "2px 0", fontSize: "10px" }}>
          <span style={{ color: Y, minWidth: "130px", flexShrink: 0 }}>{key}</span>
          <span style={{ color: "#888" }}>{desc}</span>
        </div>
      ))}
    </div>
  ));
  if (tab === 1) return (
    <div>
      <div style={{ fontSize: "9px", color: DIM, marginBottom: "12px" }}>
        Escribe estos comandos en cualquier terminal. Todos empiezan por <span style={{ color: Y }}>nw</span>.
      </div>
      {NW_COMMANDS.map(({ cmd, desc }) => (
        <div key={cmd} style={{ display: "flex", gap: "12px", padding: "4px 0", fontSize: "10px", borderBottom: "1px solid #111" }}>
          <span style={{ color: G, minWidth: "180px", flexShrink: 0 }}>{cmd}</span>
          <span style={{ color: "#888" }}>{desc}</span>
        </div>
      ))}
    </div>
  );
  if (tab === 2) return (
    <div>
      <div style={{ fontSize: "9px", color: DIM, marginBottom: "12px" }}>
        Los paneles laterales se activan con <span style={{ color: Y }}>nw config</span> o desde Settings.
        Click en uno desactivado lo activa automaticamente.
      </div>
      {PANELS_INFO.map(p => (
        <div key={p.name} style={{ padding: "8px 12px", marginBottom: "6px", background: "#0b0a00", border: "1px solid #1a1a00" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ color: p.color, fontSize: "10px", fontWeight: 700 }}>{p.name}</span>
            <span style={{ fontSize: "8px", color: Y, background: "#1a1a00", padding: "1px 6px" }}>{p.shortcut}</span>
          </div>
          <div style={{ fontSize: "9px", color: DIM, lineHeight: "1.4" }}>{p.desc}</div>
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ textAlign: "center", padding: "24px 0" }}>
      <div style={{ fontSize: "24px", color: Y, letterSpacing: "0.2em", fontWeight: 700, marginBottom: "8px" }}>NETWATCH TERMINAL</div>
      <div style={{ fontSize: "10px", color: DIM, marginBottom: "20px" }}>Version 2.0.77 — Cyberpunk workstation</div>
      <div style={{ fontSize: "9px", color: "#555", lineHeight: "1.6", maxWidth: "400px", margin: "0 auto" }}>
        Terminal de escritorio con estetica Cyberpunk 2077.
        Multi-shell (PowerShell, WSL, CMD), paneles de monitorizacion,
        chat AI multi-provider, metricas en tiempo real, y sistema de comandos propio.
      </div>
      <div style={{ marginTop: "20px", fontSize: "9px" }}>
        <span style={{ color: G }}>Autor:</span>{" "}<span style={{ color: "#ccc" }}>Hector Oviedo Blasco (HEO-80)</span>
      </div>
      <div style={{ marginTop: "6px", fontSize: "9px" }}>
        <span style={{ color: G }}>Stack:</span>{" "}<span style={{ color: "#ccc" }}>Tauri v2 + React + xterm.js</span>
      </div>
    </div>
  );
}

function HelpModal({ onClose }) {
  const [tab, setTab] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [bodyH, setBodyH] = useState(null);
  const measRef = useRef(null);
  const switching = useRef(false);

  const measure = useCallback(() => {
    if (measRef.current) setBodyH(measRef.current.scrollHeight);
  }, []);

  useEffect(() => { measure(); }, [tab, measure]);

  const switchTab = (i) => {
    if (i === tab || switching.current) return;
    switching.current = true;
    setPhase("out");
    setTimeout(() => {
      setTab(i);
      setPhase("enter-prep");
      requestAnimationFrame(() => {
        setPhase("in");
        setTimeout(() => { setPhase("idle"); switching.current = false; }, 420);
      });
    }, 200);
  };

  return (
    <div onClick={onClose} style={{
      position: "absolute", inset: 0, zIndex: 250,
      background: "rgba(0,0,0,0.85)",
      backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#0a0a00", border: `1px solid ${C}`,
        width: "90%", maxWidth: "640px",
        fontFamily: "var(--font-mono)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: C, letterSpacing: "0.12em", fontWeight: 700 }}>? HELP</span>
          <span onClick={onClose} style={{ color: "#555", cursor: "pointer", fontSize: "14px" }}
            onMouseOver={e => e.currentTarget.style.color = R}
            onMouseOut={e => e.currentTarget.style.color = "#555"}
          >×</span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", padding: "12px 20px 0", borderBottom: "1px solid #1a1a00" }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => switchTab(i)} style={{
              background: "transparent", border: "none",
              borderBottom: tab === i ? `2px solid ${C}` : "2px solid transparent",
              color: tab === i ? C : "#555",
              fontFamily: "var(--font-mono)", fontSize: "9px",
              padding: "6px 14px", cursor: "pointer",
              letterSpacing: "0.08em", transition: "color 0.15s",
            }}
              onMouseOver={e => { if (tab !== i) e.currentTarget.style.color = "#888"; }}
              onMouseOut={e => { if (tab !== i) e.currentTarget.style.color = "#555"; }}
            >{t}</button>
          ))}
        </div>

        {/* Body — height animates the modal border */}
        <div style={{
          overflow: "hidden",
          height: bodyH != null ? Math.min(bodyH, parseInt(MAX_BODY) || 500) : "auto",
          maxHeight: MAX_BODY,
          transition: phase === "idle" || phase === "out"
            ? "height 0.45s cubic-bezier(0.16, 1, 0.3, 1)"
            : "height 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <div ref={measRef} style={{ padding: "16px 20px", overflowY: bodyH != null && bodyH > 500 ? "auto" : "visible" }}>
            <div style={{
              opacity: phase === "out" ? 0 : phase === "enter-prep" ? 0 : 1,
              transform: phase === "out" ? "translateY(-10px)" : phase === "enter-prep" ? "translateY(14px)" : "translateY(0)",
              transition: phase === "out"
                ? "opacity 0.18s ease-in, transform 0.18s ease-in"
                : "opacity 0.38s cubic-bezier(0.16, 1, 0.3, 1), transform 0.38s cubic-bezier(0.16, 1, 0.3, 1)",
            }}>
              <TabContent tab={tab} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "8px 20px", borderTop: "1px solid #1a1a00", fontSize: "8px", color: "#333", textAlign: "center" }}>
          <span style={{ color: "#555" }}>Esc</span> o click fuera para cerrar
        </div>
      </div>
    </div>
  );
}

export default memo(HelpModal);
