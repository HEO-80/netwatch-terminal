// nw-commands.js v3 — paleta original NETWATCH con significado semántico
// ══════════════════════════════════════════════════════════════════════════════
// AMARILLO #FCEE0A → marca NETWATCH, títulos
// VERDE    #39FF14 → éxito, bash, confirmaciones  
// CYAN     #00F0FF → rutas, info, referencias
// MAGENTA  #D9027D → git, acciones importantes
// ROJO     #ff5555 → solo errores
// BLANCO   #E8E8E8 → texto base normal
// GRIS     #546E7A → sugerencias, texto dim
// ══════════════════════════════════════════════════════════════════════════════

const C = {
  yellow:  (t) => `\x1b[33m${t}\x1b[0m`,          // NETWATCH brand
  green:   (t) => `\x1b[32m${t}\x1b[0m`,          // éxito / bash
  cyan:    (t) => `\x1b[36m${t}\x1b[0m`,          // rutas / info
  magenta: (t) => `\x1b[35m${t}\x1b[0m`,          // git / acciones
  red:     (t) => `\x1b[31m${t}\x1b[0m`,          // errores
  white:   (t) => `\x1b[97m${t}\x1b[0m`,          // texto base
  gray:    (t) => `\x1b[38;5;66m${t}\x1b[0m`,     // dim
  dim:     (t) => `\x1b[38;5;237m${t}\x1b[0m`,    // muy dim
};

const nl   = "\r\n";
const SEP  = C.dim("─".repeat(56));
const SEP2 = C.magenta("═".repeat(56));

async function ps(command) {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke("run_powershell", { command });
  } catch { return { stdout: "", stderr: "", success: false }; }
}

// ── nw help ───────────────────────────────────────────────────────────────────
async function cmdHelp(args, write) {
  write(nl + SEP2 + nl);
  write(`  ${C.yellow("NETWATCH")} ${C.cyan("OS v2.077")} ${C.dim("— Comandos propios")}` + nl);
  write(SEP2 + nl + nl);

  const cmds = [
    [C.yellow("nw help"),            "mostrar esta ayuda"],
    [C.yellow("nw status"),          "resumen: sistema, puertos, repos"],
    [C.cyan("nw eth"),               "precios BTC/ETH + gas"],
    [C.cyan("nw eth <wallet>"),      "balance + últimas txs"],
    [C.magenta("nw repos"),          "repos git: rama, estado, ahead"],
    [C.magenta("nw ssh"),            "servidores SSH guardados"],
    [C.magenta("nw ssh <n>"),        "conectar al servidor N"],
    [C.green("nw deploy"),           "detectar proyecto + opciones deploy"],
    [C.green("nw deploy <n>"),       "lanzar opción de deploy"],
    [C.gray("nw snip ls"),           "listar snippets"],
    [C.gray("nw snip add <id> <cmd>"),"guardar snippet"],
    [C.gray("nw snip run <id>"),     "ejecutar snippet"],
    [C.yellow("nw task"),             "listar tareas"],
    [C.yellow("nw task add <texto>"),"añadir tarea"],
    [C.yellow("nw task done <n>"),   "completar tarea N"],
    [C.yellow("nw task start <n>"),  "poner en curso tarea N"],
    [C.green("nw note"),              "listar notas"],
    [C.green("nw note add <texto>"),"guardar nota rapida"],
    [C.green("nw note rm <n>"),     "eliminar nota N"],
    [C.green("nw note clear"),      "borrar todas las notas"],
    [C.yellow("nw ai <pregunta>"),   "preguntar a Claude AI"],
    [C.cyan("nw config"),           "abrir panel de Settings / API keys"],
  ];

  cmds.forEach(([cmd, desc]) => {
    write(`  ${cmd.padEnd ? cmd : cmd}${" ".repeat(Math.max(1, 32 - cmd.replace(/\x1b\[[0-9;]*m/g,"").length))}${C.dim("→")} ${C.gray(desc)}` + nl);
  });
  write(nl + C.dim("  PowerShell, git, npm, yarn — funcionan normalmente.") + nl + nl);
}

// ── nw status ─────────────────────────────────────────────────────────────────
async function cmdStatus(args, write) {
  write(nl + C.cyan("◈ NETWATCH STATUS") + nl + SEP + nl + nl);

  const sysRes = await ps(`
    $cpu = (Get-CimInstance Win32_Processor).Name -replace ' +',' '
    $ram = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory/1GB,1)
    $os  = (Get-CimInstance Win32_OperatingSystem).Caption
    Write-Output "CPU:$cpu|RAM:${ram}GB|OS:$os"
  `);

  write(C.yellow("  Sistema") + nl);
  sysRes.stdout?.trim().split("|").forEach(p => {
    const [k, ...v] = p.split(":");
    if (k) write(`  ${C.gray(k.trim().padEnd(6))} ${C.dim("·")} ${C.white(v.join(":").trim())}` + nl);
  });
  write(nl);

  // Puertos
  write(C.yellow("  Puertos") + nl);
  const portRes = await ps(`
    $interesting = @(3000,3001,4000,5173,5174,7777,8080,9000,27017,5432,6379)
    Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
      Where-Object { $interesting -contains $_.LocalPort } |
      Select-Object LocalPort -Unique | Sort-Object LocalPort |
      ForEach-Object { $_.LocalPort }
  `);
  const pNames = {3000:"React",3001:"API",5173:"Vite",7777:"PTY",8080:"HTTP",27017:"MongoDB",5432:"Postgres",6379:"Redis"};
  const ports  = portRes.stdout?.trim().split("\n").filter(p=>p.trim()).map(p=>parseInt(p.trim())) || [];
  write("  " + (ports.length ? ports.map(p=>`${C.cyan(":"+p)} ${C.dim(pNames[p]||"")}`).join("  ") : C.dim("ninguno")) + nl + nl);

  // Repos dirty
  write(C.yellow("  Repos con cambios") + nl);
  const gitRes = await ps(`
    $base = "$env:USERPROFILE\\Source\\Repos"
    if (Test-Path $base) {
      Get-ChildItem $base -Directory | ForEach-Object {
        if (Test-Path "$($_.FullName)\\.git") {
          $s = git -C $_.FullName status --porcelain 2>$null
          $b = git -C $_.FullName branch --show-current 2>$null
          if ($s) { Write-Output "$($_.Name)|$b|$(($s|Measure-Object).Count)" }
        }
      }
    }
  `);
  const dirty = gitRes.stdout?.trim().split("\n").filter(l=>l.trim()) || [];
  if (dirty.length) {
    dirty.forEach(line => {
      const [name, branch, count] = line.split("|");
      write(`  ${C.magenta(name?.trim().padEnd(24))} ${C.cyan(branch?.trim().padEnd(16))} ${C.red(count?.trim()+" cambios")}` + nl);
    });
  } else {
    write("  " + C.green("✓ todos los repos limpios") + nl);
  }
  write(nl + SEP + nl + nl);
}

// ── nw eth ────────────────────────────────────────────────────────────────────
async function cmdEth(args, write) {
  const wallet = args[0] || localStorage.getItem("nw-eth-wallet");
  write(nl + C.cyan("◈ ETH / CRYPTO") + nl + SEP + nl + nl);
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd&include_24hr_change=true");
    const p   = await res.json();
    const eth = p?.ethereum, btc = p?.bitcoin;
    const fc  = (n) => n >= 0 ? C.green(`+${n?.toFixed(2)}%`) : C.red(`${n?.toFixed(2)}%`);
    write(`\r  ${C.cyan("ETH")}  ${C.white("$"+eth?.usd?.toLocaleString("en"))}  ${fc(eth?.usd_24h_change)} ${C.dim("24h")}` + nl);
    write(`  ${C.dim("BTC")}  ${C.white("$"+btc?.usd?.toLocaleString("en"))}  ${fc(btc?.usd_24h_change)} ${C.dim("24h")}` + nl + nl);
  } catch {
    write(C.red("  Error obteniendo datos crypto.") + nl + nl);
  }
  if (wallet) write(`  ${C.dim("Wallet:")} ${C.cyan(wallet)}` + nl + nl);
  else write(C.dim("  Tip: nw eth 0xTuWallet — para ver balance") + nl + nl);
}

// ── nw repos ──────────────────────────────────────────────────────────────────
async function cmdRepos(args, write) {
  write(nl + C.cyan("◈ GIT REPOS") + nl + SEP + nl + nl);
  const res = await ps(`
    $base = "$env:USERPROFILE\\Source\\Repos"
    if (Test-Path $base) {
      Get-ChildItem $base -Directory | ForEach-Object {
        if (Test-Path "$($_.FullName)\\.git") {
          $branch  = git -C $_.FullName branch --show-current 2>$null
          $status  = git -C $_.FullName status --porcelain 2>$null
          $dirty   = if ($status) {"dirty"} else {"clean"}
          $changes = if ($status) {($status|Measure-Object).Count} else {0}
          $ahead   = git -C $_.FullName rev-list --count "@{upstream}..HEAD" 2>$null
          Write-Output "$($_.Name)|$branch|$dirty|$changes|$ahead"
        }
      }
    }
  `);
  if (!res.stdout?.trim()) { write(C.dim("  No se encontraron repos.") + nl + nl); return; }

  write(`  ${C.dim("REPO".padEnd(24))}${C.dim("RAMA".padEnd(18))}${C.dim("ESTADO".padEnd(10))}${C.dim("CAMBIOS")}` + nl);
  write("  " + C.dim("─".repeat(54)) + nl);

  res.stdout.trim().split("\n").filter(l=>l.trim()).forEach(line => {
    const [name, branch, dirty, changes, ahead] = line.split("|");
    const isDirty  = dirty?.trim() === "dirty";
    const aheadNum = parseInt(ahead?.trim()) || 0;
    write(
      `  ${C.magenta((name?.trim()||"").slice(0,22).padEnd(24))}` +
      `${C.cyan((branch?.trim()||"").slice(0,16).padEnd(18))}` +
      `${isDirty ? C.red("● dirty   ") : C.green("✓ clean   ")}` +
      `${isDirty ? C.red(String(parseInt(changes)||0).padEnd(8)) : C.dim("0".padEnd(8))}` +
      `${aheadNum > 0 ? C.yellow("↑"+aheadNum) : C.dim("─")}` + nl
    );
  });
  write(nl);
}

// ── nw ssh ────────────────────────────────────────────────────────────────────
async function cmdSsh(args, write, sendToShell) {
  const saved    = JSON.parse(localStorage.getItem("nw-ssh-servers") || "[]");
  const defaults = [{ name: "Beelink", host: "192.168.1.139", port: 38, user: "heo" }];
  const servers  = [...defaults, ...saved];

  if (args[0] === "add" && args[1]) {
    const [userHost, portStr] = (args[1]||"").split(":");
    const [user, host] = (userHost||"").split("@");
    const name = args[2] || host;
    saved.push({ name, host, port: parseInt(portStr)||22, user });
    localStorage.setItem("nw-ssh-servers", JSON.stringify(saved));
    write(nl + C.green(`✓ Servidor '${name}' guardado`) + nl + nl);
    return;
  }

  write(nl + C.cyan("◈ SSH SERVERS") + nl + SEP + nl + nl);
  servers.forEach((s, i) => {
    write(`  ${C.yellow(`[${i+1}]`)} ${C.white(s.name.padEnd(16))} ${C.cyan(`${s.user}@${s.host}`)}${C.dim(`:${s.port}`)}` + nl);
  });
  write(nl + C.dim("  nw ssh <n> para conectar · nw ssh add user@host:port nombre") + nl + nl);

  const num = parseInt(args[0]);
  if (num >= 1 && num <= servers.length) {
    const s = servers[num-1];
    write(C.green(`  Conectando a ${s.name}...`) + nl + nl);
    sendToShell(`ssh ${s.user}@${s.host} -p ${s.port}\r`);
  }
}

// ── nw snip ───────────────────────────────────────────────────────────────────
async function cmdSnip(args, write, sendToShell) {
  const snippets = JSON.parse(localStorage.getItem("nw-snippets") || "{}");
  const sub = args[0]?.toLowerCase();

  if (!sub || sub === "ls") {
    write(nl + C.cyan("◈ SNIPPETS") + nl + SEP + nl + nl);
    const keys = Object.keys(snippets);
    if (!keys.length) { write(C.dim("  Sin snippets. nw snip add <id> <cmd>") + nl + nl); return; }
    keys.forEach(k => write(`  ${C.yellow(k.padEnd(20))} ${C.dim("→")} ${C.green(snippets[k])}` + nl));
    write(nl + C.dim("  nw snip run <id>") + nl + nl);
    return;
  }
  if (sub === "add" && args[1] && args[2]) {
    const id = args[1], cmd = args.slice(2).join(" ");
    snippets[id] = cmd;
    localStorage.setItem("nw-snippets", JSON.stringify(snippets));
    write(nl + C.green(`✓ Snippet '${id}' guardado`) + nl + C.dim(`  ${cmd}`) + nl + nl);
    return;
  }
  if (sub === "run" && args[1]) {
    const cmd = snippets[args[1]];
    if (!cmd) { write(nl + C.red(`✗ Snippet '${args[1]}' no encontrado`) + nl + nl); return; }
    write(nl + C.yellow(`▸ ${cmd}`) + nl + nl);
    sendToShell(cmd + "\r");
    return;
  }
  if (sub === "del" && args[1]) {
    delete snippets[args[1]];
    localStorage.setItem("nw-snippets", JSON.stringify(snippets));
    write(nl + C.green(`✓ Snippet '${args[1]}' eliminado`) + nl + nl);
    return;
  }
  write(nl + C.dim("  Uso: nw snip [ls|add <id> <cmd>|run <id>|del <id>]") + nl + nl);
}

// ── nw deploy ─────────────────────────────────────────────────────────────────
async function cmdDeploy(args, write, sendToShell) {
  write(nl + C.cyan("◈ DEPLOY WIZARD") + nl + SEP + nl + nl);
  const res = await ps(`
    $hasPkg=$false; $hasTauri=$false; $hasNext=$false; $hasAstro=$false; $hasHardhat=$false; $hasDocker=$false
    if (Test-Path "package.json") {
      $hasPkg=$true
      $pkg = Get-Content "package.json" -Raw
      if ($pkg -match '"next"') { $hasNext=$true }
      if ($pkg -match '"astro"') { $hasAstro=$true }
    }
    if ((Test-Path "hardhat.config.js") -or (Test-Path "hardhat.config.ts")) { $hasHardhat=$true }
    if (Test-Path "Dockerfile") { $hasDocker=$true }
    if (Test-Path "src-tauri") { $hasTauri=$true }
    $cwd = (Get-Location).Path
    Write-Output "PKG:$hasPkg|HARDHAT:$hasHardhat|DOCKER:$hasDocker|TAURI:$hasTauri|NEXT:$hasNext|ASTRO:$hasAstro|CWD:$cwd"
  `);
  const flags = {}; let cwd = "?";
  res.stdout?.trim().split("|").forEach(p => {
    if (p.startsWith("CWD:")) { cwd = p.slice(4); return; }
    const [k,v] = p.split(":"); if (k) flags[k.trim()] = v?.trim().toLowerCase() === "true";
  });
  write(`  ${C.dim("Dir:")} ${C.cyan(cwd)}` + nl + nl);

  const options = [];
  if (flags.TAURI)   options.push({key:"1", label:"Tauri build (.exe)",  cmd:"cargo tauri build",               color:C.yellow});
  if (flags.NEXT)    options.push({key:"2", label:"Next.js → Vercel",    cmd:"npx vercel --prod",               color:C.cyan});
  if (flags.ASTRO)   options.push({key:"3", label:"Astro build",         cmd:"npm run build",                   color:C.cyan});
  if (flags.HARDHAT) options.push({key:"4", label:"Hardhat deploy",      cmd:"npx hardhat run scripts/deploy.js",color:C.magenta});
  if (flags.DOCKER)  options.push({key:"5", label:"Docker build",        cmd:"docker build -t app .",           color:C.green});
  if (flags.PKG)     options.push({key:"6", label:"npm build",           cmd:"npm run build",                   color:C.dim});
  options.push({key:"g", label:"git push origin HEAD", cmd:"git push origin HEAD", color:C.magenta});

  options.forEach(o => write(`  ${C.yellow(`[${o.key}]`)} ${o.color(o.label.padEnd(26))} ${C.dim(o.cmd)}` + nl));
  write(nl + C.dim("  nw deploy <n> para lanzar") + nl + nl);

  const sel = options.find(o => o.key === args[0]);
  if (sel) { write(C.yellow(`▸ ${sel.cmd}`) + nl + nl); sendToShell(sel.cmd + "\r"); }
}

// ── nw ai ─────────────────────────────────────────────────────────────────────
async function cmdAi(args, write) {
  const question = args.join(" ");
  if (!question) {
    write(nl + C.dim("  Uso: nw ai <pregunta>") + nl + nl);
    return;
  }
  write(nl + C.yellow("◈ NETWATCH AI") + nl + SEP + nl + nl);
  write(`  ${C.dim("Pregunta:")} ${C.white(question)}` + nl + nl);
  write(C.yellow("  Pensando") + C.dim("...") + nl + nl);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `Eres el asistente de NETWATCH Terminal. Usuario: HEO-80, Full Stack Dev y DeFi researcher.
Responde conciso y directo. Máximo 15 líneas. Sin markdown, texto plano.`,
        messages: [{ role: "user", content: question }],
      }),
    });
    const data = await response.json();
    const text = data?.content?.[0]?.text || "Sin respuesta";
    text.split("\n").forEach(line => {
      if (!line.trim()) { write(nl); return; }
      if (line.match(/^[\s]{2,}/) || line.match(/^[$>]/)) write(C.green("  " + line.trim()) + nl);
      else write(C.white("  " + line) + nl);
    });
  } catch (e) {
    write(C.red(`  Error: ${e.message}`) + nl);
  }
  write(nl);
}

// ── nw task ──────────────────────────────────────────────────────────────────
async function cmdTask(args, write) {
  const STORAGE_KEY = "nw-tasks";
  const load = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };
  const save = (t) => localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  const sub = args[0]?.toLowerCase();

  if (sub === "add" && args.length > 1) {
    const text = args.slice(1).join(" ");
    const tasks = load();
    tasks.push({ id: Date.now(), text, status: "todo", created: new Date().toISOString() });
    save(tasks);
    write(nl + C.green(`✓ Tarea añadida: ${C.white(text)}`) + nl + nl);
    return;
  }

  if (sub === "done" && args[1]) {
    const tasks = load();
    const num = parseInt(args[1]);
    const pending = tasks.filter(t => t.status !== "done");
    if (num >= 1 && num <= pending.length) {
      pending[num - 1].status = "done";
      save(tasks);
      write(nl + C.green(`✓ Completada: ${C.white(pending[num - 1].text)}`) + nl + nl);
    } else {
      write(nl + C.red(`✗ Tarea #${num} no encontrada`) + nl + nl);
    }
    return;
  }

  if (sub === "start" && args[1]) {
    const tasks = load();
    const pending = tasks.filter(t => t.status === "todo");
    const num = parseInt(args[1]);
    if (num >= 1 && num <= pending.length) {
      pending[num - 1].status = "doing";
      save(tasks);
      write(nl + C.cyan(`◎ En curso: ${C.white(pending[num - 1].text)}`) + nl + nl);
    } else {
      write(nl + C.red(`✗ Tarea #${num} no encontrada en pendientes`) + nl + nl);
    }
    return;
  }

  if (sub === "rm" && args[1]) {
    const tasks = load();
    const num = parseInt(args[1]);
    if (num >= 1 && num <= tasks.length) {
      const removed = tasks.splice(num - 1, 1)[0];
      save(tasks);
      write(nl + C.red(`✗ Eliminada: ${C.white(removed.text)}`) + nl + nl);
    } else {
      write(nl + C.red(`✗ Tarea #${num} no encontrada`) + nl + nl);
    }
    return;
  }

  if (sub === "clear") {
    const tasks = load().filter(t => t.status !== "done");
    save(tasks);
    write(nl + C.green("✓ Tareas completadas limpiadas") + nl + nl);
    return;
  }

  // Default: list
  const tasks = load();
  if (!tasks.length) {
    write(nl + C.dim("  Sin tareas. nw task add <texto>") + nl + nl);
    return;
  }

  write(nl + C.cyan("◈ TASKS") + nl + SEP + nl + nl);

  const groups = [
    { label: "PENDIENTE", status: "todo",  color: C.yellow, icon: "○" },
    { label: "EN CURSO",  status: "doing", color: C.cyan,   icon: "◎" },
    { label: "HECHO",     status: "done",  color: C.green,  icon: "●" },
  ];

  let globalIdx = 1;
  groups.forEach(g => {
    const items = tasks.filter(t => t.status === g.status);
    if (!items.length) return;
    write(`  ${g.color(g.label)}` + nl);
    items.forEach(t => {
      const prefix = t.status === "done" ? C.dim(String(globalIdx)) : C.yellow(String(globalIdx));
      const text = t.status === "done" ? C.dim(t.text) : C.white(t.text);
      write(`    ${prefix} ${g.icon} ${text}` + nl);
      globalIdx++;
    });
    write(nl);
  });

  write(C.dim("  nw task add <texto> · nw task done <n> · nw task start <n> · nw task rm <n>") + nl + nl);
}

// ── nw note ─────────────────────────────────────────────────────────────────
async function cmdNote(args, write) {
  const STORAGE_KEY = "nw-notes";
  const load = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };
  const save = (n) => localStorage.setItem(STORAGE_KEY, JSON.stringify(n));
  const sub = args[0]?.toLowerCase();

  if ((sub === "add" || !sub) && args.length > (sub === "add" ? 1 : 0)) {
    const text = sub === "add" ? args.slice(1).join(" ") : args.join(" ");
    const notes = load();
    const now = new Date();
    const time = now.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    notes.unshift({ id: Date.now(), text, time, pinned: false });
    save(notes);
    write(nl + C.green(`✓ Nota guardada: ${C.white(text)}`) + nl + nl);
    return;
  }

  if (sub === "rm" && args[1]) {
    const notes = load();
    const num = parseInt(args[1]);
    if (num >= 1 && num <= notes.length) {
      const removed = notes.splice(num - 1, 1)[0];
      save(notes);
      write(nl + C.red(`✗ Eliminada: ${C.white(removed.text)}`) + nl + nl);
    } else {
      write(nl + C.red(`✗ Nota #${num} no encontrada`) + nl + nl);
    }
    return;
  }

  if (sub === "clear") {
    save([]);
    write(nl + C.green("✓ Todas las notas eliminadas") + nl + nl);
    return;
  }

  // Default: list
  const notes = load();
  if (!notes.length) {
    write(nl + C.dim("  Sin notas. nw note <texto> o nw note add <texto>") + nl + nl);
    return;
  }

  write(nl + C.cyan("◈ NOTES") + nl + SEP + nl + nl);
  const pinned = notes.filter(n => n.pinned);
  const unpinned = notes.filter(n => !n.pinned);
  [...pinned, ...unpinned].forEach((n, i) => {
    const pin = n.pinned ? C.yellow("★ ") : "  ";
    write(`  ${C.yellow(String(i + 1).padStart(2))} ${pin}${C.white(n.text)}` + nl);
    write(`      ${C.dim(n.time)}` + nl);
  });
  write(nl + C.dim("  nw note <texto> · nw note rm <n> · nw note clear") + nl + nl);
}

// ── nw config ────────────────────────────────────────────────────────────────
async function cmdConfig(args, write) {
  window.dispatchEvent(new CustomEvent("nw-open-settings"));
  write(nl + C.green("✓ Panel SETTINGS abierto") + nl + nl);
  write(C.yellow("  Keys configurables:") + nl);
  write(`  ${C.cyan("gemini-key")}     ${C.dim("→")} ${C.gray("Google Gemini API key")}` + nl);
  write(`  ${C.magenta("claude-key")}     ${C.dim("→")} ${C.gray("Anthropic Claude API key")}` + nl);
  write(`  ${C.green("github-token")}   ${C.dim("→")} ${C.gray("GitHub personal access token")}` + nl);
  write(`  ${C.green("github-user")}    ${C.dim("→")} ${C.gray("GitHub username")}` + nl);
  write(nl);
}

// ── Registro ──────────────────────────────────────────────────────────────────
export const NW_COMMANDS = {
  help: cmdHelp, status: cmdStatus, eth: cmdEth, repos: cmdRepos,
  ssh: cmdSsh, snip: cmdSnip, deploy: cmdDeploy, ai: cmdAi, task: cmdTask, note: cmdNote,
  config: cmdConfig,
};

export async function handleNwCommand(input, write, sendToShell, context = {}) {
  const trimmed = input.trim();
  if (!trimmed.startsWith("nw ") && trimmed !== "nw") return { handled: false };
  const parts   = trimmed.split(/\s+/);
  const sub     = parts[1]?.toLowerCase();
  const args    = parts.slice(2);
  const handler = NW_COMMANDS[sub] || NW_COMMANDS["help"];
  try { await handler(sub ? args : [], write, sendToShell, context); }
  catch (e) { write(`\r\n${C.red(`✗ Error: ${e.message}`)}\r\n`); }
  return { handled: true };
}
