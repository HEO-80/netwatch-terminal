// pty-server.js
// Servidor WebSocket que conecta xterm.js con PowerShell real via node-pty
// Tauri lo lanza como sidecar al arrancar la app

const { WebSocketServer } = require("ws");
const pty = require("node-pty");
const os  = require("os");
const path = require("path");

const PORT = 7777;
const wss  = new WebSocketServer({ port: PORT, host: "127.0.0.1" });

console.log(`[NETWATCH PTY] Servidor escuchando en ws://127.0.0.1:${PORT}`);

wss.on("connection", (ws) => {
  console.log("[NETWATCH PTY] Cliente conectado");

  // ── Arrancar PowerShell con el profile Cyberpunk2077 ──────────────────
  const shell = "pwsh.exe";

  // Pasar TemaActivo para que profile.ps1 cargue Cyberpunk2077
  const env = {
    ...process.env,
    TemaActivo: "Cyberpunk2077",
    TERM: "xterm-256color",
  };

  const ptyProcess = pty.spawn(shell, [], {
    name: "xterm-256color",
    cols: 120,
    rows: 30,
    cwd: os.homedir(),
    env,
    // Windows: usar ConPTY para compatibilidad total con Oh My Posh
    useConpty: false,
  });

  // ── PTY → WebSocket (output de PowerShell al frontend) ───────────────
  ptyProcess.onData((data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: "output", data }));
    }
  });

  ptyProcess.onExit(({ exitCode }) => {
    console.log(`[NETWATCH PTY] Shell cerrada con código ${exitCode}`);
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: "exit", code: exitCode }));
      ws.close();
    }
  });

  // ── WebSocket → PTY (input del frontend a PowerShell) ─────────────────
  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      switch (msg.type) {
        // Teclas / caracteres del usuario
        case "input":
          ptyProcess.write(msg.data);
          break;

        // Redimensionar terminal (cuando el usuario cambia tamaño ventana)
        case "resize":
          ptyProcess.resize(
            Math.max(1, msg.cols),
            Math.max(1, msg.rows)
          );
          break;

        // Ping keepalive
        case "ping":
          ws.send(JSON.stringify({ type: "pong" }));
          break;
      }
    } catch (e) {
      console.error("[NETWATCH PTY] Error parseando mensaje:", e.message);
    }
  });

  ws.on("close", () => {
    console.log("[NETWATCH PTY] Cliente desconectado — matando shell");
    try { ptyProcess.kill(); } catch {}
  });

  ws.on("error", (err) => {
    console.error("[NETWATCH PTY] WebSocket error:", err.message);
  });
});

wss.on("error", (err) => {
  console.error("[NETWATCH PTY] Server error:", err.message);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[NETWATCH PTY] SIGTERM recibido — cerrando");
  wss.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  wss.close(() => process.exit(0));
});
