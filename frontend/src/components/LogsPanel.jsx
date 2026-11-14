import WinControls from "./WinControls";
import { useKeyboardNav, KB_HIGHLIGHT } from "../hooks/useKeyboardNav";
import { useState,useEffect, useCallback, useRef, useMemo, memo } from "react";

const Y   = "#FCEE0A";
const G   = "#39FF14";
const C   = "var(--nw-accent)";
const M   = "#D9027D";
const R   = "#ff5555";
const DIM = "#888";

const MAX_LINES = 500;

async function invoke(cmd, args) {
  try {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    return await tauriInvoke(cmd, args);
  } catch { return null; }
}

const SEVERITY = {
  error: { color: R,   label: "ERR", order: 0 },
  warn:  { color: Y,   label: "WRN", order: 1 },
  info:  { color: C,   label: "INF", order: 2 },
  debug: { color: DIM, label: "DBG", order: 3 },
};

function classifyLine(text) {
  const lower = text.toLowerCase();
  if (lower.includes("error") || lower.includes("fatal") || lower.includes("exception") || lower.includes("panic"))
    return "error";
  if (lower.includes("warn") || lower.includes("warning"))
    return "warn";
  if (lower.includes("debug") || lower.includes("trace") || lower.includes("verbose"))
    return "debug";
  return "info";
}

function LogLine({ entry }) {
  const sev = SEVERITY[entry.severity] || SEVERITY.info;
  return (
    <div style={{
      display: "flex", gap: "6px", padding: "1px 0",
      fontFamily: "var(--font-mono)", fontSize: "9px", lineHeight: "1.5",
    }}>
      <span style={{
        color: "#777", fontSize: "8px", flexShrink: 0, width: "38px", textAlign: "right",
      }}>{entry.time}</span>
      <span style={{
        color: sev.color, fontSize: "8px", flexShrink: 0, width: "22px",
        fontWeight: 700, textAlign: "center",
      }}>{sev.label}</span>
      <span style={{
        color: entry.severity === "error" ? R : entry.severity === "warn" ? "#cca" : "#888",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0,
      }}>{entry.text}</span>
    </div>
  );
}

const SOURCES_KEY = "nw-log-sources";

function loadSources() {
  try { return JSON.parse(localStorage.getItem(SOURCES_KEY) || "[]"); } catch { return []; }
}
function saveSources(s) { localStorage.setItem(SOURCES_KEY, JSON.stringify(s)); }

const DEFAULT_SOURCES = [
  { id: "sys", label: "System Events", type: "powershell",
    command: "Get-WinEvent -LogName System -MaxEvents 20 | Select-Object TimeCreated,LevelDisplayName,Message | ForEach-Object { \"$($_.TimeCreated.ToString('HH:mm:ss'))|$($_.LevelDisplayName)|$($_.Message -replace '\\r?\\n',' ' -replace '\\|','/')\" }" },
  { id: "app", label: "Application Events", type: "powershell",
    command: "Get-WinEvent -LogName Application -MaxEvents 20 | Select-Object TimeCreated,LevelDisplayName,Message | ForEach-Object { \"$($_.TimeCreated.ToString('HH:mm:ss'))|$($_.LevelDisplayName)|$($_.Message -replace '\\r?\\n',' ' -replace '\\|','/')\" }" },
];

function parseEventLines(raw) {
  if (!raw) return [];
  return raw.split("\n").filter(l => l.trim()).map(line => {
    const parts = line.split("|");
    const time = parts[0]?.trim() || "";
    const levelRaw = (parts[1]?.trim() || "").toLowerCase();
    const text = parts.slice(2).join("|").trim();
    let severity = "info";
    if (levelRaw.includes("error") || levelRaw.includes("critical")) severity = "error";
    else if (levelRaw.includes("warn")) severity = "warn";
    else if (levelRaw.includes("verbose") || levelRaw.includes("debug")) severity = "debug";
    const key = `${time}|${severity}|${text || line}`;
    return { id: key, time, severity, text: text || line };
  });
}

function LogsPanel({ open, focused, onFocus, onOverlay, minimized, onMinimize }) {
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState({ error: true, warn: true, info: true, debug: false });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [source, setSource] = useState("sys");
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [hovered, setHovered] = useState(false);
  const listRef = useRef(null);
  const timerRef = useRef(null);

  const fetchLogs = useCallback(async () => {
    const src = DEFAULT_SOURCES.find(s => s.id === source);
    if (!src) return;
    setLoading(true);
    const res = await invoke("run_powershell", { command: src.command });
    const lines = parseEventLines(res?.stdout);
    setEntries(prev => {
      const seen = new Set(prev.map(e => e.id));
      const fresh = lines.filter(l => !seen.has(l.id));
      if (fresh.length === 0) return prev;
      return [...prev, ...fresh].slice(-MAX_LINES);
    });
    setLoading(false);
  }, [source]);

  useEffect(() => {
    if (!open || paused) { clearInterval(timerRef.current); return; }
    setEntries([]);
    fetchLogs();
    timerRef.current = setInterval(fetchLogs, 15000);
    return () => clearInterval(timerRef.current);
  }, [open, source, paused, fetchLogs]);

  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(300);
  const ROW_H = 22;
  const BUFFER = 8;

  const handleScroll = useCallback(() => {
    if (!listRef.current) return;
    const el = listRef.current;
    setScrollTop(el.scrollTop);
    setViewH(el.clientHeight);
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  }, []);

  const filtered = useMemo(() => entries.filter(e => {
    if (!filter[e.severity]) return false;
    if (debouncedSearch && !e.text.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
    return true;
  }), [entries, filter, debouncedSearch]);

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ROW_H) - BUFFER);
    const end = Math.min(filtered.length, Math.ceil((scrollTop + viewH) / ROW_H) + BUFFER);
    return { start, end };
  }, [scrollTop, viewH, filtered.length]);

  const [kbIndex, setKbIndex] = useKeyboardNav("logs", filtered.length, focused);
  const kbIdx = filtered.length > 0 ? Math.min(kbIndex, filtered.length - 1) : -1;

  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;
  const kbIdxRef = useRef(kbIdx);
  kbIdxRef.current = kbIdx;

  // Mantener la fila seleccionada visible
  useEffect(() => {
    const el = listRef.current;
    if (!focused || kbIdx < 0 || !el) return;
    const top = kbIdx * ROW_H;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (top + ROW_H > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW_H - el.clientHeight;
  }, [kbIdx, focused]);

  useEffect(() => {
    if (!focused) return;
    const onAction = (e) => {
      if (e.detail.panel !== "logs") return;
      if (e.detail.action !== "copy") return;
      const entry = filteredRef.current[kbIdxRef.current];
      if (entry) navigator.clipboard?.writeText(`${entry.time} ${SEVERITY[entry.severity]?.label || ""} ${entry.text}`.trim());
    };
    window.addEventListener("nw-panel-action", onAction);
    return () => window.removeEventListener("nw-panel-action", onAction);
  }, [focused]);

  const counts = { error: 0, warn: 0, info: 0, debug: 0 };
  entries.forEach(e => counts[e.severity]++);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
      width:      open ? (focused ? "400px" : "260px") : "0px",
      minWidth:   open ? (focused ? "400px" : "260px") : "0px",
      overflow:   "hidden",
      background: "#020200",
      borderLeft: open ? `1px solid ${R}` : "none",
      flexShrink: 0,
      transition: "width 0.2s ease, min-width 0.2s ease, box-shadow 0.2s ease",
      display:    "flex",
      flexDirection: "column",
      boxShadow: hovered && open ? "0 0 12px rgba(255, 85, 85, 0.3)" : "none",
    }}>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", height: minimized ? "28px" : "100%", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "12px 10px 0 10px" }} onDoubleClick={onOverlay}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", cursor: "pointer" }} onClick={onFocus}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: R, letterSpacing: "0.1em" }}>
                ◈ LOGS {focused ? "⊟" : ""}
              </span>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span
                  onClick={() => setPaused(p => !p)}
                  title={paused ? "Reanudar" : "Pausar"}
                  style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: paused ? Y : DIM, cursor: "pointer" }}
                >{paused ? "▶" : "⏸"}</span>
                <span
                  onClick={() => setEntries([])}
                  title="Limpiar"
                  style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: DIM, cursor: "pointer" }}
                  onMouseOver={e => e.currentTarget.style.color = R}
                  onMouseOut={e => e.currentTarget.style.color = DIM}
                >⌧</span>
                <span
                  onClick={fetchLogs}
                  title="Refrescar"
                  style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: loading ? DIM : R, cursor: "pointer" }}
                >{loading ? "···" : "↺"}</span>
                <WinControls minimized={minimized} onMinimize={onMinimize} onOverlay={onOverlay} color={R} dim={DIM} />
              </div>
            </div>

            {!minimized && <>
            {/* Source selector */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
              {DEFAULT_SOURCES.map(s => (
                <button key={s.id}
                  onClick={() => setSource(s.id)}
                  style={{
                    background: source === s.id ? "#1a0000" : "transparent",
                    border: `1px solid ${source === s.id ? R + "66" : "#2a2a2a"}`,
                    color: source === s.id ? R : "#888",
                    fontFamily: "var(--font-mono)", fontSize: "8px",
                    padding: "1px 6px", cursor: "pointer",
                  }}
                >{s.label.split(" ")[0]}</button>
              ))}
            </div>

            {/* Severity filters */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
              {Object.entries(SEVERITY).map(([key, sev]) => (
                <button key={key}
                  onClick={() => setFilter(f => ({ ...f, [key]: !f[key] }))}
                  style={{
                    background: filter[key] ? sev.color + "18" : "transparent",
                    border: `1px solid ${filter[key] ? sev.color + "55" : "#2a2a2a"}`,
                    color: filter[key] ? sev.color : "#777",
                    fontFamily: "var(--font-mono)", fontSize: "8px",
                    padding: "1px 5px", cursor: "pointer",
                  }}
                >{sev.label} {counts[key] > 0 ? counts[key] : ""}</button>
              ))}
            </div>

            {/* Search */}
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="buscar..."
              style={{
                width: "100%", background: "#0a0a00", border: "1px solid #1a1a00",
                color: "#ccc", fontFamily: "var(--font-mono)", fontSize: "9px",
                padding: "3px 6px", outline: "none", marginBottom: "4px",
              }}
            />
            </>}
          </div>

          {!minimized && <>
          {/* Log entries */}
          <div
            ref={listRef}
            onScroll={handleScroll}
            style={{ flex: 1, overflowY: "auto", padding: "4px 10px" }}
          >
            {filtered.length === 0 ? (
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: "9px", color: "#777",
                textAlign: "center", marginTop: "20px",
              }}>
                {loading ? "Cargando logs..." : entries.length === 0 ? "Sin logs todavia." : "Sin resultados para el filtro."}
              </div>
            ) : (
              <div style={{ height: filtered.length * ROW_H, position: "relative" }}>
                {filtered.slice(visibleRange.start, visibleRange.end).map((entry, i) => {
                  const idx = visibleRange.start + i;
                  return (
                  <div key={entry.id} style={{ position: "absolute", top: idx * ROW_H, left: 0, right: 0, height: ROW_H, overflow: "hidden", ...(focused && idx === kbIdx ? KB_HIGHLIGHT : {}) }}>
                    <LogLine entry={entry} />
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: "4px 10px", borderTop: "1px solid #1a1a00",
            fontFamily: "var(--font-mono)", fontSize: "8px", color: "#777",
            display: "flex", justifyContent: "space-between",
          }}>
            <span>{filtered.length}/{entries.length} lineas</span>
            <span style={{ color: autoScroll ? G : "#777" }}>
              {autoScroll ? "auto-scroll ↓" : "scroll manual"}
            </span>
          </div>
          </>}
        </div>
      )}
    </div>
  );
}

export default memo(LogsPanel);
