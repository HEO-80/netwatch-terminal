import { memo } from "react";
import { invoke } from "@tauri-apps/api/core";

const G = "#39FF14";
const C = "var(--nw-accent)";

function TitleBar({ title = "NETWATCH OS V2.077", subtitle = "HEO-80", activeTabLabel, onOpenHelp, onOpenSettings }) {

  const handleClose    = (e) => { e.stopPropagation(); invoke("close_window").catch(() => {}); };
  const handleMinimize = (e) => { e.stopPropagation(); invoke("minimize_window").catch(() => {}); };
  const handleMaximize = (e) => { e.stopPropagation(); invoke("maximize_window").catch(() => {}); };

  return (
    <div
      data-tauri-drag-region
      style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "0 16px",
        background: "#000000",
        borderBottom: "1px solid var(--nw-accent)",
        flexShrink: 0, height: "40px",
        userSelect: "none",
        WebkitAppRegion: "drag",
      }}
    >
      {/* Dots — zona NO drag */}
      <div
        style={{ display: "flex", gap: "6px", WebkitAppRegion: "no-drag" }}
        onClick={e => e.stopPropagation()}
      >
        {[
          { color: "#ff5555", action: handleClose,    title: "Cerrar" },
          { color: "#ffcb6b", action: handleMinimize, title: "Minimizar" },
          { color: "#4ec994", action: handleMaximize, title: "Maximizar" },
        ].map((dot, i) => (
          <span
            key={i}
            onClick={dot.action}
            title={dot.title}
            style={{
              width: 12, height: 12, borderRadius: "50%",
              background: dot.color, cursor: "pointer",
              display: "inline-block", flexShrink: 0,
              transition: "filter 0.15s",
              WebkitAppRegion: "no-drag",
            }}
            onMouseOver={e => e.currentTarget.style.filter = "brightness(1.4)"}
            onMouseOut={e => e.currentTarget.style.filter = "brightness(1)"}
          />
        ))}
      </div>

      <div style={{ width: 1, height: 18, background: "#1a1a1a", WebkitAppRegion: "no-drag" }}/>

      {/* Icono */}
      <span style={{ color: "var(--nw-accent)", fontSize: "11px", opacity: 0.6 }}>▣</span>

      {/* Título — zona drag */}
      <span
        data-tauri-drag-region
        style={{
          flex: 1, textAlign: "center",
          fontSize: "11px", color: "#FCEE0A",
          letterSpacing: "0.18em", textTransform: "uppercase",
          fontFamily: "var(--font-mono)", fontWeight: 700,
          cursor: "grab",
          WebkitAppRegion: "drag",
        }}
      >
        {title}
        <span style={{ color: "#666", margin: "0 8px" }}>·</span>
        <span style={{ color: "#39FF14" }}>{subtitle}</span>
        {activeTabLabel && (
          <span style={{ color: "#888", marginLeft: 12, fontSize: "10px", fontWeight: 400 }}>
            — {activeTabLabel}
          </span>
        )}
      </span>

      {/* Botones HELP + SETTINGS */}
      <div style={{
        display: "flex", gap: "6px", alignItems: "center",
        WebkitAppRegion: "no-drag",
      }}>
        <button
          onClick={onOpenHelp}
          title="Ayuda, atajos y comandos"
          style={{
            background: "transparent",
            border: `1px solid ${C}`,
            color: C,
            fontFamily: "var(--font-mono)", fontSize: "9px",
            padding: "3px 10px", cursor: "pointer",
            letterSpacing: "0.06em",
            transition: "all 0.15s",
            WebkitAppRegion: "no-drag",
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = `${C}`;
            e.currentTarget.style.color = "#000";
            e.currentTarget.style.boxShadow = `0 0 8px rgba(0, 240, 255, 0.4)`;
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = C;
            e.currentTarget.style.boxShadow = "none";
          }}
        >? HELP</button>

        <button
          onClick={onOpenSettings}
          title="Configuracion de modulos y opciones"
          style={{
            background: "transparent",
            border: `1px solid ${G}`,
            color: G,
            fontFamily: "var(--font-mono)", fontSize: "9px",
            padding: "3px 10px", cursor: "pointer",
            letterSpacing: "0.06em",
            fontWeight: 700,
            transition: "all 0.15s",
            WebkitAppRegion: "no-drag",
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = G;
            e.currentTarget.style.color = "#000";
            e.currentTarget.style.boxShadow = `0 0 10px rgba(57, 255, 20, 0.5)`;
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = G;
            e.currentTarget.style.boxShadow = "none";
          }}
        >SETTINGS</button>
      </div>
    </div>
  );
}

export default memo(TitleBar);
