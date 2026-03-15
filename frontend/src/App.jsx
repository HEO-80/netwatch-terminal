import { useState, useEffect, useRef } from "react";
import TitleBar from "./components/TitleBar";
import Dashboard from "./components/Dashboard";
import TerminalPane from "./components/Terminal";
import StatusBar from "./components/StatusBar";
import "./styles/themes.css";

export default function App() {
  const [screen, setScreen] = useState("dashboard");

  // ── Teclado global ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      // ESC — volver al dashboard desde terminal
      if (e.key === "Escape" && screen === "terminal") {
        e.preventDefault();
        setScreen("dashboard");
        return;
      }
      // Alt+T — toggle entre dashboard y terminal
      if (e.altKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        setScreen(s => s === "dashboard" ? "terminal" : "dashboard");
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen]);

  return (
    <div
      data-tauri-drag-region
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
        background: "#050500",
        border: "1px solid #00F0FF",
        overflow: "hidden",
        boxShadow: "0 0 0 1px rgba(0,240,255,0.15), 0 0 40px rgba(0,240,255,0.05)",
        position: "relative",
      }}
    >
      {/* Scanlines */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999,
        background: "repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)",
      }}/>

      {/* Corner marks magenta */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100 }}>
        <div style={{ position: "absolute", top: 6, left: 6, width: 16, height: 16, borderTop: "2px solid #D9027D", borderLeft: "2px solid #D9027D" }}/>
        <div style={{ position: "absolute", top: 6, right: 6, width: 16, height: 16, borderTop: "2px solid #D9027D", borderRight: "2px solid #D9027D" }}/>
        <div style={{ position: "absolute", bottom: 6, left: 6, width: 16, height: 16, borderBottom: "2px solid #D9027D", borderLeft: "2px solid #D9027D" }}/>
        <div style={{ position: "absolute", bottom: 6, right: 6, width: 16, height: 16, borderBottom: "2px solid #D9027D", borderRight: "2px solid #D9027D" }}/>
      </div>

      {/* Title bar — drag region principal */}
      <TitleBar
        title="NETWATCH OS V2.077"
        subtitle="HEO-80"
        screen={screen}
        onToggle={() => setScreen(s => s === "dashboard" ? "terminal" : "dashboard")}
      />

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {screen === "dashboard"
          ? <Dashboard onLaunchTerminal={() => setScreen("terminal")} />
          : <TerminalPane active={true} onBack={() => setScreen("dashboard")} />
        }
      </div>

      {/* Status bar */}
      <StatusBar user="Usuario" screen={screen} />
    </div>
  );
}
