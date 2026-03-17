import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { handleNwCommand } from "../commands/nw-commands";

// ── Xterm theme — paleta original NETWATCH con filosofía minimalista ──────────
// UN color = UN significado. Nunca decorativo.
const XTERM_THEME = {
  background:          "#080700",
  foreground:          "#E8E8E8",   // texto base — blanco suave
  cursor:              "#FCEE0A",   // cursor amarillo NETWATCH
  cursorAccent:        "#080700",
  selectionBackground: "rgba(57,255,20,0.15)",
  selectionForeground: "#E8E8E8",

  // ANSI — con significado fijo
  black:         "#546E7A",   // gris — sugerencias PSReadLine
  red:           "#ff5555",   // errores
  green:         "#39FF14",   // éxito / bash
  yellow:        "#FCEE0A",   // NETWATCH brand / PS prompt
  blue:          "#00F0FF",   // rutas / CMD — reutilizamos cyan
  magenta:       "#D9027D",   // git / acciones
  cyan:          "#00F0FF",   // rutas / info
  white:         "#E8E8E8",   // texto base

  brightBlack:   "#2a3a3a",   // muy dim
  brightRed:     "#ff5555",
  brightGreen:   "#39FF14",
  brightYellow:  "#FCEE0A",
  brightBlue:    "#00F0FF",
  brightMagenta: "#D9027D",
  brightCyan:    "#00F0FF",
  brightWhite:   "#FFFFFF",
};

// Cada shell tiene su color de identidad — solo para el dot y el nombre
const SHELL_CONFIG = {
  "pwsh.exe": { name: "PowerShell", color: "#FCEE0A", ansi: "\x1b[33m" },
  "wsl.exe":  { name: "WSL/bash",   color: "#39FF14", ansi: "\x1b[32m" },
  "cmd.exe":  { name: "CMD",        color: "#00F0FF", ansi: "\x1b[36m" },
};

const WS_BASE = "ws://127.0.0.1:7777";

export default function TerminalPane({ tabId, shell = "pwsh.exe", active }) {
  const containerRef = useRef(null);
  const termRef      = useRef(null);
  const fitRef       = useRef(null);
  const wsRef        = useRef(null);
  const reconnTimer  = useRef(null);
  const retries      = useRef(0);
  const initialized  = useRef(false);
  const inputBuffer  = useRef("");

  const sc = SHELL_CONFIG[shell] || SHELL_CONFIG["pwsh.exe"];

  useEffect(() => {
    if (!containerRef.current || initialized.current) return;
    initialized.current = true;

    const term = new Terminal({
      theme: XTERM_THEME,
      fontFamily: "'JetBrainsMono Nerd Font', 'JetBrains Mono', 'Cascadia Code', monospace",
      fontSize: 13, lineHeight: 1.3, cursorBlink: true, cursorStyle: "block",
      allowTransparency: true, scrollback: 10000,
      windowsMode: shell !== "wsl.exe",
    });

    const fitAddon   = new FitAddon();
    const linksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(linksAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current  = fitAddon;

    term.onData(async (data) => {
      const code = data.charCodeAt(0);
      if (data === "\r") {
        const input = inputBuffer.current;
        inputBuffer.current = "";
        if (input.trim().startsWith("nw")) {
          term.write("\r\n");
          await handleNwCommand(input, (t) => term.write(t), (cmd) => sendToShell({ type: "input", data: cmd }));
          sendToShell({ type: "input", data: "" });
          return;
        }
        inputBuffer.current = "";
        sendToShell({ type: "input", data });
        return;
      }
      if (data === "\x7f") { if (inputBuffer.current.length > 0) inputBuffer.current = inputBuffer.current.slice(0,-1); sendToShell({ type: "input", data }); return; }
      if (data === "\x03") { inputBuffer.current = ""; sendToShell({ type: "input", data }); return; }
      if (code >= 32 || data === "\t") inputBuffer.current += data;
      sendToShell({ type: "input", data });
    });

    term.onResize(({ cols, rows }) => sendToShell({ type: "resize", cols, rows }));

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

  useEffect(() => {
    if (active) setTimeout(() => { fitRef.current?.fit(); termRef.current?.focus(); }, 50);
  }, [active]);

  const sendToShell = useCallback((msg) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  const connect = useCallback((term, fitAddon) => {
    if (retries.current === 0) {
      term.writeln(`\x1b[36m[NETWATCH]\x1b[0m Conectando a ${sc.ansi}${sc.name}\x1b[0m...`);
    }
    const ws = new WebSocket(`${WS_BASE}?shell=${encodeURIComponent(shell)}&id=${tabId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      retries.current = 0;
      term.writeln(`${sc.ansi}✓ Conectado — ${sc.name}\x1b[0m`);
      term.writeln(`\x1b[38;5;66m  Escribe 'nw help' para ver comandos propios.\x1b[0m`);
      sendToShell({ type: "resize", cols: termRef.current.cols, rows: termRef.current.rows });
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "output") term.write(msg.data);
        if (msg.type === "exit")   term.writeln(`\r\n\x1b[33m[Shell cerrada: ${msg.code}]\x1b[0m`);
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
  }, [shell, tabId, sc, sendToShell]);

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:"#080700", overflow:"hidden" }}>

      {/* Info bar — dot y nombre con color del shell */}
      <div style={{
        display:"flex", alignItems:"center", gap:"8px",
        padding:"3px 12px", background:"#0b0a00",
        borderBottom:"1px solid #1a1a00", flexShrink:0,
        fontFamily:"var(--font-mono)", fontSize:"10px", userSelect:"none",
      }}>
        <span style={{ color: sc.color, fontSize:"8px" }}>●</span>
        <span style={{ color: sc.color }}>{sc.name}</span>
        <span style={{ color:"#2a3a3a" }}>·</span>
        <span style={{ color:"#546E7A" }}>netwatch@HEO-80</span>
        <div style={{ flex:1 }}/>
        <span style={{ color:"#1a1a00" }}>ws://127.0.0.1:7777</span>
      </div>

      {/* xterm */}
      <div
        ref={containerRef}
        style={{ flex:1, padding:"8px 4px 4px 10px", overflow:"hidden", background:"#080700" }}
        onClick={() => termRef.current?.focus()}
      />

      {/* Hints */}
      <div style={{
        padding:"3px 12px", background:"#0b0a00", borderTop:"1px solid #1a1a00",
        flexShrink:0, fontFamily:"var(--font-mono)", fontSize:"9px",
        display:"flex", gap:"14px", userSelect:"none", color:"#2a3a3a",
      }}>
        <span><span style={{color:"#FCEE0A"}}>nw help</span></span>
        <span><span style={{color:"#FCEE0A"}}>nw ai</span></span>
        <span style={{color:"#1a1a00"}}>|</span>
        <span><span style={{color:"#00F0FF"}}>Tab</span> completar</span>
        <span><span style={{color:"#546E7A"}}>→</span> sugerencia</span>
        <span><span style={{color:"#D9027D"}}>Ctrl+R</span> historial</span>
        <span><span style={{color:"#39FF14"}}>z dir</span> saltar</span>
        <div style={{flex:1}}/>
        <span style={{color:"#2a3a3a"}}>Alt+T · Alt+P · Alt+I</span>
      </div>
    </div>
  );
}
