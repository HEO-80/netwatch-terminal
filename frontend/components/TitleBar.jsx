import { invoke } from "@tauri-apps/api/tauri";
import { appWindow } from "@tauri-apps/api/window";

export default function TitleBar({ title = "NETWATCH OS v2.077", subtitle = "" }) {
  const handleClose    = () => invoke("close_window");
  const handleMinimize = () => invoke("minimize_window");
  const handleMaximize = () => invoke("toggle_fullscreen");

  // Drag — Tauri built-in
  const handleMouseDown = (e) => {
    if (e.target.closest(".nw-dot")) return;
    appWindow.startDragging();
  };

  return (
    <div
      className="nw-titlebar"
      onMouseDown={handleMouseDown}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "10px 16px",
        background: "var(--cy-bg2)",
        borderBottom: "1px solid var(--cy-border2)",
        flexShrink: 0,
        cursor: "grab",
        userSelect: "none",
        WebkitAppRegion: "drag",
      }}
    >
      {/* macOS dots */}
      <div style={{ display: "flex", gap: "6px", WebkitAppRegion: "no-drag" }}>
        <span
          className="nw-dot"
          onClick={handleClose}
          title="Close"
          style={{
            width: 12, height: 12, borderRadius: "50%",
            background: "#ff5555", cursor: "pointer",
            transition: "filter 0.15s",
          }}
          onMouseOver={e => e.target.style.filter = "brightness(1.5)"}
          onMouseOut={e => e.target.style.filter = "brightness(1)"}
        />
        <span
          className="nw-dot"
          onClick={handleMinimize}
          title="Minimize"
          style={{
            width: 12, height: 12, borderRadius: "50%",
            background: "#ffcb6b", cursor: "pointer",
            transition: "filter 0.15s",
          }}
          onMouseOver={e => e.target.style.filter = "brightness(1.5)"}
          onMouseOut={e => e.target.style.filter = "brightness(1)"}
        />
        <span
          className="nw-dot"
          onClick={handleMaximize}
          title="Fullscreen"
          style={{
            width: 12, height: 12, borderRadius: "50%",
            background: "#4ec994", cursor: "pointer",
            transition: "filter 0.15s",
          }}
          onMouseOver={e => e.target.style.filter = "brightness(1.5)"}
          onMouseOut={e => e.target.style.filter = "brightness(1)"}
        />
      </div>

      {/* Terminal icon */}
      <span style={{ color: "var(--cy-dim)", fontSize: "11px" }}>▣</span>

      {/* Title */}
      <span style={{
        flex: 1,
        textAlign: "center",
        fontSize: "11px",
        color: "var(--cy-yellow)",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        fontFamily: "var(--font-mono)",
      }}>
        {title}
        {subtitle && (
          <span style={{ color: "var(--cy-dim)", marginLeft: "8px" }}>
            — {subtitle}
          </span>
        )}
      </span>

      {/* ESC hint */}
      <span style={{
        fontSize: "10px",
        color: "var(--cy-dim)",
        letterSpacing: "0.06em",
        fontFamily: "var(--font-mono)",
        WebkitAppRegion: "no-drag",
      }}>
        ESC para cerrar
      </span>
    </div>
  );
}
