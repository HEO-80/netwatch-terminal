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
  black:   "#000000", red:     "#ff5555", green:   "#39FF14",
  yellow:  "#FCEE0A", blue:    "#00F0FF", magenta: "#D9027D",
  cyan:    "#00F0FF", white:   "#E8E8E8",
  brightBlack: "#555", brightRed: "#ff7777", brightGreen: "#57FF33",
  brightYellow: "#FFF44C", brightBlue: "#33F3FF",
  brightMagenta: "#FF40A0", brightCyan: "#33F3FF", brightWhite: "#ffffff",
};

// Cada tab tiene su propia conexión WS al PTY server
// El servidor distingue las sesiones por el parámetro ?shell=
const WS_BASE = "ws://127.0.0.1:7777";

const SHELL_LABELS = {
  "pwsh.exe": { name: "PowerShell", color: "#00F0FF" },
  "wsl.exe":  { name: "WSL/bash",   color: "#39FF14" },
  "cmd.exe":  { name: "CMD",        color: "#FCEE0A" },
};

export default function TerminalPane({ tabId, shell = "pwsh.exe", active }) {
  const containerRef = useRef(null);
  const termRef      = useRef(null);
  const fitRef       = useRef(null);
  const wsRef        = useRef(null);
  const reconnTimer  = useRef(null);
  const retries      = useRef(0);
  const initialized  = useRef(false);

  const shellInfo = SHELL_LABELS[shell] || SHELL_LABELS["pwsh.exe"];

  useEffect(() => {
    if (!containerRef.current || initialized.current) return;
    initialized.current = true;

    const term = new Terminal({
      theme:            XTERM_THEME,
      fontFamily:       "'JetBrainsMono Nerd Font', 'JetBrains Mono', 'Cascadia Code', monospace",
      fontSize:         13,
      lineHeight:       1.25,
      cursorBlink:      true,
      cursorStyle:      "block",
      allowTransparency: true,
      scrollback:       10000,
      windowsMode:      shell !== "wsl.exe",
    });

    const fitAddon   = new FitAddon();
    const linksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(linksAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current  = fitAddon;

    term.onData((data) => send({ type: "input", data }));
    term.onResize(({ cols, rows }) => send({ type: "resize", cols, rows }));

    const ro = new ResizeObserver(() => fitAddon.fit());
    ro.observe(containerRef.current);

    connect(term, fitAddon);

    return () => {
      ro.disconnect();
      clearTimeout(reconnTimer.current);
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
      term.dispose();
      termRef.current = null;
      initialized.current = false;
    };
  }, []);

  // Focus + fit cuando se activa
  useEffect(() => {
    if (active) {
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
    const wsUrl = `${WS_BASE}?shell=${encodeURIComponent(shell)}&id=${tabId}`;

    if (retries.current === 0) {
      const c = shellInfo.color;
      term.writeln(`\x1b[38;2;0;240;255m[NETWATCH]\x1b[0m Conectando a \x1b[${c}m${shellInfo.name}\x1b[0m...`);
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      retries.current = 0;
      term.writeln(`\x1b[32m✓ Conectado — ${shellInfo.name}\x1b[0m`);
      send({ type: "resize", cols: termRef.current.cols, rows: termRef.current.rows });
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "output") term.write(msg.data);
        if (msg.type === "exit")   term.writeln(`\r\n\x1b[33m[Shell cerrada: código ${msg.code}]\x1b[0m`);
      } catch {}
    };

    ws.onclose = (e) => {
      if (e.code === 1000) return;
      retries.current++;
      if (retries.current <= 5) {
        term.writeln(`\r\n\x1b[33m[Reconectando ${retries.current}/5...]\x1b[0m`);
        reconnTimer.current = setTimeout(() => connect(term, fitAddon), 2000);
      } else {
        term.writeln("\r\n\x1b[31m✗ Sin conexión al PTY server.\x1b[0m");
      }
    };
  }, [shell, tabId, shellInfo]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#050500", overflow: "hidden" }}>
      {/* Info bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "3px 12px", background: "#000",
        borderBottom: "1px solid #111", flexShrink: 0,
        fontFamily: "var(--font-mono)", fontSize: "10px",
        color: "#444", userSelect: "none",
      }}>
        <span style={{ color: shellInfo.color, fontSize: "8px" }}>●</span>
        <span style={{ color: shellInfo.color }}>{shellInfo.name}</span>
        <span>·</span>
        <span>netwatch@HEO-80</span>
        <div style={{ flex: 1 }}/>
        <span style={{ color: "#222" }}>ws://127.0.0.1:7777</span>
      </div>

      {/* xterm */}
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
        <span><span style={{ color: "#FCEE0A" }}>Ctrl+T</span> fzf archivos</span>
        <span><span style={{ color: "#FCEE0A" }}>Ctrl+R</span> fzf historial</span>
        <span><span style={{ color: "#FCEE0A" }}>z dir</span> saltar carpeta</span>
        <div style={{ flex: 1 }}/>
        <span><span style={{ color: "#555" }}>Alt+T</span> nueva PS</span>
        <span><span style={{ color: "#555" }}>Alt+D</span> dashboard</span>
      </div>
    </div>
  );
}
