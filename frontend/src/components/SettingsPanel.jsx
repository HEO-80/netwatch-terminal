import { useState, useEffect, useCallback, useRef, memo } from "react";
import { secureGet, secureSet, secureDelete, isSecureBackend } from "../utils/secure-store";
import WinControls from "./WinControls";
import { useKeyboardNav, KB_HIGHLIGHT } from "../hooks/useKeyboardNav";

const Y   = "#FCEE0A";
const G   = "#39FF14";
const C   = "var(--nw-accent)";
const M   = "#D9027D";
const DIM = "#546E7A";
const BG  = "#080700";

const KEY_DEFS = [
  { id: "gemini-key",   label: "Gemini API Key",   provider: "Google AI",  color: C,  placeholder: "AIza...", masked: true },
  { id: "claude-key",   label: "Claude API Key",   provider: "Anthropic",  color: M,  placeholder: "sk-ant-...", masked: true },
  { id: "github-token", label: "GitHub Token",      provider: "GitHub",     color: G,  placeholder: "ghp_...", masked: true },
  { id: "github-user",  label: "GitHub Username",   provider: "GitHub",     color: G,  placeholder: "HEO-80", masked: false },
];

function mask(val) {
  if (!val || val.length < 8) return "••••••••";
  return val.slice(0, 4) + "•".repeat(Math.min(val.length - 8, 20)) + val.slice(-4);
}

function SettingsPanel({ open, focused, onFocus, onOverlay, minimized, onMinimize }) {
  const [values, setValues]     = useState({});
  const [editing, setEditing]   = useState(null);
  const [editVal, setEditVal]   = useState("");
  const [saving, setSaving]     = useState(false);
  const [secure, setSecure]     = useState(false);
  const [hovered, setHovered]   = useState(false);
  const inputRef = useRef(null);
  const [kbIndex] = useKeyboardNav("settings", KEY_DEFS.length, focused);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const loaded = {};
      for (const def of KEY_DEFS) {
        loaded[def.id] = await secureGet(def.id);
      }
      if (!cancelled) {
        setValues(loaded);
        setSecure(isSecureBackend());
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 50);
  }, [editing]);

  const startEdit = useCallback((id) => {
    setEditing(id);
    setEditVal(values[id] || "");
  }, [values]);

  const saveKey = useCallback(async () => {
    if (!editing) return;
    setSaving(true);
    const trimmed = editVal.trim();
    if (trimmed) {
      await secureSet(editing, trimmed);
    } else {
      await secureDelete(editing);
    }
    setValues(prev => ({ ...prev, [editing]: trimmed }));
    setEditing(null);
    setEditVal("");
    setSaving(false);
  }, [editing, editVal]);

  const cancelEdit = useCallback(() => {
    setEditing(null);
    setEditVal("");
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") saveKey();
    if (e.key === "Escape") cancelEdit();
  }, [saveKey, cancelEdit]);

  useEffect(() => {
    if (!focused) return;
    const onAction = (e) => {
      if (e.detail.panel !== "settings") return;
      const def = KEY_DEFS[kbIndex];
      if (!def) return;
      if (e.detail.action === "enter" || e.detail.action === "edit") startEdit(def.id);
      if (e.detail.action === "delete" && values[def.id]) {
        secureDelete(def.id);
        setValues(prev => ({ ...prev, [def.id]: "" }));
      }
    };
    window.addEventListener("nw-panel-action", onAction);
    return () => window.removeEventListener("nw-panel-action", onAction);
  }, [focused, kbIndex, startEdit, values]);

  if (!open) return null;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
      width: focused ? 420 : 310, minWidth: focused ? 420 : 310, maxWidth: focused ? 420 : 310,
      background: BG, borderLeft: "1px solid #D9027D",
      display: "flex", flexDirection: "column",
      fontFamily: "var(--font-mono)", overflow: "hidden",
      transition: "width 0.2s ease, min-width 0.2s ease, box-shadow 0.2s ease",
      boxShadow: hovered ? "0 0 12px rgba(217, 2, 125, 0.3)" : "none",
    }}>
      {/* Header */}
      <div style={{
        padding: "8px 12px", background: "#0a0900",
        borderBottom: "1px solid #1a1a00",
        display: "flex", alignItems: "center", gap: "8px",
      }} onDoubleClick={onOverlay}>
        <span style={{ fontSize: "10px", color: Y, letterSpacing: "0.1em", cursor: "pointer" }} onClick={onFocus}>
          ◈ SETTINGS {focused ? "⊟" : ""}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{
          fontSize: "8px", padding: "1px 6px",
          background: secure ? "#0d1a0d" : "#1a0d00",
          border: `1px solid ${secure ? "#1a3a1a" : "#3a1a00"}`,
          color: secure ? G : "#ff8800",
        }}>
          {secure ? "TAURI STORE" : "LOCAL STORAGE"}
        </span>
        <WinControls minimized={minimized} onMinimize={onMinimize} onOverlay={onOverlay} color={Y} dim={DIM} />
      </div>

      {!minimized && <>
      {/* Keys list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
        <div style={{ fontSize: "9px", color: DIM, marginBottom: "12px", lineHeight: "1.5" }}>
          API keys almacenadas de forma {secure ? "segura en Tauri Store" : "local en el navegador"}.
          {!secure && (
            <span style={{ color: "#ff8800", display: "block", marginTop: "4px" }}>
              En modo dev, las keys se guardan en localStorage.
            </span>
          )}
        </div>

        {KEY_DEFS.map((def, i) => {
          const val = values[def.id] || "";
          const isEditing = editing === def.id;

          return (
            <div key={def.id} style={{
              marginBottom: "12px", padding: "8px 10px",
              background: "#0b0a00",
              border: `1px solid ${isEditing ? def.color : "#1a1a00"}`,
              transition: "border-color 0.15s",
              ...(kbIndex === i ? KB_HIGHLIGHT : {}),
            }}>
              {/* Label row */}
              <div style={{
                display: "flex", alignItems: "center", gap: "6px",
                marginBottom: "6px",
              }}>
                <span style={{
                  fontSize: "7px", color: def.color,
                }}>●</span>
                <span style={{ fontSize: "10px", color: "#E8E8E8" }}>
                  {def.label}
                </span>
                <span style={{ fontSize: "8px", color: DIM }}>
                  {def.provider}
                </span>
              </div>

              {isEditing ? (
                <div style={{ display: "flex", gap: "4px" }}>
                  <input
                    ref={inputRef}
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={def.placeholder}
                    type={def.masked ? "password" : "text"}
                    style={{
                      flex: 1, background: "#080700",
                      border: `1px solid ${def.color}44`,
                      color: "#E8E8E8", fontFamily: "var(--font-mono)",
                      fontSize: "10px", padding: "3px 6px", outline: "none",
                    }}
                  />
                  <button
                    onClick={saveKey}
                    disabled={saving}
                    style={{
                      background: G, border: "none", color: "#000",
                      fontFamily: "var(--font-mono)", fontSize: "8px",
                      padding: "2px 8px", cursor: "pointer",
                    }}
                  >SAVE</button>
                  <button
                    onClick={cancelEdit}
                    style={{
                      background: "transparent", border: `1px solid #333`,
                      color: "#555", fontFamily: "var(--font-mono)",
                      fontSize: "8px", padding: "2px 6px", cursor: "pointer",
                    }}
                  >ESC</button>
                </div>
              ) : (
                <div style={{
                  display: "flex", alignItems: "center", gap: "6px",
                }}>
                  <span style={{
                    flex: 1, fontSize: "10px",
                    color: val ? "#888" : DIM,
                    letterSpacing: val ? "0.05em" : "normal",
                  }}>
                    {val ? (def.masked ? mask(val) : val) : "no configurada"}
                  </span>
                  <button
                    onClick={() => startEdit(def.id)}
                    style={{
                      background: "transparent",
                      border: `1px solid ${val ? "#1a1a00" : def.color}`,
                      color: val ? DIM : def.color,
                      fontFamily: "var(--font-mono)", fontSize: "8px",
                      padding: "1px 7px", cursor: "pointer",
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.borderColor = def.color;
                      e.currentTarget.style.color = def.color;
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.borderColor = val ? "#1a1a00" : def.color;
                      e.currentTarget.style.color = val ? DIM : def.color;
                    }}
                  >{val ? "EDIT" : "SET"}</button>
                  {val && (
                    <button
                      onClick={async () => {
                        await secureDelete(def.id);
                        setValues(prev => ({ ...prev, [def.id]: "" }));
                      }}
                      style={{
                        background: "transparent", border: "1px solid #1a1a00",
                        color: "#333", fontFamily: "var(--font-mono)",
                        fontSize: "8px", padding: "1px 6px", cursor: "pointer",
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.borderColor = "#ff5555";
                        e.currentTarget.style.color = "#ff5555";
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.borderColor = "#1a1a00";
                        e.currentTarget.style.color = "#333";
                      }}
                    >DEL</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer hints */}
      <div style={{
        padding: "6px 12px", background: "#080700",
        borderTop: "1px solid #1a1a00",
        fontSize: "8px", color: "#1a2a1a",
        display: "flex", flexDirection: "column", gap: "2px",
      }}>
        <span><span style={{ color: Y }}>nw config</span> abrir desde terminal</span>
        <span><span style={{ color: DIM }}>Alt+P</span> ciclar paneles</span>
      </div>
      </>}
    </div>
  );
}

export default memo(SettingsPanel);
