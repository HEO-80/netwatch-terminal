import { useState, useEffect } from "react";

export default function StatusBar({ user = "Usuario", screen = "dashboard" }) {
  const [time, setTime] = useState(getTime());

  useEffect(() => {
    const t = setInterval(() => setTime(getTime()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      height: "26px",
      background: "#000000",
      borderTop: "1px solid #00F0FF",
      flexShrink: 0,
      fontFamily: "var(--font-mono)",
      fontSize: "11px",
      overflow: "hidden",
      userSelect: "none",
    }}>
      {/* NETWATCH badge */}
      <div style={{
        background: "#FCEE0A",
        color: "#000",
        padding: "0 12px",
        height: "100%",
        display: "flex",
        alignItems: "center",
        fontWeight: 700,
        letterSpacing: "0.08em",
        flexShrink: 0,
      }}>
        NETWATCH
      </div>

      {/* Arrow separator */}
      <div style={{
        width: 0, height: 0,
        borderTop: "13px solid transparent",
        borderBottom: "13px solid transparent",
        borderLeft: "10px solid #FCEE0A",
        flexShrink: 0,
      }}/>

      {/* User */}
      <div style={{
        background: "#D9027D",
        color: "#fff",
        padding: "0 10px",
        height: "100%",
        display: "flex",
        alignItems: "center",
        fontWeight: 700,
        letterSpacing: "0.06em",
        flexShrink: 0,
        gap: "4px",
      }}>
        {user} ⚡
      </div>

      {/* Arrow */}
      <div style={{
        width: 0, height: 0,
        borderTop: "13px solid transparent",
        borderBottom: "13px solid transparent",
        borderLeft: "10px solid #D9027D",
        flexShrink: 0,
      }}/>

      {/* Screen indicator */}
      <div style={{
        padding: "0 12px",
        color: screen === "terminal" ? "#39FF14" : "#00F0FF",
        letterSpacing: "0.08em",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}>
        <span style={{
          width: 6, height: 6,
          borderRadius: "50%",
          background: screen === "terminal" ? "#39FF14" : "#00F0FF",
          display: "inline-block",
          boxShadow: screen === "terminal" ? "0 0 6px #39FF14" : "0 0 6px #00F0FF",
        }}/>
        {screen === "terminal" ? "TERMINAL" : "DASHBOARD"}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }}/>

      {/* Clock */}
      <div style={{
        padding: "0 14px",
        color: "#FCEE0A",
        letterSpacing: "0.08em",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        height: "100%",
        borderLeft: "1px solid #222",
      }}>
        <span style={{ color: "#555" }}>⏱</span>
        {time}
      </div>
    </div>
  );
}

function getTime() {
  return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}
