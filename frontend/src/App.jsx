import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import TitleBar from "./components/TitleBar";
import TerminalPane from "./components/Terminal";
import { useTheme, THEMES } from "./hooks/useTheme";
import "./styles/themes.css";

const Dashboard    = lazy(() => import("./components/Dashboard"));
const SidePanel    = lazy(() => import("./components/SidePanel"));
const TasksPanel   = lazy(() => import("./components/TasksPanel"));
const GitPanel     = lazy(() => import("./components/GitPanel"));
const NotesPanel   = lazy(() => import("./components/NotesPanel"));
const LogsPanel    = lazy(() => import("./components/LogsPanel"));
const SettingsPanel= lazy(() => import("./components/SettingsPanel"));
const InfraPanel   = lazy(() => import("./components/InfraPanel"));
const AIPanel      = lazy(() => import("./components/AIPanel"));
const MetricsPanel = lazy(() => import("./components/MetricsPanel"));
const CommandPalette = lazy(() => import("./components/CommandPalette"));
const DojoPanel      = lazy(() => import("./components/DojoPanel"));
const NotebookPanel  = lazy(() => import("./components/NotebookPanel"));

let tabIdCounter = 1;
function createTab(type = "powershell") {
  const id = tabIdCounter++;
  const meta = {
    dashboard:  { label: "Dashboard",  icon: "▣",  shell: null,       closeable: false },
    powershell: { label: "PowerShell", icon: "PS", shell: "pwsh.exe", closeable: true  },
    wsl:        { label: "WSL",        icon: "λ",  shell: "wsl.exe",  closeable: true  },
    cmd:        { label: "CMD",        icon: "⚡", shell: "cmd.exe",  closeable: true  },
    dojo:       { label: "DOJO",       icon: "⛩",  shell: null,       closeable: true  },
    notebook:   { label: "NOTEBOOK",   icon: "📓", shell: null,       closeable: true  },
  };
  return { id, type, ...meta[type] };
}

const BOOT_LINES = [
  { text: "NETWATCH OS v2.077 — INITIALIZING...",      color: "#FCEE0A" },
  { text: "► Loading system modules...",                color: "#39FF14" },
  { text: "► Connecting to hardware interface...",      color: "#39FF14" },
  { text: "► Reading CPU / RAM / OS data...",           color: "#39FF14" },
  { text: "► Mounting shortcuts registry...",           color: "#39FF14" },
  { text: "► PTY server online [ws://127.0.0.1:7777]", color: "var(--nw-accent)" },
  { text: "────────────────────────────────────────────", color: "#1a1a1a" },
  { text: "SYSTEM STATUS: ONLINE  ●",                  color: "#39FF14" },
  { text: "ACCESS GRANTED — Welcome, HEO-80",          color: "#FCEE0A" },
];

function BootScreen({ onDone }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const timers = useRef([]);

  useEffect(() => {
    if (sessionStorage.getItem("nw-booted")) { onDone(); return; }
    BOOT_LINES.forEach((_, i) => {
      const t = setTimeout(() => {
        setVisibleCount(i + 1);
        if (i === BOOT_LINES.length - 1) {
          const t2 = setTimeout(() => {
            setFinished(true);
            sessionStorage.setItem("nw-booted", "1");
            const t3 = setTimeout(onDone, 350);
            timers.current.push(t3);
          }, 700);
          timers.current.push(t2);
        }
      }, i * 140);
      timers.current.push(t);
    });
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const skip = useCallback(() => {
    timers.current.forEach(clearTimeout);
    sessionStorage.setItem("nw-booted", "1");
    onDone();
  }, [onDone]);

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      justifyContent: "center", padding: "0 60px",
      background: "#080700", position: "relative",
      opacity: finished ? 0 : 1, transition: "opacity 0.35s ease",
    }}>
      <div>
        {BOOT_LINES.slice(0, visibleCount).map((line, i) => (
          <div key={i} style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: line.color, lineHeight: "26px" }}>
            {line.text}
          </div>
        ))}
        {visibleCount > 0 && visibleCount < BOOT_LINES.length && (
          <span style={{ display: "inline-block", width: 9, height: 14, background: "#FCEE0A", verticalAlign: "middle", marginLeft: 4, animation: "blink 1s step-end infinite" }}/>
        )}
      </div>
      <button onClick={skip}
        style={{ position: "absolute", bottom: 40, right: 40, background: "transparent", border: "1px solid #333", color: "#555", fontFamily: "var(--font-mono)", fontSize: "10px", padding: "4px 14px", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" }}
        onMouseOver={e => { e.target.style.borderColor = "#FCEE0A"; e.target.style.color = "#FCEE0A"; }}
        onMouseOut={e => { e.target.style.borderColor = "#333"; e.target.style.color = "#555"; }}
      >SKIP ▸</button>
    </div>
  );
}

const DEFAULT_PANEL_ORDER = ["crypto", "tasks", "git", "notes", "logs", "settings"];
function loadPanelOrder() {
  try {
    const stored = JSON.parse(localStorage.getItem("nw-panel-order"));
    if (Array.isArray(stored) && stored.length === DEFAULT_PANEL_ORDER.length
        && stored.every(p => DEFAULT_PANEL_ORDER.includes(p))) return stored;
  } catch {}
  return [...DEFAULT_PANEL_ORDER];
}

export default function App() {
  const [booting,      setBooting]      = useState(true);
  const [tabs,         setTabs]         = useState(() => [createTab("dashboard"), createTab("powershell")]);
  const [activeTab,    setActiveTab]    = useState(1);
  const [rightPanel,   setRightPanel]   = useState(null);
  const [infraOpen,    setInfraOpen]    = useState(false);
  const [aiOpen,       setAiOpen]       = useState(false);
  const [metricsOpen,  setMetricsOpen]  = useState(false);
  const [systemUser,   setSystemUser]   = useState("Usuario");
  const [panelOrder,   setPanelOrder]   = useState(loadPanelOrder);
  const [paletteOpen,  setPaletteOpen]  = useState(false);
  const { theme, accent, corner, cycle: cycleTheme } = useTheme();

  useEffect(() => { try { localStorage.setItem("nw-panel-order", JSON.stringify(panelOrder)); } catch {} }, [panelOrder]);

  const cycleRight = useCallback((cur) => {
    const order = [null, ...panelOrder];
    const idx = order.indexOf(cur);
    return order[(idx + 1) % order.length];
  }, [panelOrder]);

  const reorderTabs = useCallback((fromIdx, toIdx) => {
    setTabs(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const reorderPanels = useCallback((fromIdx, toIdx) => {
    setPanelOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const togglePanel = useCallback((p) => {
    setRightPanel(prev => prev === p ? null : p);
  }, []);

  const executePaletteCmd = useCallback((cmd) => {
    window.dispatchEvent(new CustomEvent("nw-palette-execute", { detail: cmd }));
  }, []);

  // Leer usuario del sistema al arrancar
  useEffect(() => {
    import("@tauri-apps/api/core").then(({ invoke }) => {
      invoke("get_system_info").then(info => {
        if (info?.user) setSystemUser(info.user);
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const activeTabObj = tabs.find(t => t.id === activeTab) || tabs[0];

  const handleBootDone = useCallback(() => {
    setBooting(false);
    setActiveTab(tabs[0].id);
  }, [tabs]);

  useEffect(() => {
    if (booting) return;
    const paletteHandler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    window.addEventListener("keydown", paletteHandler);
    return () => window.removeEventListener("keydown", paletteHandler);
  }, [booting]);

  useEffect(() => {
    if (booting) return;
    const handler = (e) => {
      if (!e.altKey) return;
      const key = e.key.toLowerCase();
      e.preventDefault();
      if      (key === "a") setAiOpen(o => !o);
      else if (key === "m") setMetricsOpen(o => !o);
      else if (key === "p") setRightPanel(cycleRight);
      else if (key === "i") setInfraOpen(o => !o);
      else if (key === "t") addTab("powershell");
      else if (key === "v") window.dispatchEvent(new CustomEvent("nw-palette-execute", { detail: "nw clip" }));
      else if (key === "w") closeTab(activeTab);
      else if (key === "d") { const dash = tabs.find(t => t.type === "dashboard"); if (dash) setActiveTab(dash.id); }
      else if (e.key >= "1" && e.key <= "9") { const idx = parseInt(e.key) - 1; if (tabs[idx]) setActiveTab(tabs[idx].id); }
    };
    const openSettings = () => setRightPanel("settings");
    const openTab = (e) => { if (e.detail) addTab(e.detail); };
    window.addEventListener("keydown", handler);
    window.addEventListener("nw-open-settings", openSettings);
    window.addEventListener("nw-open-tab", openTab);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("nw-open-settings", openSettings);
      window.removeEventListener("nw-open-tab", openTab);
    };
  }, [booting, tabs, activeTab, cycleRight]);

  const addTab = useCallback((type) => {
    const t = createTab(type);
    setTabs(prev => [...prev, t]);
    setActiveTab(t.id);
  }, []);

  const closeTab = useCallback((id) => {
    setTabs(prev => {
      const tab = prev.find(t => t.id === id);
      if (!tab?.closeable) return prev;
      const idx  = prev.findIndex(t => t.id === id);
      const next = prev.filter(t => t.id !== id);
      setActiveTab(next[Math.max(0, idx - 1)].id);
      return next;
    });
  }, []);

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      width: "100vw", height: "100vh",
      background: "#080700", border: `1px solid ${accent}`,
      overflow: "hidden", position: "relative",
    }}>
      <div className="cy-scanlines"/>

      {/* Corner marks magenta */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100 }}>
        {[
          { top: 6,    left: 6,   borderTop: `2px solid ${corner}`,    borderLeft:  `2px solid ${corner}` },
          { top: 6,    right: 6,  borderTop: `2px solid ${corner}`,    borderRight: `2px solid ${corner}` },
          { bottom: 6, left: 6,   borderBottom: `2px solid ${corner}`, borderLeft:  `2px solid ${corner}` },
          { bottom: 6, right: 6,  borderBottom: `2px solid ${corner}`, borderRight: `2px solid ${corner}` },
        ].map((s, i) => <div key={i} style={{ position: "absolute", width: 16, height: 16, ...s }}/>)}
      </div>

      {/* TitleBar */}
      <TitleBar
        title="NETWATCH OS V2.077"
        subtitle="HEO-80"
        onNewTab={addTab}
        activeTabLabel={booting ? "BOOTING..." : activeTabObj?.label}
        rightPanel={rightPanel}
        infraOpen={infraOpen}
        aiOpen={aiOpen}
        onCycleRight={() => setRightPanel(cycleRight)}
        onToggleInfra={() => setInfraOpen(o => !o)}
        onToggleAi={() => setAiOpen(o => !o)}
      />

      {/* ══ ZONA PRINCIPAL ══ */}
      <Suspense fallback={null}>
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "row" }}>

        {/* Panel INFRA izquierda — altura completa */}
        <InfraPanel open={infraOpen} />

        {/* Zona central — AI arriba + contenido */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <AIPanel open={aiOpen} height={300} />

          {/* Contenido tabs */}
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            {booting ? (
              <BootScreen onDone={handleBootDone} />
            ) : (
              tabs.map(tab => (
                <div key={tab.id} style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column",
                  visibility:    tab.id === activeTab ? "visible" : "hidden",
                  pointerEvents: tab.id === activeTab ? "auto" : "none",
                  zIndex:        tab.id === activeTab ? 1 : 0,
                }}>
                  {tab.type === "dashboard"
                    ? <Dashboard onLaunchTerminal={() => addTab("powershell")} />
                    : tab.type === "dojo"
                    ? <DojoPanel />
                    : tab.type === "notebook"
                    ? <NotebookPanel />
                    : <TerminalPane key={`term-${tab.id}`} tabId={tab.id} shell={tab.shell} active={tab.id === activeTab} onClose={closeTab} systemUser={systemUser} />
                  }
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel derecho — intercambiable con Alt+P */}
        <SidePanel open={rightPanel === "crypto"} />
        <TasksPanel open={rightPanel === "tasks"} />
        <GitPanel open={rightPanel === "git"} />
        <NotesPanel open={rightPanel === "notes"} />
        <LogsPanel open={rightPanel === "logs"} />
        <SettingsPanel open={rightPanel === "settings"} />

      </div>
      </Suspense>

      {/* Metrics Panel — encima de las pestañas */}
      <Suspense fallback={null}>
        <MetricsPanel open={metricsOpen} height={130} />
      </Suspense>

      {/* Command Palette */}
      <Suspense fallback={null}>
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          onExecute={(cmd) => {
            window.dispatchEvent(new CustomEvent("nw-palette-execute", { detail: cmd }));
          }}
        />
      </Suspense>

      {/* TabBar */}
      {!booting && (
        <TabBar
          tabs={tabs} activeTab={activeTab}
          onSelect={setActiveTab} onClose={closeTab} onAdd={addTab}
          rightPanel={rightPanel} infraOpen={infraOpen} aiOpen={aiOpen} metricsOpen={metricsOpen}
          onCycleRight={() => setRightPanel(cycleRight)}
          onToggleInfra={() => setInfraOpen(o => !o)}
          onToggleAi={() => setAiOpen(o => !o)}
          onToggleMetrics={() => setMetricsOpen(o => !o)}
          accent={accent} theme={theme} onCycleTheme={cycleTheme}
          onReorderTabs={reorderTabs}
          panelOrder={panelOrder} onReorderPanels={reorderPanels}
          onTogglePanel={togglePanel}
        />
      )}

      {/* Command Palette (Ctrl+Shift+P) */}
      <Suspense fallback={null}>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onExecute={executePaletteCmd} />
      </Suspense>
    </div>
  );
}

const RIGHT_PANEL_META = {
  crypto:   { label: "CRYPTO",   color: "var(--nw-accent)" },
  tasks:    { label: "TASKS",    color: "#FCEE0A" },
  git:      { label: "GIT",      color: "#D9027D" },
  notes:    { label: "NOTES",    color: "#39FF14" },
  logs:     { label: "LOGS",     color: "#ff5555" },
  settings: { label: "SETTINGS", color: "#D9027D" },
};

function TabBar({ tabs, activeTab, onSelect, onClose, onAdd, rightPanel, infraOpen, aiOpen, metricsOpen, onCycleRight, onToggleInfra, onToggleAi, onToggleMetrics, accent, theme, onCycleTheme, onReorderTabs, panelOrder, onReorderPanels, onTogglePanel }) {
  const [time, setTime] = useState(getTime());
  useEffect(() => { const t = setInterval(() => setTime(getTime()), 1000); return () => clearInterval(t); }, []);
  const dragTab = useRef(null);
  const dragPanel = useRef(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [panelDropTarget, setPanelDropTarget] = useState(null);

  return (
    <div style={{ display: "flex", alignItems: "stretch", background: "#000", borderTop: `1px solid ${accent}`, flexShrink: 0, height: "28px", fontFamily: "var(--font-mono)" }}>

      {/* INFRA toggle izquierda */}
      <button onClick={onToggleInfra} title="Alt+I"
        style={{ background: infraOpen ? "#D9027D" : "transparent", border: "none", borderRight: "1px solid #1a1a1a", color: infraOpen ? "#000" : "#444", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "0 10px", cursor: "pointer", flexShrink: 0 }}
        onMouseOver={e => { if (!infraOpen) e.target.style.color = "#D9027D"; }}
        onMouseOut={e => { if (!infraOpen) e.target.style.color = "#444"; }}
      >◈ INFRA</button>

      {/* Badge NETWATCH powerline */}
      <div style={{ background: "#FCEE0A", color: "#000", padding: "0 10px", display: "flex", alignItems: "center", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", flexShrink: 0 }}>NETWATCH</div>
      <div style={{ width: 0, height: 0, borderTop: "28px solid transparent", borderLeft: "10px solid #FCEE0A", flexShrink: 0 }}/>

      {/* Tabs — draggable to reorder */}
      <div style={{ display: "flex", flex: 1, alignItems: "stretch", overflow: "hidden" }}>
        {tabs.map((tab, idx) => {
          const active = tab.id === activeTab;
          const isDragOver = dropTarget === idx;
          return (
            <div key={tab.id}
              draggable={tab.closeable}
              onDragStart={e => { dragTab.current = idx; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", "tab"); }}
              onDragOver={e => { if (dragTab.current !== null) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDropTarget(idx); } }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={e => { e.preventDefault(); if (dragTab.current !== null && dragTab.current !== idx) onReorderTabs(dragTab.current, idx); dragTab.current = null; setDropTarget(null); }}
              onDragEnd={() => { dragTab.current = null; setDropTarget(null); }}
              onClick={() => onSelect(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: "5px", padding: "0 12px",
                background:  active ? "#0d0d00" : "transparent",
                borderRight: "1px solid #111",
                borderTop:   active ? "1px solid #FCEE0A" : "1px solid transparent",
                borderLeft:  isDragOver ? `2px solid ${accent}` : "2px solid transparent",
                color:       active ? "#FCEE0A" : "#444",
                fontSize: "10px", cursor: tab.closeable ? "grab" : "pointer", whiteSpace: "nowrap",
                letterSpacing: "0.05em", userSelect: "none",
                transition: "border-left-color 0.1s",
              }}>
              <span style={{ fontSize: "9px", opacity: 0.8 }}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.closeable && (
                <span onClick={e => { e.stopPropagation(); onClose(tab.id); }}
                  style={{ marginLeft: 3, color: "#333", fontSize: "12px", cursor: "pointer" }}
                  onMouseOver={e => e.target.style.color = "#ff5555"}
                  onMouseOut={e => e.target.style.color = "#333"}
                >×</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Controles derecha */}
      <div style={{ display: "flex", alignItems: "center", gap: "2px", padding: "0 6px", flexShrink: 0 }}>
        {[
          { type: "powershell", label: "+ PS",  color: "var(--nw-accent)" },
          { type: "wsl",        label: "+ WSL", color: "#39FF14" },
          { type: "cmd",        label: "+ CMD", color: "#FCEE0A" },
          { type: "dojo",       label: "⛩ DOJO",   color: "#D9027D" },
          { type: "notebook",   label: "📓 NB", color: "#39FF14" },
        ].map(btn => (
          <button key={btn.type} onClick={() => onAdd(btn.type)}
            style={{ background: "transparent", border: "1px solid #1a1a1a", color: "#333", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "1px 7px", cursor: "pointer" }}
            onMouseOver={e => { e.target.style.borderColor = btn.color; e.target.style.color = btn.color; }}
            onMouseOut={e => { e.target.style.borderColor = "#1a1a1a"; e.target.style.color = "#333"; }}
          >{btn.label}</button>
        ))}

        <div style={{ width: 1, height: 14, background: "#1a1a1a", margin: "0 3px" }}/>

        {/* AI toggle */}
        <button onClick={onToggleAi} title="Alt+A — Panel AI"
          style={{ background: aiOpen ? "#39FF14" : "transparent", border: `1px solid ${aiOpen ? "#39FF14" : "#1a1a1a"}`, color: aiOpen ? "#000" : "#333", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "1px 7px", cursor: "pointer" }}
          onMouseOver={e => { if (!aiOpen) { e.target.style.borderColor = "#39FF14"; e.target.style.color = "#39FF14"; } }}
          onMouseOut={e => { if (!aiOpen) { e.target.style.borderColor = "#1a1a1a"; e.target.style.color = "#333"; } }}
        >◈ AI</button>

        {/* METRICS toggle */}
        <button onClick={onToggleMetrics} title="Alt+M — Panel Metrics"
          style={{ background: metricsOpen ? "#39FF14" : "transparent", border: `1px solid ${metricsOpen ? "#39FF14" : "#1a1a1a"}`, color: metricsOpen ? "#000" : "#333", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "1px 7px", cursor: "pointer" }}
          onMouseOver={e => { if (!metricsOpen) { e.target.style.borderColor = "#39FF14"; e.target.style.color = "#39FF14"; } }}
          onMouseOut={e => { if (!metricsOpen) { e.target.style.borderColor = "#1a1a1a"; e.target.style.color = "#333"; } }}
        >◈ METRICS</button>

        <div style={{ width: 1, height: 14, background: "#1a1a1a", margin: "0 3px" }}/>

        {/* Panel chips — draggable to reorder, click to toggle */}
        {panelOrder.map((p, i) => {
          const meta = RIGHT_PANEL_META[p];
          const isActive = rightPanel === p;
          const isDragOver = panelDropTarget === i;
          return (
            <button key={p}
              draggable
              onDragStart={e => { dragPanel.current = i; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", "panel"); }}
              onDragOver={e => { if (dragPanel.current !== null) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setPanelDropTarget(i); } }}
              onDragLeave={() => setPanelDropTarget(null)}
              onDrop={e => { e.preventDefault(); if (dragPanel.current !== null && dragPanel.current !== i) onReorderPanels(dragPanel.current, i); dragPanel.current = null; setPanelDropTarget(null); }}
              onDragEnd={() => { dragPanel.current = null; setPanelDropTarget(null); }}
              onClick={() => onTogglePanel(p)}
              title={`${meta.label} — arrastra para reordenar`}
              style={{
                background: isActive ? meta.color : "transparent",
                border: `1px solid ${isActive ? meta.color : isDragOver ? accent : "#1a1a1a"}`,
                color: isActive ? "#000" : "#333",
                fontFamily: "var(--font-mono)", fontSize: "7px",
                padding: "1px 4px", cursor: "grab",
                transition: "border-color 0.1s",
              }}
              onMouseOver={e => { if (!isActive) { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.color = meta.color; } }}
              onMouseOut={e => { if (!isActive) { e.currentTarget.style.borderColor = isDragOver ? accent : "#1a1a1a"; e.currentTarget.style.color = "#333"; } }}
            >{meta.label.slice(0, 3)}</button>
          );
        })}

        {/* Alt+P cycle */}
        <button onClick={onCycleRight} title="Alt+P — Ciclar panel derecho"
          style={{ background: "transparent", border: "1px solid #1a1a1a", color: "#333", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "1px 4px", cursor: "pointer" }}
          onMouseOver={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = "#1a1a1a"; e.currentTarget.style.color = "#333"; }}
        >▸</button>

        <div style={{ width: 1, height: 14, background: "#1a1a1a", margin: "0 3px" }}/>

        {/* Theme cycle button */}
        <button onClick={onCycleTheme} title="Cambiar tema de color"
          style={{
            background: "transparent", border: `1px solid ${accent}`,
            color: accent, fontFamily: "var(--font-mono)", fontSize: "9px",
            padding: "1px 7px", cursor: "pointer", display: "flex",
            alignItems: "center", gap: "4px",
          }}
          onMouseOver={e => { e.currentTarget.style.background = accent; e.currentTarget.style.color = "#000"; }}
          onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = accent; }}
        >
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: accent, boxShadow: `0 0 4px ${accent}` }}/>
          {theme.toUpperCase()}
        </button>

        <div style={{ width: 1, height: 14, background: "#1a1a1a", margin: "0 3px" }}/>
        <span style={{ fontSize: "10px", color: "#FCEE0A", letterSpacing: "0.08em" }}>⏱ {time}</span>
      </div>
    </div>
  );
}

function getTime() {
  return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}
