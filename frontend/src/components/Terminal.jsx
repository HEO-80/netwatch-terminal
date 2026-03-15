import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
// import { invoke } from "@tauri-apps/api/tauri";
import { customCommands } from "../commands/custom";
import { invoke } from "@tauri-apps/api/core";
// xterm.js theme — Cyberpunk 2077 palette

const XTERM_THEME = {
  background:    "#0b0a00",
  foreground:    "#FCEE0A",
  cursor:        "#FCEE0A",
  cursorAccent:  "#0b0a00",
  selectionBackground: "rgba(252, 238, 10, 0.2)",
  black:         "#000000",
  red:           "#ff5555",
  green:         "#39FF14",
  yellow:        "#FCEE0A",
  blue:          "#00F0FF",
  magenta:       "#D9027D",
  cyan:          "#00F0FF",
  white:         "#E8E8E8",
  brightBlack:   "#666666",
  brightRed:     "#ff7777",
  brightGreen:   "#57FF33",
  brightYellow:  "#FFf44c",
  brightBlue:    "#33F3FF",
  brightMagenta: "#FF40A0",
  brightCyan:    "#33F3FF",
  brightWhite:   "#ffffff",
};

const PROMPT = "\x1b[38;2;184;172;8mnetwatch\x1b[0m\x1b[38;2;217;2;125m@HEO-80\x1b[0m\x1b[38;2;102;102;102m:\x1b[0m\x1b[38;2;252;238;10m~\x1b[0m\x1b[38;2;102;102;102m$\x1b[0m ";

export default function TerminalPane({ active }) {
  const containerRef = useRef(null);
  const xtermRef     = useRef(null);
  const fitRef       = useRef(null);
  const inputRef     = useRef("");
  const historyRef   = useRef([]);
  const histIdxRef   = useRef(-1);
  const cwdRef       = useRef("~");
  const [cwd, setCwd] = useState("~");

  useEffect(() => {
    if (!containerRef.current || xtermRef.current) return;

    // Init xterm
    const term = new XTerm({
      theme: XTERM_THEME,
      fontFamily:  "'JetBrains Mono', 'Cascadia Code', monospace",
      fontSize:    13,
      lineHeight:  1.6,
      cursorBlink: true,
      cursorStyle: "block",
      allowTransparency: true,
      scrollback: 5000,
    });

    const fitAddon   = new FitAddon();
    const linksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(linksAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitRef.current   = fitAddon;

    // Print prompt
    term.write(PROMPT);

    // Handle input
    term.onData((data) => {
      const code = data.charCodeAt(0);

      if (data === "\r") {
        // Enter
        const cmd = inputRef.current.trim();
        term.write("\r\n");

        if (cmd) {
          historyRef.current.unshift(cmd);
          histIdxRef.current = -1;
          handleCommand(cmd, term);
        } else {
          term.write(PROMPT);
        }
        inputRef.current = "";

      } else if (data === "\x7F") {
        // Backspace
        if (inputRef.current.length > 0) {
          inputRef.current = inputRef.current.slice(0, -1);
          term.write("\b \b");
        }

      } else if (data === "\x1B[A") {
        // Arrow up — history
        const next = Math.min(histIdxRef.current + 1, historyRef.current.length - 1);
        if (next >= 0) {
          clearInput(term);
          histIdxRef.current = next;
          inputRef.current = historyRef.current[next];
          term.write(inputRef.current);
        }

      } else if (data === "\x1B[B") {
        // Arrow down — history
        const next = Math.max(histIdxRef.current - 1, -1);
        clearInput(term);
        histIdxRef.current = next;
        inputRef.current = next === -1 ? "" : historyRef.current[next];
        term.write(inputRef.current);

      } else if (data === "\x09") {
        // Tab — autocomplete
        const partial = inputRef.current;
        const cmds = Object.keys(customCommands).concat(["help", "clear", "pwd", "ls", "cd", "exit"]);
        const match = cmds.find((c) => c.startsWith(partial) && c !== partial);
        if (match) {
          clearInput(term);
          inputRef.current = match;
          term.write(match);
        }

      } else if (code >= 32) {
        // Printable char
        inputRef.current += data;
        term.write(data);
      }
    });

    // Resize observer
    const ro = new ResizeObserver(() => fitAddon.fit());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      term.dispose();
      xtermRef.current = null;
    };
  }, []);

  // Focus when tab becomes active
  useEffect(() => {
    if (active) xtermRef.current?.focus();
  }, [active]);

  async function handleCommand(raw, term) {
    const parts = raw.trim().split(/\s+/);
    const cmd   = parts[0].toLowerCase();
    const args  = parts.slice(1);

    // ── Built-in commands ────────────────────────────────────────────────────
    if (cmd === "clear" || cmd === "cls") {
      term.clear();
      term.write(PROMPT);
      return;
    }

    if (cmd === "exit") {
      term.write("\x1b[38;2;252;238;10mCerrando NETWATCH...\x1b[0m\r\n");
      setTimeout(() => invoke("close_window"), 800);
      return;
    }

    if (cmd === "pwd") {
      term.write(`\x1b[38;2;0;240;255m${cwdRef.current}\x1b[0m\r\n`);
      term.write(PROMPT);
      return;
    }

    // ── Custom commands ──────────────────────────────────────────────────────
    if (customCommands[cmd]) {
      await customCommands[cmd]({ args, term, write: (s) => term.write(s), writeln: (s) => term.write(s + "\r\n"), invoke });
      term.write("\r\n" + PROMPT);
      return;
    }

    // ── Help ─────────────────────────────────────────────────────────────────
    if (cmd === "help" || cmd === "help-ps") {
      printHelp(term);
      term.write(PROMPT);
      return;
    }

    // ── Fallback: ejecutar en PowerShell real ────────────────────────────────
    term.write(`\x1b[38;2;102;102;102mEjecutando: ${raw}\x1b[0m\r\n`);
    try {
      const result = await invoke("run_powershell", { command: raw });
      if (result.stdout) {
        const lines = result.stdout.replace(/\r\n/g, "\n").split("\n");
        for (const line of lines) {
          if (line) term.write(line + "\r\n");
        }
      }
      if (result.stderr && !result.success) {
        term.write(`\x1b[38;2;255;85;85m${result.stderr}\x1b[0m\r\n`);
      }
    } catch (e) {
      term.write(`\x1b[38;2;255;85;85mError: ${e}\x1b[0m\r\n`);
    }
    term.write(PROMPT);
  }

  function clearInput(term) {
    const len = inputRef.current.length;
    term.write("\b \b".repeat(len));
  }

  function printHelp(term) {
    const cy = (hex, text) => {
      const r = parseInt(hex.slice(1,3),16);
      const g = parseInt(hex.slice(3,5),16);
      const b = parseInt(hex.slice(5,7),16);
      return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
    };
    const Y = (t) => cy("#FCEE0A", t);
    const G = (t) => cy("#39FF14", t);
    const D = (t) => cy("#666666", t);

    term.write(Y("Comandos disponibles:") + "\r\n");
    term.write("\r\n");
    const cmds = [
      ["help",      "mostrar comandos"],
      ["whoami",    "perfil del operativo"],
      ["projects",  "listar repositorios"],
      ["skills",    "módulos instalados"],
      ["contact",   "canales de comunicación"],
      ["status",    "estado del sistema"],
      ["bee",       "conectar a Beelink via SSH"],
      ["clear",     "limpiar pantalla"],
      ["exit",      "cerrar NETWATCH"],
    ];
    for (const [c, desc] of cmds) {
      term.write(`  ${Y(c.padEnd(14))}${D("→")} ${G(desc)}\r\n`);
    }
    term.write("\r\n");
  }

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        padding: "8px 4px 4px",
        overflow: "hidden",
        background: "var(--cy-bg)",
      }}
    />
  );
}
