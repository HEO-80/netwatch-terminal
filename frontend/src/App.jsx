import { useState } from "react";
import TitleBar from "./components/TitleBar";
import Dashboard from "./components/Dashboard";
import TerminalPane from "./components/Terminal";
import StatusBar from "./components/StatusBar";
import "./styles/themes.css";

const TABS = ["dashboard", "terminal"];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      width: "100vw",
      height: "100vh",
      background: "var(--cy-bg)",
      border: "1px solid var(--cy-border2)",
      borderRadius: "8px",
      overflow: "hidden",
      boxShadow: "0 0 60px var(--cy-glow-yellow), 0 32px 80px rgba(0,0,0,0.9)",
    }}>
      {/* Scanlines */}
      <div className="cy-scanlines" />

      {/* Title bar */}
      <TitleBar title="NETWATCH OS v2.077" subtitle="HEO-80" />

      {/* Tab bar */}
      <div style={{
        display: "flex",
        gap: "0",
        background: "var(--cy-bg2)",
        borderBottom: "1px solid var(--cy-border2)",
        padding: "0 16px",
        flexShrink: 0,
      }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab ? "2px solid var(--cy-yellow)" : "2px solid transparent",
              color: activeTab === tab ? "var(--cy-yellow)" : "var(--cy-dim)",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "8px 16px",
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            {tab === "dashboard" ? "▣ Dashboard" : "▸ Terminal"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {activeTab === "dashboard" ? (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <Dashboard />
          </div>
        ) : (
          <TerminalPane active={activeTab === "terminal"} />
        )}
      </div>

      {/* Status bar */}
      <StatusBar user="Usuario" cwd="~" />
    </div>
  );
}
