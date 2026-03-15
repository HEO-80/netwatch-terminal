import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";

const XTERM_THEME = {
  background:          "#050500",
  foreground:          "#FCEE0A",
  cursor:              "#FCEE0A",
  cursorAccent:        "#050500",
  selectionBackground: "rgba(57, 255, 20, 0.2)",
  black:         "#000000",
  red:           "#ff5555",
  green:         "#39FF14",
  yellow:        "#FCEE0A",
  blue:          "#00F0FF",
  magenta:       "#D9027D",
  cyan:          "#00F0FF",
  white:         "#E8E8E8",
  brightBlack:   "#555555",
  brightRed:     "#ff7777",
  brightGreen:   "#57FF33",
  brightYellow:  "#FFF44C",
  brightBlue:    "#33F3FF",
  brightMagenta: "#FF40A0",
  brightCyan:    "#33F3FF",
  brightWhite:   "#ffffff",
};

const WS_URL = "ws://127.0.0.1:7777";

export default function TerminalPane({ active, onBack }) {
  const containerRef = useRef(null);
  const termRef      = useRef(null);
  const fitRef       = useRef(null);
  const wsRef        = useRef(null);
  const reconnTimer  = useRef(null);
  const retries      = useRef(0);

  useEffect(() => {
    if (!containerRef.current || termRef.current) return;

    const term = new Terminal({
      theme:            XTERM_THEME,
      fontFamily:       "'JetBrainsMono Nerd Font', 'JetBrains Mono', 'Cascadia Code', monospace",
      fontSize:         13,
      lineHeight:       1.25,
      cursorBlink:      true,
      cursorStyle:      "block",
      allowTransparency: true,
      scrollback:       10000,
      windowsMode:      true,
    });

    const fitAddon   = new FitAddon();
    const linksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(linksAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current  = fitAddon;

    // Input → WS
    term.onData((data) => send({ type: "input", data }));
    term.onResize(({ cols, rows }) => send({ type: "resize", cols, rows }));

    // ResizeObserver
    const ro = new ResizeObserver(() => fitAddon.fit());
    ro.observe(containerRef.current);

    // Conectar WS
    connect(term, fitAddon);

    return () => {
      ro.disconnect();
      clearTimeout(reconnTimer.current);
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
      term.dispose();
      termRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (active && termRef.current) {
      setTimeout(() => {
        fitRef.current?.fit();
        termRef.current?.focus();
      }, 50);
    }
  }, [active]);

  const send = useCallback((msg) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  const connect = useCallback((term, fitAddon) => {
    if (retries.current === 0) {
      term.writeln("\x1b[38;2;0;240;255m[NETWATCH]\x1b[0m Conectando a PowerShell...");
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      retries.current = 0;
      term.writeln("\x1b[32m✓ Conectado\x1b[0m");
      const { cols, rows } = term;
      send({ type: "resize", cols, rows });
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "output") term.write(msg.data);
        if (msg.type === "exit") term.writeln(`\r\n\x1b[33m[Shell cerrada: ${msg.code}]\x1b[0m`);
      } catch {}
    };

    ws.onclose = (e) => {
      if (e.code === 1000) return;
      retries.current++;
      if (retries.current <= 5) {
        term.writeln(`\r\n\x1b[33m[Reconectando ${retries.current}/5...]\x1b[0m`);
        reconnTimer.current = setTimeout(() => connect(term, fitAddon), 2000);
      } else {
        term.writeln("\r\n\x1b[31m✗ No se pudo conectar al PTY server.\x1b[0m");
      }
    };
  }, [send]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#050500", overflow: "hidden" }}>
      {/* Barra info */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "3px 12px", background: "#000",
        borderBottom: "1px solid #111", flexShrink: 0,
        fontFamily: "var(--font-mono)", fontSize: "10px", color: "#444",
        userSelect: "none",
      }}>
        <span style={{ color: "#39FF14" }}>●</span>
        <span>powershell · netwatch@HEO-80</span>
        <div style={{ flex: 1 }}/>
        <span style={{ color: "#222" }}>ws://127.0.0.1:7777</span>
      </div>

      {/* xterm container */}
      <div
        ref={containerRef}
        style={{ flex: 1, padding: "6px 4px 4px 8px", overflow: "hidden" }}
        onClick={() => termRef.current?.focus()}
      />

      {/* Hints */}
      <div style={{
        padding: "2px 12px", background: "#000",
        borderTop: "1px solid #111", flexShrink: 0,
        fontFamily: "var(--font-mono)", fontSize: "10px",
        color: "#333", display: "flex", gap: "14px", userSelect: "none",
      }}>
        <span><span style={{ color: "#FCEE0A" }}>Tab</span> completar</span>
        <span><span style={{ color: "#FCEE0A" }}>→</span> sugerencia</span>
        <span><span style={{ color: "#FCEE0A" }}>Ctrl+T</span> fzf</span>
        <span><span style={{ color: "#FCEE0A" }}>Ctrl+R</span> historial</span>
        <span><span style={{ color: "#FCEE0A" }}>z dir</span> saltar</span>
        <div style={{ flex: 1 }}/>
        <span><span style={{ color: "#555" }}>Alt+T</span> dashboard</span>
      </div>
    </div>
  );
}
