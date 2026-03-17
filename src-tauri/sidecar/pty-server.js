// pty-server.js v2
// Multi-sesión: cada WebSocket connection lanza su propia shell
// Shell seleccionable por query param: ws://127.0.0.1:7777?shell=pwsh.exe

const { WebSocketServer } = require("ws");
const { URL }             = require("url");
const pty                 = require("node-pty");
const os                  = require("os");

const PORT = 7777;
const wss  = new WebSocketServer({ port: PORT, host: "127.0.0.1" });

console.log(`[NETWATCH PTY] v2 — Servidor en ws://127.0.0.1:${PORT}`);

const SHELLS = {
  "pwsh.exe": { exe: "pwsh.exe",  args: [],         env: { TemaActivo: "Cyberpunk2077" } },
  "wsl.exe":  { exe: "wsl.exe",   args: [],         env: {} },
  "cmd.exe":  { exe: "cmd.exe",   args: [],         env: {} },
};

wss.on("connection", (ws, req) => {
  // Parsear shell del query param
  const params   = new URL(req.url, "http://localhost").searchParams;
  const shellKey = params.get("shell") || "pwsh.exe";
  const tabId    = params.get("id")    || "?";
  const config   = SHELLS[shellKey] || SHELLS["pwsh.exe"];

  console.log(`[NETWATCH PTY] Tab ${tabId} conectado — shell: ${shellKey}`);

  const env = { ...process.env, TERM: "xterm-256color", ...config.env };

  let ptyProcess;
  try {
    ptyProcess = pty.spawn(config.exe, config.args, {
      name:      "xterm-256color",
      cols:      120,
      rows:      30,
      cwd:       os.homedir(),
      env,
      useConpty: false,
    });
  } catch (err) {
    console.error(`[NETWATCH PTY] Error arrancando ${shellKey}:`, err.message);
    ws.send(JSON.stringify({ type: "output", data: `\r\n\x1b[31mError arrancando ${shellKey}: ${err.message}\x1b[0m\r\n` }));
    ws.close();
    return;
  }

  // PTY → WS
  ptyProcess.onData((data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: "output", data }));
    }
  });

  ptyProcess.onExit(({ exitCode }) => {
    console.log(`[NETWATCH PTY] Tab ${tabId} shell cerrada (${exitCode})`);
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: "exit", code: exitCode }));
      ws.close(1000);
    }
  });

  // WS → PTY
  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      switch (msg.type) {
        case "input":  ptyProcess.write(msg.data); break;
        case "resize":
          ptyProcess.resize(Math.max(1, msg.cols), Math.max(1, msg.rows));
          break;
        case "ping": ws.send(JSON.stringify({ type: "pong" })); break;
      }
    } catch (e) {
      console.error("[NETWATCH PTY] Error:", e.message);
    }
  });

  ws.on("close", () => {
    console.log(`[NETWATCH PTY] Tab ${tabId} desconectado — matando shell`);
    try { ptyProcess.kill(); } catch {}
  });

  ws.on("error", (err) => {
    console.error(`[NETWATCH PTY] WS error tab ${tabId}:`, err.message);
  });
});

wss.on("error", (err) => {
  console.error("[NETWATCH PTY] Server error:", err.message);
  process.exit(1);
});

process.on("SIGTERM", () => { wss.close(() => process.exit(0)); });
process.on("SIGINT",  () => { wss.close(() => process.exit(0)); });
