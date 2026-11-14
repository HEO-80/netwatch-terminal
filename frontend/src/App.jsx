import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import TitleBar from "./components/TitleBar";
import TerminalPane from "./components/Terminal";
import { useTheme, THEMES } from "./hooks/useTheme";
import { ModuleConfigProvider, useModuleConfig } from "./hooks/useModuleConfig.jsx";
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
const SetupWizard    = lazy(() => import("./components/SetupWizard"));
const HelpModal      = lazy(() => import("./components/HelpModal"));
const SettingsModal  = lazy(() => import("./components/SettingsModal"));

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
  { text: "────────────────────────────────────────────", color: "#333" },
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
        style={{ position: "absolute", bottom: 40, right: 40, background: "transparent", border: "1px solid #555", color: "#999", fontFamily: "var(--font-mono)", fontSize: "10px", padding: "4px 14px", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" }}
        onMouseOver={e => { e.target.style.borderColor = "#FCEE0A"; e.target.style.color = "#FCEE0A"; }}
        onMouseOut={e => { e.target.style.borderColor = "#555"; e.target.style.color = "#999"; }}
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
  return (
    <ModuleConfigProvider>
      <AppInner />
    </ModuleConfigProvider>
  );
}

function AppInner() {
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
  const [focusPanel,   setFocusPanel]   = useState(null);
  const [panelOverlay, setPanelOverlay] = useState(null);
  const [panelMini,    setPanelMini]    = useState({});
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const { theme, accent, corner, cycle: cycleTheme } = useTheme();
  const [showSetup, setShowSetup] = useState(false);
  const { isEnabled, firstRunDone, setModule } = useModuleConfig();

  useEffect(() => {
    if (!booting && !firstRunDone) setShowSetup(true);
    const onSetup = () => setShowSetup(true);
    window.addEventListener("nw-open-setup", onSetup);
    return () => window.removeEventListener("nw-open-setup", onSetup);
  }, [booting, firstRunDone]);

  useEffect(() => {
    const onChanged = () => window.location.reload();
    window.addEventListener("nw-config-changed", onChanged);
    return () => window.removeEventListener("nw-config-changed", onChanged);
  }, []);

  useEffect(() => {
    const handler = () => { if (!isEnabled("panels.ai")) setModule("panels.ai", true); setAiOpen(o => !o); };
    window.addEventListener("nw-ai-toggle", handler);
    return () => window.removeEventListener("nw-ai-toggle", handler);
  }, [isEnabled, setModule]);

  useEffect(() => { try { localStorage.setItem("nw-panel-order", JSON.stringify(panelOrder)); } catch {} }, [panelOrder]);

  const activePanelOrder = panelOrder.filter(p => isEnabled(`panels.${p}`));

  const cycleRight = useCallback((cur) => {
    const order = [null, ...activePanelOrder];
    const idx = order.indexOf(cur);
    return order[(idx + 1) % order.length];
  }, [activePanelOrder]);

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
    if (!isEnabled(`panels.${p}`)) setModule(`panels.${p}`, true);
    setRightPanel(prev => prev === p ? null : p);
  }, [isEnabled, setModule]);

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
      if (e.key === "Escape") {
        if (showHelpModal) { setShowHelpModal(false); return; }
        if (showSettingsModal) { setShowSettingsModal(false); return; }
        if (showCheatSheet) { setShowCheatSheet(false); return; }
        if (panelOverlay) { setPanelOverlay(null); return; }
        if (focusPanel) { setFocusPanel(null); return; }
      }
    };
    window.addEventListener("keydown", paletteHandler);
    return () => window.removeEventListener("keydown", paletteHandler);
  }, [booting, panelOverlay, focusPanel, showCheatSheet, showHelpModal, showSettingsModal]);

  useEffect(() => {
    if (booting) return;
    const handler = (e) => {
      const ae = document.activeElement;
      const isTerminalFocused = !!ae?.closest?.(".xterm") ||
        ae?.tagName === "INPUT" || ae?.tagName === "TEXTAREA" || ae?.tagName === "SELECT";

      if (e.key === "F12" || (e.key === "?" && !isTerminalFocused)) {
        e.preventDefault();
        setShowHelpModal(s => !s);
        return;
      }

      if (!isTerminalFocused && !e.altKey) {
        if (e.ctrlKey && e.key === "F2") {
          if (focusPanel && rightPanel) {
            e.preventDefault();
            const next = panelOrder[(panelOrder.indexOf(rightPanel) + 1) % panelOrder.length];
            setRightPanel(next);
            setFocusPanel(next);
          }
          return;
        }
        if (!e.ctrlKey && !e.metaKey) {
          if (e.key === "F1") { e.preventDefault(); setInfraOpen(true); setFocusPanel("infra"); return; }
          if (e.key === "F2") {
            e.preventDefault();
            const target = rightPanel || panelOrder[0];
            if (!rightPanel) setRightPanel(target);
            setFocusPanel(target);
            return;
          }
          if (e.key === "F3") { e.preventDefault(); setAiOpen(true); setFocusPanel("ai"); return; }
          if (e.key === "F4") { e.preventDefault(); setMetricsOpen(true); setFocusPanel("metrics"); return; }
          if (e.key === "F5") {
            e.preventDefault();
            setFocusPanel(null);
            document.querySelector(".xterm-helper-textarea")?.focus();
            return;
          }
          if (focusPanel) {
            if (e.key === "Tab") {
              e.preventDefault();
              const visiblePanels = [];
              if (infraOpen) visiblePanels.push("infra");
              if (aiOpen) visiblePanels.push("ai");
              if (rightPanel) visiblePanels.push(rightPanel);
              if (metricsOpen) visiblePanels.push("metrics");
              if (visiblePanels.length > 0) {
                const idx = visiblePanels.indexOf(focusPanel);
                const n = visiblePanels.length;
                setFocusPanel(visiblePanels[e.shiftKey ? (idx - 1 + n) % n : (idx + 1) % n]);
              }
              return;
            }
            if (e.key === "r") {
              window.dispatchEvent(new CustomEvent("nw-panel-action", { detail: { panel: focusPanel, action: "refresh" } }));
              return;
            }
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent("nw-panel-nav", { detail: { panel: focusPanel, dir: e.key === "ArrowUp" ? -1 : 1 } }));
              return;
            }
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent("nw-panel-action", { detail: { panel: focusPanel, action: e.key === "Enter" ? "enter" : "space" } }));
              return;
            }
            if (e.key === "c") { window.dispatchEvent(new CustomEvent("nw-panel-action", { detail: { panel: focusPanel, action: "copy" } })); return; }
            if (e.key === "o") { window.dispatchEvent(new CustomEvent("nw-panel-action", { detail: { panel: focusPanel, action: "open" } })); return; }
            if (e.key === "e") { window.dispatchEvent(new CustomEvent("nw-panel-action", { detail: { panel: focusPanel, action: "edit" } })); return; }
            if (e.key === "d") { window.dispatchEvent(new CustomEvent("nw-panel-action", { detail: { panel: focusPanel, action: "delete" } })); return; }
            if (e.key === "m") {
              setPanelMini(m => ({ ...m, [focusPanel]: !m[focusPanel] }));
              return;
            }
            if (e.key === "x") {
              setPanelOverlay(p => p === focusPanel ? null : focusPanel);
              return;
            }
            if (e.key === "[") {
              if (rightPanel) {
                const idx = panelOrder.indexOf(rightPanel);
                const prev = panelOrder[(idx - 1 + panelOrder.length) % panelOrder.length];
                if (!isEnabled(`panels.${prev}`)) setModule(`panels.${prev}`, true);
                setRightPanel(prev);
                setFocusPanel(prev);
              }
              return;
            }
            if (e.key === "]") {
              if (rightPanel) {
                const idx = panelOrder.indexOf(rightPanel);
                const next = panelOrder[(idx + 1) % panelOrder.length];
                if (!isEnabled(`panels.${next}`)) setModule(`panels.${next}`, true);
                setRightPanel(next);
                setFocusPanel(next);
              }
              return;
            }
          }
        }
      }

      if (!e.altKey) return;
      const key = e.key.toLowerCase();
      e.preventDefault();
      if      (key === "a") { if (!isEnabled("panels.ai")) setModule("panels.ai", true); setAiOpen(o => !o); }
      else if (key === "m") { if (!isEnabled("panels.metrics")) setModule("panels.metrics", true); setMetricsOpen(o => !o); }
      else if (key === "p") setRightPanel(cycleRight);
      else if (key === "i") { if (!isEnabled("panels.infra")) setModule("panels.infra", true); setInfraOpen(o => !o); }
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
  }, [booting, tabs, activeTab, cycleRight, focusPanel, rightPanel, panelOrder, infraOpen, aiOpen, metricsOpen, isEnabled, setModule]);

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
        onOpenHelp={() => setShowHelpModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      {/* ══ ZONA PRINCIPAL ══ */}
      <Suspense fallback={null}>
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "row" }}>

        {/* Panel INFRA izquierda — altura completa */}
        {isEnabled("panels.infra") && (
          <div style={panelOverlay === "infra" ? { position: "relative", zIndex: 60 } : undefined}>
            <InfraPanel open={infraOpen} focused={focusPanel === "infra" || panelOverlay === "infra"} onFocus={() => setFocusPanel(f => f === "infra" ? null : "infra")} onOverlay={() => setPanelOverlay(p => p === "infra" ? null : "infra")} minimized={!!panelMini.infra} onMinimize={() => setPanelMini(m => ({ ...m, infra: !m.infra }))} />
          </div>
        )}

        {/* Zona central — AI arriba + contenido */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {isEnabled("panels.ai") && <AIPanel open={aiOpen} height={300} />}

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
                    : <TerminalPane key={`term-${tab.id}`} tabId={tab.id} shell={tab.shell} active={tab.id === activeTab} onClose={closeTab} systemUser={systemUser} onAddTab={addTab} />
                  }
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel derecho — intercambiable con Alt+P, solo modulos activos */}
        {[
          { key: "crypto", Comp: SidePanel },
          { key: "tasks", Comp: TasksPanel },
          { key: "git", Comp: GitPanel },
          { key: "notes", Comp: NotesPanel },
          { key: "logs", Comp: LogsPanel },
          { key: "settings", Comp: SettingsPanel },
        ].filter(({ key }) => isEnabled(`panels.${key}`)).map(({ key, Comp }) => (
          <div key={key} style={panelOverlay === key ? { position: "relative", zIndex: 60 } : undefined}>
            <Comp
              open={rightPanel === key}
              focused={focusPanel === key || panelOverlay === key}
              onFocus={() => setFocusPanel(f => f === key ? null : key)}
              onOverlay={() => setPanelOverlay(p => p === key ? null : key)}
              minimized={!!panelMini[key]}
              onMinimize={() => setPanelMini(m => ({ ...m, [key]: !m[key] }))}
            />
          </div>
        ))}

      </div>
      </Suspense>

      {/* Metrics Panel — encima de las pestañas */}
      {isEnabled("panels.metrics") && (
        <Suspense fallback={null}>
          <MetricsPanel open={metricsOpen} height={130} />
        </Suspense>
      )}

      {/* TabBar */}
      {!booting && (
        <TabBar
          tabs={tabs} activeTab={activeTab}
          onSelect={setActiveTab} onClose={closeTab} onAdd={addTab}
          rightPanel={rightPanel} infraOpen={infraOpen} aiOpen={aiOpen} metricsOpen={metricsOpen}
          onCycleRight={() => setRightPanel(cycleRight)}
          onToggleInfra={() => { if (!isEnabled("panels.infra")) setModule("panels.infra", true); setInfraOpen(o => !o); }}
          onToggleAi={() => { if (!isEnabled("panels.ai")) setModule("panels.ai", true); setAiOpen(o => !o); }}
          onToggleMetrics={() => { if (!isEnabled("panels.metrics")) setModule("panels.metrics", true); setMetricsOpen(o => !o); }}
          accent={accent} theme={theme} onCycleTheme={cycleTheme}
          onReorderTabs={reorderTabs}
          panelOrder={panelOrder} onReorderPanels={reorderPanels}
          onTogglePanel={togglePanel}
          focusPanel={focusPanel}
          isEnabled={isEnabled}
        />
      )}

      {/* Command Palette (Ctrl+Shift+P) */}
      {isEnabled("features.palette") && (
        <Suspense fallback={null}>
          <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onExecute={executePaletteCmd} />
        </Suspense>
      )}

      {/* Panel Overlay backdrop */}
      {panelOverlay && (
        <div onClick={() => setPanelOverlay(null)} style={{
          position: "absolute", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(2px)",
          pointerEvents: "auto",
        }}/>
      )}

      {/* Setup wizard (first run / nw setup) */}
      {showSetup && (
        <Suspense fallback={null}>
          <SetupWizard onDone={() => setShowSetup(false)} />
        </Suspense>
      )}

      {/* Help Modal (? / F12 / boton HELP) */}
      {showHelpModal && (
        <Suspense fallback={null}>
          <HelpModal onClose={() => setShowHelpModal(false)} />
        </Suspense>
      )}

      {/* Settings Modal (boton SETTINGS) */}
      {showSettingsModal && (
        <Suspense fallback={null}>
          <SettingsModal
            onClose={() => setShowSettingsModal(false)}
            onOpenSetup={() => { setShowSettingsModal(false); setShowSetup(true); }}
          />
        </Suspense>
      )}
    </div>
  );
}

const RIGHT_PANEL_META = {
  crypto:   { label: "CRYPTO",   color: "var(--nw-accent)", tip: "Precios BTC/ETH, Gas, MEV Bots" },
  tasks:    { label: "TASKS",    color: "#FCEE0A",          tip: "Tareas: pendiente, en curso, hecho" },
  git:      { label: "GIT",      color: "#D9027D",          tip: "Repo actual, cambios, diff inline" },
  notes:    { label: "NOTES",    color: "#39FF14",          tip: "Notas rápidas, pin, export" },
  logs:     { label: "LOGS",     color: "#ff5555",          tip: "Logs del sistema, filtros, tail" },
  settings: { label: "SETTINGS", color: "#D9027D",          tip: "API keys, config, tema" },
};

function TabBar({ tabs, activeTab, onSelect, onClose, onAdd, rightPanel, infraOpen, aiOpen, metricsOpen, onCycleRight, onToggleInfra, onToggleAi, onToggleMetrics, accent, theme, onCycleTheme, onReorderTabs, panelOrder, onReorderPanels, onTogglePanel, focusPanel, isEnabled }) {
  const [time, setTime] = useState(getTime());
  useEffect(() => { const t = setInterval(() => setTime(getTime()), 1000); return () => clearInterval(t); }, []);
  const [aiStatus, setAiStatus] = useState({ available: false, streaming: false });
  useEffect(() => {
    const handler = (e) => setAiStatus(e.detail || {});
    window.addEventListener("nw-ai-status", handler);
    return () => window.removeEventListener("nw-ai-status", handler);
  }, []);
  const dragTab = useRef(null);
  const dragPanel = useRef(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [panelDropTarget, setPanelDropTarget] = useState(null);

  return (
    <div style={{ display: "flex", alignItems: "stretch", background: "#000", borderTop: `1px solid ${accent}`, flexShrink: 0, height: "28px", fontFamily: "var(--font-mono)" }}>

      {/* INFRA toggle izquierda */}
      <button onClick={onToggleInfra} title="INFRA — SSH, puertos, K8s, Terraform, GitHub · Alt+I"
        style={{ background: infraOpen ? "#D9027D" : "transparent", border: "none", borderRight: "1px solid #333", color: infraOpen ? "#000" : "#888", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "0 10px", cursor: "pointer", flexShrink: 0 }}
        onMouseOver={e => { if (!infraOpen) e.target.style.color = "#D9027D"; }}
        onMouseOut={e => { if (!infraOpen) e.target.style.color = "#888"; }}
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
                borderRight: "1px solid #2a2a2a",
                borderTop:   active ? "1px solid #FCEE0A" : "1px solid transparent",
                borderLeft:  isDragOver ? `2px solid ${accent}` : "2px solid transparent",
                color:       active ? "#FCEE0A" : "#888",
                fontSize: "10px", cursor: tab.closeable ? "grab" : "pointer", whiteSpace: "nowrap",
                letterSpacing: "0.05em", userSelect: "none",
                transition: "border-left-color 0.1s",
              }}>
              <span style={{ fontSize: "9px", opacity: 0.8 }}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.closeable && (
                <span onClick={e => { e.stopPropagation(); onClose(tab.id); }}
                  style={{ marginLeft: 3, color: "#777", fontSize: "12px", cursor: "pointer" }}
                  onMouseOver={e => e.target.style.color = "#ff5555"}
                  onMouseOut={e => e.target.style.color = "#777"}
                >×</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Controles derecha */}
      <div style={{ display: "flex", alignItems: "center", gap: "2px", padding: "0 6px", flexShrink: 0 }}>

        {/* AI toggle */}
        <button onClick={onToggleAi} title="AI — Chat con Ollama/Gemini/Claude · Alt+A"
          style={{ background: aiOpen ? "#39FF14" : "transparent", border: `1px solid ${aiOpen ? "#39FF14" : "#333"}`, color: aiOpen ? "#000" : "#888", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "1px 7px", cursor: "pointer" }}
          onMouseOver={e => { if (!aiOpen) { e.target.style.borderColor = "#39FF14"; e.target.style.color = "#39FF14"; } }}
          onMouseOut={e => { if (!aiOpen) { e.target.style.borderColor = "#333"; e.target.style.color = "#888"; } }}
        >◈ AI {aiStatus.streaming ? <span style={{ animation: "blink 0.8s step-end infinite", color: aiOpen ? "#000" : "#FCEE0A" }}>◌</span> : aiStatus.available ? <span style={{ color: aiOpen ? "#000" : "#39FF14" }}>●</span> : <span style={{ color: "#555" }}>○</span>}</button>

        {/* METRICS toggle */}
        <button onClick={onToggleMetrics} title="METRICS — CPU, RAM, Disco en tiempo real · Alt+M"
          style={{ background: metricsOpen ? "#39FF14" : "transparent", border: `1px solid ${metricsOpen ? "#39FF14" : "#333"}`, color: metricsOpen ? "#000" : "#888", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "1px 7px", cursor: "pointer" }}
          onMouseOver={e => { if (!metricsOpen) { e.target.style.borderColor = "#39FF14"; e.target.style.color = "#39FF14"; } }}
          onMouseOut={e => { if (!metricsOpen) { e.target.style.borderColor = "#333"; e.target.style.color = "#888"; } }}
        >◈ METRICS</button>

        <div style={{ width: 1, height: 14, background: "#333", margin: "0 3px" }}/>

        {/* Panel chips — draggable to reorder, click to toggle */}
        {panelOrder.map((p, i) => {
          const meta = RIGHT_PANEL_META[p];
          const isActive = rightPanel === p;
          const isDragOver = panelDropTarget === i;
          const moduleOn = isEnabled(`panels.${p}`);
          const dimOpacity = moduleOn ? 0.5 : 0.25;
          return (
            <button key={p}
              draggable
              onDragStart={e => { dragPanel.current = i; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", "panel"); }}
              onDragOver={e => { if (dragPanel.current !== null) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setPanelDropTarget(i); } }}
              onDragLeave={() => setPanelDropTarget(null)}
              onDrop={e => { e.preventDefault(); if (dragPanel.current !== null && dragPanel.current !== i) onReorderPanels(dragPanel.current, i); dragPanel.current = null; setPanelDropTarget(null); }}
              onDragEnd={() => { dragPanel.current = null; setPanelDropTarget(null); }}
              onClick={() => onTogglePanel(p)}
              title={`${meta.label} — ${meta.tip}${moduleOn ? "" : " (click para activar)"}`}
              style={{
                background: isActive ? meta.color : "transparent",
                border: `1px solid ${isActive ? meta.color : isDragOver ? accent : moduleOn ? "#444" : "#222"}`,
                color: isActive ? "#000" : meta.color,
                opacity: isActive ? 1 : dimOpacity,
                fontFamily: "var(--font-mono)", fontSize: "7px",
                padding: "1px 4px", cursor: "grab",
                transition: "border-color 0.15s, opacity 0.15s",
              }}
              onMouseOver={e => { if (!isActive) { e.currentTarget.style.opacity = "1"; e.currentTarget.style.borderColor = meta.color; } }}
              onMouseOut={e => { if (!isActive) { e.currentTarget.style.opacity = String(dimOpacity); e.currentTarget.style.borderColor = isDragOver ? accent : moduleOn ? "#444" : "#222"; } }}
            >{meta.label.slice(0, 3)}</button>
          );
        })}

        {/* Alt+P cycle */}
        <button onClick={onCycleRight} title="Alt+P — Ciclar panel derecho"
          style={{ background: "transparent", border: "1px solid #333", color: "#888", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "1px 4px", cursor: "pointer" }}
          onMouseOver={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.color = accent; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = "#888"; }}
        >▸</button>

        <div style={{ width: 1, height: 14, background: "#333", margin: "0 3px" }}/>

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

        <div style={{ width: 1, height: 14, background: "#333", margin: "0 3px" }}/>
        <span style={{ fontSize: "10px", color: "#FCEE0A", letterSpacing: "0.08em" }}>⏱ {time}</span>
        {focusPanel && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "8px", color: "#FCEE0A", padding: "0 6px", opacity: 0.7 }}>
            ⌨ {focusPanel.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}

function getTime() {
  return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}
