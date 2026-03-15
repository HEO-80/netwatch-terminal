export default function TitleBar({ title = "NETWATCH OS v2.077", subtitle = "HEO-80" }) {

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch { window.close(); }
  };

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().minimize();
    } catch {}
  };

  const handleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      const isMax = await win.isMaximized();
      isMax ? await win.unmaximize() : await win.maximize();
    } catch {}
  };

  const handleMouseDown = async (e) => {
    if (e.target.closest(".nw-dot")) return;
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().startDragging();
    } catch {}
  };

  return (
    <div
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
      }}
    >
      <div style={{ display: "flex", gap: "6px" }}>
        {[
          { color: "#ff5555", action: handleClose,    title: "Close" },
          { color: "#ffcb6b", action: handleMinimize, title: "Minimize" },
          { color: "#4ec994", action: handleMaximize, title: "Fullscreen" },
        ].map((dot) => (
          <span
            key={dot.title}
            className="nw-dot"
            onClick={dot.action}
            title={dot.title}
            style={{
              width: 12, height: 12,
              borderRadius: "50%",
              background: dot.color,
              cursor: "pointer",
              display: "inline-block",
              transition: "filter 0.15s",
            }}
            onMouseOver={e => e.target.style.filter = "brightness(1.5)"}
            onMouseOut={e => e.target.style.filter = "brightness(1)"}
          />
        ))}
      </div>

      <span style={{ color: "var(--cy-dim)", fontSize: "11px" }}>▣</span>

      <span style={{
        flex: 1, textAlign: "center", fontSize: "11px",
        color: "var(--cy-yellow)", letterSpacing: "0.12em",
        textTransform: "uppercase", fontFamily: "var(--font-mono)",
      }}>
        {title}
        {subtitle && <span style={{ color: "var(--cy-dim)", marginLeft: "8px" }}>· {subtitle}</span>}
      </span>

      <span style={{ fontSize: "10px", color: "var(--cy-dim)", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>
        ESC para cerrar
      </span>
    </div>
  );
}
