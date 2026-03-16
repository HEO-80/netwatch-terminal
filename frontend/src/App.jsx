import { useState, useEffect, useCallback, useRef } from "react";
import TitleBar from "./components/TitleBar";
import Dashboard from "./components/Dashboard";
import TerminalPane from "./components/Terminal";
import SidePanel from "./components/SidePanel";
import InfraPanel from "./components/InfraPanel";
import "./styles/themes.css";

let tabIdCounter = 1;
function createTab(type = "powershell") {
  const id = tabIdCounter++;
  const meta = {
    dashboard:  { label: "Dashboard",  icon: "▣",  shell: null,       closeable: false },
    powershell: { label: "PowerShell", icon: "PS", shell: "pwsh.exe", closeable: true  },
    wsl:        { label: "WSL",        icon: "λ",  shell: "wsl.exe",  closeable: true  },
    cmd:        { label: "CMD",        icon: "⚡", shell: "cmd.exe",  closeable: true  },
  };
  return { id, type, ...meta[type] };
}

const BOOT_LINES = [
  { text: "NETWATCH OS v2.077 — INITIALIZING...",      color: "#FCEE0A" },
  { text: "► Loading system modules...",                color: "#39FF14" },
  { text: "► Connecting to hardware interface...",      color: "#39FF14" },
  { text: "► Reading CPU / RAM / OS data...",           color: "#39FF14" },
  { text: "► Mounting shortcuts registry...",           color: "#39FF14" },
  { text: "► PTY server online [ws://127.0.0.1:7777]", color: "#00F0FF" },
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
      background: "#050500", position: "relative",
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
      <button onClick={skip} style={{ position: "absolute", bottom: 40, right: 40, background: "transparent", border: "1px solid #333", color: "#555", fontFamily: "var(--font-mono)", fontSize: "10px", padding: "4px 14px", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" }}
        onMouseOver={e => { e.target.style.borderColor = "#FCEE0A"; e.target.style.color = "#FCEE0A"; }}
        onMouseOut={e => { e.target.style.borderColor = "#333"; e.target.style.color = "#555"; }}
      >SKIP ▸</button>
    </div>
  );
}

export default function App() {
  const [booting,     setBooting]     = useState(true);
  const [tabs,        setTabs]        = useState(() => [createTab("dashboard"), createTab("powershell")]);
  const [activeTab,   setActiveTab]   = useState(1);
  const [panelOpen,   setPanelOpen]   = useState(false);  // Alt+P — crypto/MEV (derecha)
  const [infraOpen,   setInfraOpen]   = useState(false);  // Alt+I — infra (izquierda)

  const activeTabObj = tabs.find(t => t.id === activeTab) || tabs[0];

  const handleBootDone = useCallback(() => {
    setBooting(false);
    setActiveTab(tabs[0].id);
  }, [tabs]);

  useEffect(() => {
    if (booting) return;
    const handler = (e) => {
      if (!e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "p") { e.preventDefault(); setPanelOpen(o => !o); }
      else if (key === "i") { e.preventDefault(); setInfraOpen(o => !o); }
      else if (key === "t") { e.preventDefault(); addTab("powershell"); }
      else if (key === "w") { e.preventDefault(); closeTab(activeTab); }
      else if (key === "d") {
        e.preventDefault();
        const dash = tabs.find(t => t.type === "dashboard");
        if (dash) setActiveTab(dash.id);
      } else if (e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (tabs[idx]) setActiveTab(tabs[idx].id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [booting, tabs, activeTab]);

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
      background: "#050500", border: "1px solid #00F0FF",
      overflow: "hidden", position: "relative",
    }}>
      <div className="cy-scanlines"/>

      {/* Corner marks */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100 }}>
        {[
          { top: 6,    left: 6,   borderTop: "2px solid #D9027D",    borderLeft:  "2px solid #D9027D" },
          { top: 6,    right: 6,  borderTop: "2px solid #D9027D",    borderRight: "2px solid #D9027D" },
          { bottom: 6, left: 6,   borderBottom: "2px solid #D9027D", borderLeft:  "2px solid #D9027D" },
          { bottom: 6, right: 6,  borderBottom: "2px solid #D9027D", borderRight: "2px solid #D9027D" },
        ].map((s, i) => <div key={i} style={{ position: "absolute", width: 16, height: 16, ...s }}/>)}
      </div>

      {/* TitleBar */}
      <TitleBar
        title="NETWATCH OS V2.077"
        subtitle="HEO-80"
        onNewTab={addTab}
        activeTabLabel={booting ? "BOOTING..." : activeTabObj?.label}
        panelOpen={panelOpen}
        infraOpen={infraOpen}
        onTogglePanel={() => setPanelOpen(o => !o)}
        onToggleInfra={() => setInfraOpen(o => !o)}
      />

      {/* Fila: InfraPanel | Contenido | SidePanel */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "row" }}>

        {/* Panel INFRA — izquierda, borde magenta */}
        <InfraPanel open={infraOpen} />

        {/* Contenido principal */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
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
                  : <TerminalPane key={`term-${tab.id}`} tabId={tab.id} shell={tab.shell} active={tab.id === activeTab} />
                }
              </div>
            ))
          )}
        </div>

        {/* Panel CRYPTO/MEV — derecha, borde cyan */}
        <SidePanel open={panelOpen} />
      </div>

      {/* TabBar */}
      {!booting && (
        <TabBar
          tabs={tabs} activeTab={activeTab}
          onSelect={setActiveTab} onClose={closeTab} onAdd={addTab}
          panelOpen={panelOpen} infraOpen={infraOpen}
          onTogglePanel={() => setPanelOpen(o => !o)}
          onToggleInfra={() => setInfraOpen(o => !o)}
        />
      )}
    </div>
  );
}

function TabBar({ tabs, activeTab, onSelect, onClose, onAdd, panelOpen, infraOpen, onTogglePanel, onToggleInfra }) {
  const [time, setTime] = useState(getTime());
  useEffect(() => { const t = setInterval(() => setTime(getTime()), 1000); return () => clearInterval(t); }, []);

  return (
    <div style={{ display: "flex", alignItems: "stretch", background: "#000", borderTop: "1px solid #00F0FF", flexShrink: 0, height: "28px", fontFamily: "var(--font-mono)" }}>

      {/* Infra toggle — izquierda */}
      <button onClick={onToggleInfra} title="Alt+I — Panel Infra"
        style={{ background: infraOpen ? "#D9027D" : "transparent", border: "none", borderRight: "1px solid #1a1a1a", color: infraOpen ? "#000" : "#444", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "0 10px", cursor: "pointer", letterSpacing: "0.05em", flexShrink: 0 }}
        onMouseOver={e => { if (!infraOpen) e.target.style.color = "#D9027D"; }}
        onMouseOut={e => { if (!infraOpen) e.target.style.color = "#444"; }}
      >◈ INFRA</button>

      {/* Badge powerline */}
      <div style={{ background: "#FCEE0A", color: "#000", padding: "0 10px", display: "flex", alignItems: "center", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", flexShrink: 0 }}>
        NETWATCH
      </div>
      <div style={{ width: 0, height: 0, borderTop: "28px solid transparent", borderLeft: "10px solid #FCEE0A", flexShrink: 0 }}/>

      {/* Tabs */}
      <div style={{ display: "flex", flex: 1, alignItems: "stretch", overflow: "hidden" }}>
        {tabs.map(tab => {
          const active = tab.id === activeTab;
          return (
            <div key={tab.id} onClick={() => onSelect(tab.id)} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "0 12px", background: active ? "#0d0d00" : "transparent", borderRight: "1px solid #111", borderTop: active ? "1px solid #FCEE0A" : "1px solid transparent", color: active ? "#FCEE0A" : "#444", fontSize: "10px", cursor: "pointer", whiteSpace: "nowrap", letterSpacing: "0.05em", userSelect: "none" }}>
              <span style={{ fontSize: "9px", opacity: 0.8 }}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.closeable && (
                <span onClick={e => { e.stopPropagation(); onClose(tab.id); }} style={{ marginLeft: 3, color: "#333", fontSize: "12px", cursor: "pointer" }}
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
          { type: "powershell", label: "+ PS",  color: "#00F0FF" },
          { type: "wsl",        label: "+ WSL", color: "#39FF14" },
          { type: "cmd",        label: "+ CMD", color: "#FCEE0A" },
        ].map(btn => (
          <button key={btn.type} onClick={() => onAdd(btn.type)}
            style={{ background: "transparent", border: "1px solid #1a1a1a", color: "#333", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "1px 7px", cursor: "pointer" }}
            onMouseOver={e => { e.target.style.borderColor = btn.color; e.target.style.color = btn.color; }}
            onMouseOut={e => { e.target.style.borderColor = "#1a1a1a"; e.target.style.color = "#333"; }}
          >{btn.label}</button>
        ))}

        <div style={{ width: 1, height: 14, background: "#1a1a1a", margin: "0 4px" }}/>

        {/* Panel crypto toggle */}
        <button onClick={onTogglePanel} title="Alt+P — Panel Crypto/MEV"
          style={{ background: panelOpen ? "#00F0FF" : "transparent", border: `1px solid ${panelOpen ? "#00F0FF" : "#1a1a1a"}`, color: panelOpen ? "#000" : "#333", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "1px 7px", cursor: "pointer" }}
          onMouseOver={e => { if (!panelOpen) { e.target.style.borderColor = "#00F0FF"; e.target.style.color = "#00F0FF"; } }}
          onMouseOut={e => { if (!panelOpen) { e.target.style.borderColor = "#1a1a1a"; e.target.style.color = "#333"; } }}
        >◈ CRYPTO</button>

        <div style={{ width: 1, height: 14, background: "#1a1a1a", margin: "0 4px" }}/>

        <span style={{ fontSize: "10px", color: "#FCEE0A", letterSpacing: "0.08em" }}>⏱ {time}</span>
      </div>
    </div>
  );
}

function getTime() {
  return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}
