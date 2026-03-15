import { useState, useEffect } from "react";

export default function StatusBar({ user = "Usuario", cwd = "~" }) {
  const [time, setTime] = useState(getTime());

  useEffect(() => {
    const interval = setInterval(() => setTime(getTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0",
      height: "28px",
      background: "#000000",
      borderTop: "1px solid var(--cy-border2)",
      flexShrink: 0,
      fontFamily: "var(--font-mono)",
      fontSize: "12px",
      overflow: "hidden",
    }}>
      {/* NETWATCH segment */}
      <Segment
        text="NETWATCH"
        bg="var(--cy-yellow)"
        color="#000000"
        arrow
        arrowColor="var(--cy-magenta)"
      />

      {/* User segment */}
      <Segment
        text={`${user} ⚡`}
        bg="var(--cy-magenta)"
        color="#ffffff"
        arrow
        arrowColor="#1a1a1a"
      />

      {/* Separator */}
      <Segment
        text="▌"
        bg="#1a1a1a"
        color="var(--cy-magenta)"
        arrow={false}
      />

      {/* CWD */}
      <Segment
        text={` ${cwd} `}
        bg="#1a1a1a"
        color="var(--cy-white)"
        arrow
        arrowColor="#000000"
      />

      {/* Spacer */}
      <div style={{ flex: 1, background: "#000000" }} />

      {/* Clock */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "0 12px",
        color: "var(--cy-yellow)",
        background: "#000000",
      }}>
        <span style={{ color: "var(--cy-dim)" }}>⏱</span>
        <span>{time}</span>
      </div>
    </div>
  );
}

function Segment({ text, bg, color, arrow, arrowColor }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      background: bg,
      color,
      padding: "0 10px",
      height: "100%",
      fontWeight: 700,
      letterSpacing: "0.06em",
      whiteSpace: "nowrap",
      position: "relative",
    }}>
      {text}
      {arrow && (
        <span style={{
          position: "absolute",
          right: -9,
          color: bg,
          fontSize: "18px",
          lineHeight: "1",
          zIndex: 2,
          textShadow: `1px 0 0 ${arrowColor}`,
        }}>
          ❯
        </span>
      )}
    </div>
  );
}

function getTime() {
  return new Date().toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
