import { useState, useRef, useEffect, useCallback, memo } from "react";
import { MODULE_DEFS, PRESETS } from "../config/modules";
import { useModuleConfig } from "../hooks/useModuleConfig.jsx";

const Y = "#FCEE0A";
const G = "#39FF14";
const C = "var(--nw-accent)";
const M = "#D9027D";
const R = "#ff5555";
const DIM = "#888";

const TABS = ["PRESETS", "MÓDULOS", "GENERAL"];
const MAX_BODY = "min(55vh, 500px)";

function Toggle({ on }) {
  return (
    <span style={{
      width: "28px", height: "14px",
      background: on ? G : "#222",
      borderRadius: "7px",
      position: "relative",
      transition: "background 0.2s",
      flexShrink: 0, display: "inline-block",
    }}>
      <span style={{
        position: "absolute",
        top: "2px", left: on ? "14px" : "2px",
        width: "10px", height: "10px",
        borderRadius: "50%",
        background: on ? "#000" : "#555",
        transition: "left 0.2s",
      }} />
    </span>
  );
}

function SettingsModal({ onClose, onOpenSetup }) {
  const { isEnabled, setModule, setPreset, preset } = useModuleConfig();
  const [tab, setTab] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [bodyH, setBodyH] = useState(null);
  const measRef = useRef(null);
  const switching = useRef(false);
  const [bootEnabled, setBootEnabled] = useState(() => {
    try { return localStorage.getItem("nw-skip-boot") !== "1"; } catch { return true; }
  });

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

  const toggleBoot = () => {
    const next = !bootEnabled;
    setBootEnabled(next);
    try { localStorage.setItem("nw-skip-boot", next ? "0" : "1"); } catch {}
  };

  const panels = Object.entries(MODULE_DEFS).filter(([, d]) => d.category === "panel");
  const features = Object.entries(MODULE_DEFS).filter(([, d]) => d.category === "feature");
  const activeCount = Object.keys(MODULE_DEFS).filter(k => isEnabled(k)).length;

  return (
    <div onClick={onClose} style={{
      position: "absolute", inset: 0, zIndex: 250,
      background: "rgba(0,0,0,0.85)",
      backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#0a0a00", border: `1px solid ${G}`,
        width: "90%", maxWidth: "580px",
        fontFamily: "var(--font-mono)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "14px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", color: G, letterSpacing: "0.12em", fontWeight: 700 }}>SETTINGS</span>
            <span style={{ fontSize: "8px", color: DIM, background: "#111", padding: "2px 8px" }}>
              {activeCount} modulos activos
            </span>
          </div>
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
              borderBottom: tab === i ? `2px solid ${G}` : "2px solid transparent",
              color: tab === i ? G : "#555",
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
          height: bodyH != null ? Math.min(bodyH, 500) : "auto",
          maxHeight: MAX_BODY,
          transition: "height 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <div ref={measRef} style={{ padding: "16px 20px" }}>
            <div style={{
              opacity: phase === "out" ? 0 : phase === "enter-prep" ? 0 : 1,
              transform: phase === "out" ? "translateY(-10px)" : phase === "enter-prep" ? "translateY(14px)" : "translateY(0)",
              transition: phase === "out"
                ? "opacity 0.18s ease-in, transform 0.18s ease-in"
                : "opacity 0.38s cubic-bezier(0.16, 1, 0.3, 1), transform 0.38s cubic-bezier(0.16, 1, 0.3, 1)",
            }}>

              {/* PRESETS TAB */}
              {tab === 0 && (
                <div>
                  <div style={{ fontSize: "9px", color: DIM, marginBottom: "14px" }}>
                    Elige un perfil rapido. Puedes ajustar modulos individuales en la pestaña MÓDULOS.
                  </div>
                  {Object.entries(PRESETS).map(([key, p]) => {
                    const active = preset === key;
                    const moduleCount = key === "minimal" ? 0 : Object.keys(p.modules).filter(k => p.modules[k]).length;
                    return (
                      <div key={key}
                        onClick={() => setPreset(key)}
                        style={{
                          padding: "10px 14px", marginBottom: "6px",
                          background: active ? "#0d0c00" : "#0b0a00",
                          border: `1px solid ${active ? G : "#1a1a00"}`,
                          cursor: "pointer", transition: "border-color 0.15s",
                        }}
                        onMouseOver={e => { if (!active) e.currentTarget.style.borderColor = "#333"; }}
                        onMouseOut={e => { if (!active) e.currentTarget.style.borderColor = "#1a1a00"; }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "11px", color: active ? G : "#ccc", fontWeight: 700 }}>
                            {p.label.toUpperCase()}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "8px", color: DIM }}>{moduleCount} modulos</span>
                            {active && <span style={{ fontSize: "10px", color: G }}>✓</span>}
                          </div>
                        </div>
                        <div style={{ fontSize: "9px", color: DIM, marginTop: "3px" }}>{p.description}</div>
                      </div>
                    );
                  })}
                  <button onClick={onOpenSetup} style={{
                    marginTop: "12px", width: "100%",
                    background: "transparent", border: "1px dashed #333",
                    color: DIM, fontFamily: "var(--font-mono)", fontSize: "9px",
                    padding: "8px", cursor: "pointer", textAlign: "center",
                  }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = Y; e.currentTarget.style.color = Y; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = DIM; }}
                  >Relanzar Setup Wizard completo</button>
                </div>
              )}

              {/* MODULES TAB */}
              {tab === 1 && (
                <div>
                  <div style={{ fontSize: "10px", color: M, letterSpacing: "0.1em", marginBottom: "8px" }}>PANELES</div>
                  {panels.map(([key, def]) => {
                    const on = isEnabled(key);
                    return (
                      <div key={key} onClick={() => setModule(key, !on)} style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "6px 12px", marginBottom: "3px",
                        background: on ? "#0d0c00" : "transparent",
                        border: `1px solid ${on ? G + "33" : "#111"}`,
                        cursor: "pointer", transition: "background 0.15s",
                      }}
                        onMouseOver={e => e.currentTarget.style.background = on ? "#0e0d00" : "#0a0900"}
                        onMouseOut={e => e.currentTarget.style.background = on ? "#0d0c00" : "transparent"}
                      >
                        <Toggle on={on} />
                        <span style={{ fontSize: "10px", color: on ? "#ccc" : "#555", minWidth: "70px" }}>{def.label}</span>
                        <span style={{ fontSize: "8px", color: "#444", flex: 1 }}>{def.description}</span>
                      </div>
                    );
                  })}
                  <div style={{ fontSize: "10px", color: C, letterSpacing: "0.1em", margin: "16px 0 8px" }}>FEATURES</div>
                  {features.map(([key, def]) => {
                    const on = isEnabled(key);
                    return (
                      <div key={key} onClick={() => setModule(key, !on)} style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "6px 12px", marginBottom: "3px",
                        background: on ? "#0d0c00" : "transparent",
                        border: `1px solid ${on ? G + "33" : "#111"}`,
                        cursor: "pointer", transition: "background 0.15s",
                      }}
                        onMouseOver={e => e.currentTarget.style.background = on ? "#0e0d00" : "#0a0900"}
                        onMouseOut={e => e.currentTarget.style.background = on ? "#0d0c00" : "transparent"}
                      >
                        <Toggle on={on} />
                        <span style={{ fontSize: "10px", color: on ? "#ccc" : "#555", minWidth: "100px" }}>{def.label}</span>
                        <span style={{ fontSize: "8px", color: "#444", flex: 1 }}>{def.description}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* GENERAL TAB */}
              {tab === 2 && (
                <div>
                  <div onClick={toggleBoot} style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 12px", marginBottom: "6px",
                    background: "#0b0a00", border: "1px solid #1a1a00", cursor: "pointer",
                  }}>
                    <Toggle on={bootEnabled} />
                    <div>
                      <div style={{ fontSize: "10px", color: "#ccc" }}>Boot Screen</div>
                      <div style={{ fontSize: "8px", color: DIM }}>Animacion de arranque al iniciar</div>
                    </div>
                  </div>

                  <div style={{ padding: "10px 12px", marginBottom: "6px", background: "#0b0a00", border: "1px solid #1a1a00" }}>
                    <div style={{ fontSize: "10px", color: "#ccc", marginBottom: "6px" }}>Almacenamiento</div>
                    <div style={{ fontSize: "9px", color: DIM }}>
                      Config guardada en <span style={{ color: C }}>localStorage</span>
                    </div>
                    <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
                      <button onClick={() => {
                        try {
                          const keys = [];
                          for (let i = 0; i < localStorage.length; i++) {
                            const k = localStorage.key(i);
                            if (k && k.startsWith("nw-") && k !== "nw-module-config") keys.push(k);
                          }
                          keys.forEach(k => localStorage.removeItem(k));
                          sessionStorage.clear();
                        } catch {}
                      }} style={{
                        background: "transparent", border: "1px solid #333",
                        color: DIM, fontFamily: "var(--font-mono)", fontSize: "8px",
                        padding: "4px 10px", cursor: "pointer",
                      }}
                        onMouseOver={e => { e.currentTarget.style.borderColor = Y; e.currentTarget.style.color = Y; }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = DIM; }}
                      >Limpiar cache</button>
                      <button onClick={() => {
                        try { localStorage.removeItem("nw-module-config"); window.location.reload(); } catch {}
                      }} style={{
                        background: "transparent", border: "1px solid #333",
                        color: DIM, fontFamily: "var(--font-mono)", fontSize: "8px",
                        padding: "4px 10px", cursor: "pointer",
                      }}
                        onMouseOver={e => { e.currentTarget.style.borderColor = R; e.currentTarget.style.color = R; }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = DIM; }}
                      >Reset config</button>
                    </div>
                  </div>

                  <div style={{ padding: "10px 12px", background: "#0b0a00", border: "1px solid #1a1a00" }}>
                    <div style={{ fontSize: "10px", color: "#ccc", marginBottom: "6px" }}>Resumen</div>
                    <div style={{ fontSize: "9px", color: DIM, lineHeight: "1.6" }}>
                      <span style={{ color: G }}>{activeCount}</span> modulos activos de {Object.keys(MODULE_DEFS).length}
                      {preset && (<><br />Preset: <span style={{ color: Y }}>{preset}</span></>)}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "8px 20px", borderTop: "1px solid #1a1a00", fontSize: "8px", color: "#333", textAlign: "center" }}>
          <span style={{ color: "#555" }}>Esc</span> o click fuera para cerrar
          {" · "}
          <span style={{ color: "#555" }}>nw config</span> desde terminal
        </div>
      </div>
    </div>
  );
}

export default memo(SettingsModal);
