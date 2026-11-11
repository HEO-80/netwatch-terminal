import { useState, useEffect, useCallback, useRef } from "react";

const Y   = "#FCEE0A";
const G   = "#39FF14";
const C   = "var(--nw-accent)";
const M   = "#D9027D";
const R   = "#ff5555";
const DIM = "#444";

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
        color: "#222", fontSize: "8px", flexShrink: 0, width: "38px", textAlign: "right",
      }}>{entry.time}</span>
      <span style={{
        color: sev.color, fontSize: "8px", flexShrink: 0, width: "22px",
        fontWeight: 700, textAlign: "center",
      }}>{sev.label}</span>
      <span style={{
        color: entry.severity === "error" ? R : entry.severity === "warn" ? "#cca" : "#888",
        whiteSpace: "pre-wrap", wordBreak: "break-all", flex: 1,
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
    return { id: Date.now() + Math.random(), time, severity, text: text || line };
  });
}

export default function LogsPanel({ open }) {
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState({ error: true, warn: true, info: true, debug: false });
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("sys");
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const listRef = useRef(null);
  const timerRef = useRef(null);

  const fetchLogs = useCallback(async () => {
    const src = DEFAULT_SOURCES.find(s => s.id === source);
    if (!src) return;
    setLoading(true);
    const res = await invoke("run_powershell", { command: src.command });
    const lines = parseEventLines(res?.stdout);
    setEntries(prev => {
      const combined = [...prev, ...lines];
      return combined.slice(-MAX_LINES);
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

  const handleScroll = useCallback(() => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 40);
  }, []);

  const filtered = entries.filter(e => {
    if (!filter[e.severity]) return false;
    if (search && !e.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = { error: 0, warn: 0, info: 0, debug: 0 };
  entries.forEach(e => counts[e.severity]++);

  return (
    <div style={{
      width:      open ? "260px" : "0px",
      minWidth:   open ? "260px" : "0px",
      overflow:   "hidden",
      background: "#020200",
      borderLeft: open ? `1px solid ${R}` : "none",
      flexShrink: 0,
      transition: "width 0.2s ease, min-width 0.2s ease",
      display:    "flex",
      flexDirection: "column",
    }}>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Header */}
          <div style={{ padding: "12px 10px 0 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: R, letterSpacing: "0.1em" }}>
                ◈ LOGS
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
              </div>
            </div>

            {/* Source selector */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
              {DEFAULT_SOURCES.map(s => (
                <button key={s.id}
                  onClick={() => setSource(s.id)}
                  style={{
                    background: source === s.id ? "#1a0000" : "transparent",
                    border: `1px solid ${source === s.id ? R + "66" : "#111"}`,
                    color: source === s.id ? R : "#333",
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
                    border: `1px solid ${filter[key] ? sev.color + "55" : "#111"}`,
                    color: filter[key] ? sev.color : "#222",
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
          </div>

          {/* Log entries */}
          <div
            ref={listRef}
            onScroll={handleScroll}
            style={{ flex: 1, overflowY: "auto", padding: "4px 10px" }}
          >
            {filtered.length === 0 ? (
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: "9px", color: "#222",
                textAlign: "center", marginTop: "20px",
              }}>
                {loading ? "Cargando logs..." : entries.length === 0 ? "Sin logs todavia." : "Sin resultados para el filtro."}
              </div>
            ) : (
              filtered.map((entry, i) => <LogLine key={i} entry={entry} />)
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: "4px 10px", borderTop: "1px solid #1a1a00",
            fontFamily: "var(--font-mono)", fontSize: "8px", color: "#222",
            display: "flex", justifyContent: "space-between",
          }}>
            <span>{filtered.length}/{entries.length} lineas</span>
            <span style={{ color: autoScroll ? G : "#222" }}>
              {autoScroll ? "auto-scroll ↓" : "scroll manual"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
