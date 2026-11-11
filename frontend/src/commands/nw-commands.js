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
    [C.gray("nw snip run <id> [--k=v]"),"ejecutar snippet (con templates)"],
    [C.gray("nw snip export/import"),"exportar/importar snippets (JSON)"],
    [C.yellow("nw task"),             "listar tareas"],
    [C.yellow("nw task add <texto>"),"añadir tarea"],
    [C.yellow("nw task done <n>"),   "completar tarea N"],
    [C.yellow("nw task start <n>"),  "poner en curso tarea N"],
    [C.green("nw note"),              "listar notas"],
    [C.green("nw note add <texto>"),"guardar nota rapida"],
    [C.green("nw note rm <n>"),     "eliminar nota N"],
    [C.green("nw note pin <n>"),   "fijar/desfijar nota N"],
    [C.green("nw note export"),    "exportar notas como markdown"],
    [C.green("nw note clear"),      "borrar todas las notas"],
    [C.yellow("nw ai <pregunta>"),   "preguntar a Claude AI"],
    [C.cyan("nw config"),           "abrir panel de Settings / API keys"],
    [C.cyan("nw theme [nombre]"),   "cambiar tema (built-in + custom)"],
    [C.cyan("nw theme create <n> <hex>"), "crear tema custom"],
    [C.cyan("nw theme delete <n>"), "eliminar tema custom"],
    [C.cyan("nw json <cmd>"),       "ejecutar comando y formatear JSON"],
    [C.cyan("nw json table <cmd>"), "renderizar JSON array como tabla"],
    [C.yellow("nw fix"),             "sugerir fix para el último error"],
    [C.yellow("nw clip"),            "clipboard manager (últimos 20 items)"],
    [C.yellow("nw clip <n>"),        "copiar item N al portapapeles"],
    [C.yellow("nw clip search <t>"), "buscar en historial de clipboard"],
    [C.magenta("nw ctx"),             "contexto del proyecto actual"],
    [C.magenta("nw rec start/stop"),  "grabar sesión de terminal"],
    [C.magenta("nw rec list/play"),   "listar/reproducir grabaciones"],
    [C.cyan("nw plugin"),             "gestionar plugins instalados"],
    [C.cyan("nw profile export"),     "exportar config/profile completo"],
    [C.cyan("nw profile import"),     "importar profile"],
    [C.cyan("nw sync push/pull"),     "sincronizar config via git"],
    [C.magenta("nw dojo"),             "abrir tab de entrenamiento"],
    [C.green("nw notebook"),           "abrir tab notebook interactivo"],
    [C.green("nw tail <archivo>"),     "ver últimas líneas de archivo"],
    [C.green("nw tail -f <archivo>"),  "seguir archivo en tiempo real"],
    [C.cyan("nw docker ps"),           "contenedores Docker activos"],
    [C.cyan("nw docker logs <name>"),  "logs de un contenedor"],
  ];

  // DSL nativo (Rust)
  const rustCmds = [
    [C.green("nw proc"),             "lista procesos (top CPU) ⚡"],
    [C.green("nw ports"),            "puertos TCP escuchando ⚡"],
    [C.green("nw kill <nombre|pid>"),"matar proceso ⚡"],
    [C.green("nw find <patron>"),    "buscar archivos ⚡"],
    [C.green("nw size [n]"),         "archivos más grandes ⚡"],
    [C.green("nw dupes [ruta]"),     "encontrar duplicados ⚡"],
    [C.green("nw hash <archivo>"),   "SHA-256 de un archivo ⚡"],
    [C.green("nw diff <a> <b>"),     "comparar dos archivos ⚡"],
    [C.green("nw clean [--dry]"),    "limpiar logs/tmp/bak ⚡"],
    [C.green("nw env [set|get|del]"),"variables NETWATCH ⚡"],
    [C.green("nw run <script.nw>"),  "ejecutar script .nw ⚡"],
  ];

  cmds.forEach(([cmd, desc]) => {
    write(`  ${cmd.padEnd ? cmd : cmd}${" ".repeat(Math.max(1, 32 - cmd.replace(/\x1b\[[0-9;]*m/g,"").length))}${C.dim("→")} ${C.gray(desc)}` + nl);
  });

  write(nl + `  ${C.green("NETWATCH")} ${C.dim("DSL — Nativos Rust ⚡")}` + nl + nl);
  rustCmds.forEach(([cmd, desc]) => {
    write(`  ${cmd.padEnd ? cmd : cmd}${" ".repeat(Math.max(1, 32 - cmd.replace(/\x1b\[[0-9;]*m/g,"").length))}${C.dim("→")} ${C.gray(desc)}` + nl);
  });

  write(nl + C.dim("  ⚡ = Rust nativo, sin PowerShell. Pipes: nw proc | filter cpu > 50 | top 5") + nl);
  write(C.dim("  PowerShell, git, npm, yarn — funcionan normalmente.") + nl + nl);
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
    const raw = snippets[args[1]];
    if (!raw) { write(nl + C.red(`✗ Snippet '${args[1]}' no encontrado`) + nl + nl); return; }
    const params = {};
    args.slice(2).forEach(a => { const [k, ...v] = a.split("="); if (k.startsWith("--")) params[k.slice(2)] = v.join("="); });
    let cmd = raw.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      if (key === "date") return new Date().toISOString().slice(0, 10);
      if (key === "time") return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
      if (key === "user") return "HEO-80";
      return params[key] || `{{${key}}}`;
    });
    write(nl + C.yellow(`▸ ${cmd}`) + nl + nl);
    sendToShell(cmd + "\r");
    return;
  }
  if (sub === "edit" && args[1]) {
    const id = args[1];
    if (!snippets[id]) { write(nl + C.red(`✗ Snippet '${id}' no encontrado`) + nl + nl); return; }
    write(nl + C.cyan(`◈ SNIPPET: ${id}`) + nl + SEP + nl);
    write(`  ${C.white(snippets[id])}` + nl + nl);
    write(C.dim("  Para editar: nw snip add " + id + " <nuevo comando>") + nl);
    const vars = snippets[id].match(/\{\{(\w+)\}\}/g);
    if (vars) write(C.dim(`  Variables: ${vars.join(", ")}`) + nl);
    write(nl);
    return;
  }
  if (sub === "del" && args[1]) {
    delete snippets[args[1]];
    localStorage.setItem("nw-snippets", JSON.stringify(snippets));
    write(nl + C.green(`✓ Snippet '${args[1]}' eliminado`) + nl + nl);
    return;
  }
  if (sub === "export") {
    const data = JSON.stringify(snippets, null, 2);
    try { await navigator.clipboard.writeText(data); } catch {}
    write(nl + C.green(`✓ ${Object.keys(snippets).length} snippets exportados al portapapeles (JSON)`) + nl + nl);
    return;
  }
  if (sub === "import") {
    try {
      const text = await navigator.clipboard.readText();
      const imported = JSON.parse(text);
      const count = Object.keys(imported).length;
      Object.assign(snippets, imported);
      localStorage.setItem("nw-snippets", JSON.stringify(snippets));
      write(nl + C.green(`✓ ${count} snippets importados desde portapapeles`) + nl + nl);
    } catch {
      write(nl + C.red("  ✗ Error al importar. Copia JSON válido al portapapeles primero.") + nl + nl);
    }
    return;
  }
  write(nl + C.dim("  Uso: nw snip [ls|add|run|edit|del|export|import]") + nl);
  write(C.dim("  Templates: usa {{var}} en el comando, --var=value al ejecutar") + nl);
  write(C.dim("  Builtins: {{date}}, {{time}}, {{user}}, {{ts}}") + nl + nl);
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

  if (sub === "export") {
    const notes = load();
    if (!notes.length) { write(nl + C.dim("  Sin notas para exportar.") + nl + nl); return; }
    let md = `# NETWATCH Notes\n\n_Exported: ${new Date().toLocaleString("es-ES")}_\n\n`;
    const pinned = notes.filter(n => n.pinned);
    const unpinned = notes.filter(n => !n.pinned);
    if (pinned.length) {
      md += `## ★ Pinned\n\n`;
      pinned.forEach(n => { md += `- ${n.text} _(${n.time})_\n`; });
      md += "\n";
    }
    md += `## Notes\n\n`;
    unpinned.forEach(n => { md += `- ${n.text} _(${n.time})_\n`; });
    try { await navigator.clipboard.writeText(md); } catch {}
    write(nl + C.green(`✓ ${notes.length} notas exportadas como markdown al portapapeles`) + nl + nl);
    return;
  }

  if (sub === "pin" && args[1]) {
    const notes = load();
    const num = parseInt(args[1]);
    if (num >= 1 && num <= notes.length) {
      notes[num - 1].pinned = !notes[num - 1].pinned;
      save(notes);
      const action = notes[num - 1].pinned ? "fijada" : "desfijada";
      write(nl + C.green(`✓ Nota #${num} ${action}`) + nl + nl);
    } else {
      write(nl + C.red(`✗ Nota #${num} no encontrada`) + nl + nl);
    }
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
  write(nl + C.dim("  nw note <texto> · nw note rm <n> · nw note pin <n> · nw note export · nw note clear") + nl + nl);
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

// ── nw theme ────────────────────────────────────────────────────────────────
const THEME_LIST = ["cyan", "red", "yellow", "green", "magenta"];
const THEME_ALIASES = {
  "cyberpunk": "cyan", "cyberpunk-2077": "cyan", "2077": "cyan",
  "blade-runner": "red", "bladerunner": "red", "blade": "red",
  "deus-ex": "yellow", "deusex": "yellow", "deus": "yellow",
  "matrix": "green",
  "ghost": "magenta", "ghost-in-shell": "magenta", "gits": "magenta",
  "minimal": "cyan", "minimal-dark": "cyan",
};
const CUSTOM_THEMES_KEY = "nw-custom-themes";
function loadCustomThemes() { try { return JSON.parse(localStorage.getItem(CUSTOM_THEMES_KEY) || "{}"); } catch { return {}; } }
function saveCustomThemes(t) { localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(t)); }

function applyCustomTheme(name, colors) {
  const root = document.documentElement;
  root.dataset.theme = name;
  if (colors.accent)  root.style.setProperty("--nw-accent", colors.accent);
  if (colors.glow)    root.style.setProperty("--nw-accent-glow", colors.glow);
  if (colors.corner)  root.style.setProperty("--nw-corner", colors.corner);
  if (colors.border)  root.style.setProperty("--nw-border", colors.border);
  if (colors.bg)      root.style.setProperty("--nw-bg", colors.bg);
  if (colors.surface) root.style.setProperty("--nw-surface", colors.surface);
  if (colors.text)    root.style.setProperty("--nw-text", colors.text);
  if (colors.font)    root.style.setProperty("--font-mono", colors.font);
  if (colors.opacity != null) root.style.setProperty("--nw-opacity", String(colors.opacity));
  localStorage.setItem("nw-theme", name);
}

async function cmdTheme(args, write) {
  let sub = args[0]?.toLowerCase();
  const customThemes = loadCustomThemes();
  if (sub && THEME_ALIASES[sub]) sub = THEME_ALIASES[sub];

  if (sub && THEME_LIST.includes(sub)) {
    document.documentElement.style.removeProperty("--nw-accent");
    document.documentElement.style.removeProperty("--nw-accent-glow");
    document.documentElement.style.removeProperty("--nw-corner");
    document.documentElement.style.removeProperty("--nw-border");
    document.documentElement.dataset.theme = sub;
    try { localStorage.setItem("nw-theme", sub); } catch {}
    window.dispatchEvent(new CustomEvent("nw-theme-change", { detail: sub }));
    write(nl + C.green(`✓ Tema cambiado a ${C.yellow(sub.toUpperCase())}`) + nl + nl);
    return;
  }

  if (sub && customThemes[sub]) {
    applyCustomTheme(sub, customThemes[sub]);
    window.dispatchEvent(new CustomEvent("nw-theme-change", { detail: sub }));
    write(nl + C.green(`✓ Tema custom "${sub}" aplicado`) + nl + nl);
    return;
  }

  if (sub === "create" && args[1]) {
    const name = args[1];
    const accent = args[2] || "#00F0FF";
    const corner = args[3] || "#D9027D";
    const theme = { accent, glow: accent + "33", corner, border: accent + "44" };
    const extra = args.slice(4);
    extra.forEach(a => {
      const [k, ...v] = a.split("=");
      const val = v.join("=");
      if (k && val && ["bg","surface","text","font","opacity"].includes(k)) {
        theme[k] = k === "opacity" ? parseFloat(val) : val;
      }
    });
    customThemes[name] = theme;
    saveCustomThemes(customThemes);
    write(nl + C.green(`✓ Tema "${name}" creado`) + nl);
    write(C.dim(`  Accent: ${accent} · Corner: ${corner}`) + nl);
    if (theme.bg) write(C.dim(`  Bg: ${theme.bg}`) + nl);
    if (theme.font) write(C.dim(`  Font: ${theme.font}`) + nl);
    write(C.dim(`  Uso: nw theme ${name}`) + nl);
    write(C.dim(`  Editar: nw theme edit ${name}`) + nl + nl);
    return;
  }

  if (sub === "delete" && args[1] && customThemes[args[1]]) {
    delete customThemes[args[1]];
    saveCustomThemes(customThemes);
    write(nl + C.green(`✓ Tema "${args[1]}" eliminado`) + nl + nl);
    return;
  }

  if (sub === "save" && args[1]) {
    const name = args[1];
    const theme = customThemes[name];
    if (!theme) { write(nl + C.red(`  ✗ Tema "${name}" no existe. Créalo primero con nw theme create.`) + nl + nl); return; }
    const nwTheme = { name, version: "1.0", ...theme, exported: new Date().toISOString() };
    const json = JSON.stringify(nwTheme, null, 2);
    try { await navigator.clipboard.writeText(json); } catch {}
    write(nl + C.green(`✓ Tema "${name}" exportado como .nw-theme al portapapeles`) + nl);
    write(C.dim(`  Guárdalo como ${name}.nw-theme`) + nl + nl);
    return;
  }

  if (sub === "load") {
    write(nl + C.cyan("◈ IMPORTAR .NW-THEME") + nl + SEP + nl + nl);
    try {
      const text = await navigator.clipboard.readText();
      const theme = JSON.parse(text);
      if (!theme.name || !theme.accent) {
        write(C.red("  ✗ JSON inválido. Necesita al menos 'name' y 'accent'.") + nl + nl);
        return;
      }
      customThemes[theme.name] = {
        accent: theme.accent,
        glow: theme.glow || theme.accent + "33",
        corner: theme.corner || theme.accent,
        border: theme.border || theme.accent + "44",
        ...(theme.bg && { bg: theme.bg }),
        ...(theme.surface && { surface: theme.surface }),
        ...(theme.text && { text: theme.text }),
        ...(theme.font && { font: theme.font }),
        ...(theme.opacity != null && { opacity: theme.opacity }),
      };
      saveCustomThemes(customThemes);
      write(C.green(`  ✓ Tema "${theme.name}" importado`) + nl);
      write(C.dim(`  Usa: nw theme ${theme.name}`) + nl + nl);
    } catch (e) {
      write(C.red(`  ✗ Error: ${e.message}`) + nl);
      write(C.dim("  Copia un JSON .nw-theme válido al portapapeles primero.") + nl + nl);
    }
    return;
  }

  if (sub === "edit" && args[1]) {
    const name = args[1];
    const theme = customThemes[name];
    if (!theme) { write(nl + C.red(`  ✗ Tema "${name}" no encontrado`) + nl + nl); return; }
    write(nl + C.cyan(`◈ TEMA: ${name}`) + nl + SEP + nl + nl);
    write(`  ${C.yellow("accent")}   ${C.white(theme.accent || "—")}` + nl);
    write(`  ${C.yellow("glow")}     ${C.white(theme.glow || "—")}` + nl);
    write(`  ${C.yellow("corner")}   ${C.white(theme.corner || "—")}` + nl);
    write(`  ${C.yellow("border")}   ${C.white(theme.border || "—")}` + nl);
    if (theme.bg)      write(`  ${C.yellow("bg")}       ${C.white(theme.bg)}` + nl);
    if (theme.surface) write(`  ${C.yellow("surface")}  ${C.white(theme.surface)}` + nl);
    if (theme.text)    write(`  ${C.yellow("text")}     ${C.white(theme.text)}` + nl);
    if (theme.font)    write(`  ${C.yellow("font")}     ${C.white(theme.font)}` + nl);
    if (theme.opacity != null) write(`  ${C.yellow("opacity")}  ${C.white(String(theme.opacity))}` + nl);
    write(nl + C.dim(`  nw theme save ${name}  → exportar como .nw-theme`) + nl);
    write(C.dim(`  nw theme ${name}       → aplicar`) + nl + nl);
    return;
  }

  write(nl + C.cyan("◈ TEMAS NETWATCH") + nl + SEP + nl + nl);
  const current = localStorage.getItem("nw-theme") || "cyan";
  const colors = { cyan: C.cyan, red: C.red, yellow: C.yellow, green: C.green, magenta: C.magenta };
  const themeNames = { cyan: "Cyberpunk 2077", red: "Blade Runner", yellow: "Deus Ex", green: "Matrix", magenta: "Ghost in Shell" };
  write(`  ${C.yellow("BUILT-IN")}` + nl);
  THEME_LIST.forEach(t => {
    const active = t === current ? C.green(" ● activo") : "";
    write(`  ${(colors[t] || C.white)(t.toUpperCase().padEnd(10))} ${C.gray((themeNames[t] || "").padEnd(16))} ${C.dim("nw theme " + t)}${active}` + nl);
  });
  const customNames = Object.keys(customThemes);
  if (customNames.length) {
    write(nl + `  ${C.yellow("CUSTOM")}` + nl);
    customNames.forEach(name => {
      const active = name === current ? C.green(" ● activo") : "";
      write(`  ${C.white(name.toUpperCase().padEnd(10))} ${C.dim("nw theme " + name)} ${C.gray(customThemes[name].accent)}${active}` + nl);
    });
  }
  write(nl + C.dim("  nw theme <nombre>        → cambiar tema") + nl);
  write(C.dim("  nw theme create <n> <hex> → crear tema custom") + nl);
  write(C.dim("  nw theme edit <nombre>   → ver propiedades del tema") + nl);
  write(C.dim("  nw theme save <nombre>   → exportar como .nw-theme") + nl);
  write(C.dim("  nw theme load            → importar .nw-theme desde portapapeles") + nl);
  write(C.dim("  nw theme delete <nombre> → eliminar tema custom") + nl + nl);
}

// ── nw json ────────────────────────────────────────────────────────────────
async function cmdJson(args, write, sendToShell) {
  const { tryParseJson, formatJsonAnsi, formatAsTable } = await import("../utils/smart-output.js");
  if (args.length === 0) {
    write(nl + C.cyan("◈ NW JSON — Formateador de JSON") + nl + SEP + nl + nl);
    write(`  ${C.yellow("nw json <comando>")}  ${C.dim("→")} ejecuta comando y formatea JSON` + nl);
    write(`  ${C.yellow("nw json table <cmd>")} ${C.dim("→")} renderiza JSON array como tabla` + nl + nl);
    write(C.dim("  Ejemplo: nw json kubectl get pods -o json") + nl);
    write(C.dim("  Ejemplo: nw json table docker ps --format '{{json .}}'") + nl + nl);
    return;
  }
  const tableMode = args[0] === "table";
  const cmdArgs = tableMode ? args.slice(1) : args;
  const command = cmdArgs.join(" ");

  write(nl + C.dim(`  ⏳ Ejecutando: ${command}...`) + nl);
  const res = await ps(command);
  const output = res.stdout || "";

  const parsed = tryParseJson(output);
  if (!parsed) {
    write(C.yellow("  ⚠ La salida no es JSON válido. Mostrando raw:") + nl + nl);
    write("  " + output.trim().split("\n").join("\r\n  ") + nl + nl);
    return;
  }

  if (tableMode && Array.isArray(parsed)) {
    const table = formatAsTable(parsed);
    if (table) {
      write(nl + C.cyan(`  ◈ TABLA (${parsed.length} items)`) + nl + nl);
      write(table + nl);
      return;
    }
  }

  write(nl + C.cyan("  ◈ JSON formateado") + nl + nl);
  write("  " + formatJsonAnsi(parsed) + nl + nl);
}

// ── nw fix ────────────────────────────────────────────────────────────────
let lastOutput = "";
async function cmdFix(args, write) {
  const { detectErrors } = await import("../utils/smart-output.js");
  if (!lastOutput) {
    write(nl + C.dim("  Sin salida anterior para analizar. Ejecuta un comando primero.") + nl + nl);
    return;
  }
  const errors = detectErrors(lastOutput);
  if (errors.length === 0) {
    write(nl + C.green("  ✓ No se detectaron errores conocidos en la salida anterior.") + nl + nl);
    return;
  }
  write(nl + C.cyan("◈ NW FIX — Sugerencias") + nl + SEP + nl + nl);
  errors.forEach((err, i) => {
    write(`  ${C.yellow(String(i + 1) + ".")} ${C.red(`[${err.tool}]`)} ${C.white(err.match.trim().slice(0, 80))}` + nl);
    write(`     ${C.green("→ " + err.suggestion)}` + nl + nl);
  });
}

export function setLastOutput(text) { lastOutput = text; }

// ── nw clip ────────────────────────────────────────────────────────────────
const CLIP_KEY = "nw-clipboard";
function loadClip() { try { return JSON.parse(localStorage.getItem(CLIP_KEY) || "[]"); } catch { return []; } }
function saveClip(items) { localStorage.setItem(CLIP_KEY, JSON.stringify(items.slice(0, 20))); }

async function cmdClip(args, write) {
  const sub = args[0]?.toLowerCase();

  if (sub === "search" && args[1]) {
    const q = args.slice(1).join(" ").toLowerCase();
    const items = loadClip().filter(c => c.text.toLowerCase().includes(q));
    if (!items.length) { write(nl + C.dim("  Sin resultados.") + nl + nl); return; }
    write(nl + C.cyan(`◈ CLIPBOARD — búsqueda: "${q}"`) + nl + SEP + nl + nl);
    items.forEach((c, i) => {
      write(`  ${C.yellow(String(i + 1).padStart(2))} ${C.white(c.text.slice(0, 60))}` + nl);
      write(`     ${C.dim(c.time)}` + nl);
    });
    write(nl);
    return;
  }

  if (sub && !isNaN(parseInt(sub))) {
    const idx = parseInt(sub) - 1;
    const items = loadClip();
    if (idx >= 0 && idx < items.length) {
      try { await navigator.clipboard.writeText(items[idx].text); } catch {}
      write(nl + C.green(`✓ Copiado al portapapeles: ${C.white(items[idx].text.slice(0, 60))}`) + nl + nl);
    } else {
      write(nl + C.red(`✗ Item #${sub} no encontrado`) + nl + nl);
    }
    return;
  }

  if (sub === "add" && args.length > 1) {
    const text = args.slice(1).join(" ");
    const items = loadClip();
    items.unshift({ text, time: new Date().toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) });
    saveClip(items);
    write(nl + C.green(`✓ Guardado en clipboard`) + nl + nl);
    return;
  }

  if (sub === "clear") {
    saveClip([]);
    write(nl + C.green("✓ Clipboard limpiado") + nl + nl);
    return;
  }

  // Default: list
  const items = loadClip();
  if (!items.length) {
    write(nl + C.dim("  Clipboard vacío. Usa nw clip add <texto> para guardar.") + nl + nl);
    return;
  }
  write(nl + C.cyan("◈ CLIPBOARD MANAGER") + nl + SEP + nl + nl);
  items.forEach((c, i) => {
    write(`  ${C.yellow(String(i + 1).padStart(2))} ${C.white(c.text.slice(0, 60))}${c.text.length > 60 ? C.dim("...") : ""}` + nl);
    write(`     ${C.dim(c.time)}` + nl);
  });
  write(nl + C.dim("  nw clip <n> · nw clip search <texto> · nw clip add <texto> · nw clip clear") + nl + nl);
}

// ── nw ctx — Contexto de proyecto automático ─────────────────────────────────
async function cmdCtx(args, write) {
  write(nl + C.cyan("◈ PROJECT CONTEXT") + nl + SEP + nl + nl);
  const res = await ps(`
    $cwd = (Get-Location).Path
    $branch = git branch --show-current 2>$null
    $dirty = if (git status --porcelain 2>$null) {"dirty"} else {"clean"}
    $files = @()
    @("package.json","Cargo.toml","docker-compose.yml","docker-compose.yaml","Dockerfile","hardhat.config.js","hardhat.config.ts","next.config.js","next.config.mjs","astro.config.mjs","vite.config.js","vite.config.ts","pyproject.toml","requirements.txt","go.mod","Makefile","src-tauri") | ForEach-Object {
      if (Test-Path $_) { $files += $_ }
    }
    Write-Output "CWD:$cwd"
    Write-Output "BRANCH:$branch"
    Write-Output "DIRTY:$dirty"
    Write-Output "FILES:$($files -join ',')"
    if (Test-Path "package.json") {
      $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
      Write-Output "PKG_NAME:$($pkg.name)"
      Write-Output "PKG_VER:$($pkg.version)"
      $scripts = ($pkg.scripts | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name) -join ','
      Write-Output "SCRIPTS:$scripts"
      $node = node --version 2>$null
      Write-Output "NODE:$node"
    }
    if (Test-Path "Cargo.toml") {
      $rustc = rustc --version 2>$null
      Write-Output "RUSTC:$rustc"
    }
  `);
  const info = {};
  (res.stdout || "").trim().split("\n").forEach(line => {
    const [k, ...v] = line.split(":");
    if (k) info[k.trim()] = v.join(":").trim();
  });

  write(`  ${C.dim("Dir:")}    ${C.cyan(info.CWD || "?")}` + nl);
  if (info.BRANCH) write(`  ${C.dim("Git:")}    ${C.magenta(info.BRANCH)} ${info.DIRTY === "dirty" ? C.red("● dirty") : C.green("✓ clean")}` + nl);

  const types = [];
  const files = (info.FILES || "").split(",").filter(Boolean);
  if (files.includes("src-tauri")) types.push({ name: "Tauri", color: C.yellow, icon: "⚡" });
  if (files.includes("next.config.js") || files.includes("next.config.mjs")) types.push({ name: "Next.js", color: C.cyan, icon: "▲" });
  if (files.includes("astro.config.mjs")) types.push({ name: "Astro", color: C.magenta, icon: "🚀" });
  if (files.includes("vite.config.js") || files.includes("vite.config.ts")) types.push({ name: "Vite", color: C.yellow, icon: "⚡" });
  if (files.includes("hardhat.config.js") || files.includes("hardhat.config.ts")) types.push({ name: "Hardhat", color: C.yellow, icon: "⛑" });
  if (files.includes("Cargo.toml")) types.push({ name: "Rust", color: C.red, icon: "🦀" });
  if (files.includes("package.json")) types.push({ name: "Node.js", color: C.green, icon: "◆" });
  if (files.includes("Dockerfile") || files.includes("docker-compose.yml") || files.includes("docker-compose.yaml")) types.push({ name: "Docker", color: C.cyan, icon: "🐳" });
  if (files.includes("pyproject.toml") || files.includes("requirements.txt")) types.push({ name: "Python", color: C.yellow, icon: "🐍" });
  if (files.includes("go.mod")) types.push({ name: "Go", color: C.cyan, icon: "◇" });

  if (types.length) {
    write(`  ${C.dim("Stack:")}  ${types.map(t => t.color(`${t.icon} ${t.name}`)).join(C.dim(" · "))}` + nl);
  }
  if (info.PKG_NAME) write(`  ${C.dim("Pkg:")}    ${C.white(info.PKG_NAME)}${info.PKG_VER ? C.dim("@" + info.PKG_VER) : ""}` + nl);
  if (info.NODE) write(`  ${C.dim("Node:")}   ${C.green(info.NODE)}` + nl);
  if (info.RUSTC) write(`  ${C.dim("Rust:")}   ${C.green(info.RUSTC)}` + nl);
  if (info.SCRIPTS) {
    const scripts = info.SCRIPTS.split(",").filter(Boolean);
    write(nl + `  ${C.yellow("Scripts disponibles:")}` + nl);
    scripts.forEach(s => {
      write(`    ${C.green("npm run " + s)}` + nl);
    });
    try { localStorage.setItem("nw-ctx-scripts", JSON.stringify(scripts)); } catch {}
  }
  write(nl);
}

// ── nw rec — Grabación de sesiones ───────────────────────────────────────────
const REC_KEY = "nw-recordings";
let activeRecording = null;

function loadRecordings() { try { return JSON.parse(localStorage.getItem(REC_KEY) || "{}"); } catch { return {}; } }
function saveRecordings(r) { localStorage.setItem(REC_KEY, JSON.stringify(r)); }

async function cmdRec(args, write) {
  const sub = args[0]?.toLowerCase();

  if (sub === "start") {
    const name = args[1] || `session-${Date.now()}`;
    if (activeRecording) {
      write(nl + C.red(`  ✗ Ya hay una grabación activa: ${activeRecording.name}`) + nl);
      write(C.dim("  Usa nw rec stop primero.") + nl + nl);
      return;
    }
    activeRecording = { name, started: new Date().toISOString(), entries: [] };
    write(nl + C.green(`  ● REC — Grabando sesión: ${C.yellow(name)}`) + nl);
    write(C.dim("  Usa nw rec stop para finalizar.") + nl + nl);
    return;
  }

  if (sub === "stop") {
    if (!activeRecording) {
      write(nl + C.dim("  No hay grabación activa.") + nl + nl);
      return;
    }
    const recs = loadRecordings();
    activeRecording.stopped = new Date().toISOString();
    recs[activeRecording.name] = activeRecording;
    saveRecordings(recs);
    write(nl + C.green(`  ■ Grabación "${activeRecording.name}" guardada (${activeRecording.entries.length} entradas)`) + nl + nl);
    activeRecording = null;
    return;
  }

  if (sub === "list") {
    const recs = loadRecordings();
    const names = Object.keys(recs);
    if (!names.length) { write(nl + C.dim("  Sin grabaciones. nw rec start [nombre]") + nl + nl); return; }
    write(nl + C.cyan("◈ RECORDINGS") + nl + SEP + nl + nl);
    names.forEach((name, i) => {
      const rec = recs[name];
      const date = new Date(rec.started).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      write(`  ${C.yellow(String(i + 1).padStart(2))} ${C.white(name.padEnd(24))} ${C.dim(date)} ${C.gray(`(${rec.entries.length} cmds)`)}` + nl);
    });
    write(nl + C.dim("  nw rec play <nombre> · nw rec export <nombre>") + nl + nl);
    return;
  }

  if (sub === "play" && args[1]) {
    const recs = loadRecordings();
    const rec = recs[args[1]];
    if (!rec) { write(nl + C.red(`  ✗ Grabación "${args[1]}" no encontrada`) + nl + nl); return; }
    write(nl + C.cyan(`◈ REPLAY: ${rec.name}`) + nl + SEP + nl + nl);
    rec.entries.forEach((entry, i) => {
      const ts = entry.time ? C.dim(`[${entry.time}] `) : "";
      write(`  ${ts}${C.yellow("▸")} ${C.white(entry.input)}` + nl);
      if (entry.output) {
        entry.output.split("\n").slice(0, 5).forEach(l => write(`    ${C.gray(l)}` + nl));
        if (entry.output.split("\n").length > 5) write(C.dim(`    ... (${entry.output.split("\n").length} líneas)`) + nl);
      }
    });
    write(nl);
    return;
  }

  if (sub === "export" && args[1]) {
    const recs = loadRecordings();
    const rec = recs[args[1]];
    if (!rec) { write(nl + C.red(`  ✗ Grabación "${args[1]}" no encontrada`) + nl + nl); return; }
    let md = `# NETWATCH Session: ${rec.name}\n`;
    md += `Started: ${rec.started}\n\n`;
    rec.entries.forEach(entry => {
      md += `\`\`\`\n$ ${entry.input}\n`;
      if (entry.output) md += `${entry.output}\n`;
      md += `\`\`\`\n\n`;
    });
    try { await navigator.clipboard.writeText(md); } catch {}
    write(nl + C.green(`  ✓ Exportado como markdown al portapapeles (${md.length} chars)`) + nl + nl);
    return;
  }

  if (sub === "del" && args[1]) {
    const recs = loadRecordings();
    if (recs[args[1]]) {
      delete recs[args[1]];
      saveRecordings(recs);
      write(nl + C.green(`  ✓ Grabación "${args[1]}" eliminada`) + nl + nl);
    } else {
      write(nl + C.red(`  ✗ Grabación "${args[1]}" no encontrada`) + nl + nl);
    }
    return;
  }

  write(nl + C.cyan("◈ SESSION RECORDING") + nl + SEP + nl + nl);
  write(`  ${C.yellow("nw rec start [nombre]")} ${C.dim("→")} iniciar grabación` + nl);
  write(`  ${C.yellow("nw rec stop")}           ${C.dim("→")} parar y guardar` + nl);
  write(`  ${C.yellow("nw rec list")}           ${C.dim("→")} listar grabaciones` + nl);
  write(`  ${C.yellow("nw rec play <nombre>")}  ${C.dim("→")} reproducir` + nl);
  write(`  ${C.yellow("nw rec export <nombre>")}${C.dim("→")} exportar a markdown` + nl);
  write(`  ${C.yellow("nw rec del <nombre>")}   ${C.dim("→")} eliminar` + nl + nl);
  if (activeRecording) write(`  ${C.red("● REC")} ${C.white(activeRecording.name)} ${C.dim(`(${activeRecording.entries.length} cmds)`)}` + nl + nl);
}

export function recordCommand(input, output) {
  if (activeRecording) {
    const time = new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    activeRecording.entries.push({ input, output: output?.slice(0, 2000), time });
  }
}

// ── nw dojo / nw notebook ──────────────────────────────────────────────────
async function cmdDojo(args, write) {
  window.dispatchEvent(new CustomEvent("nw-open-tab", { detail: "dojo" }));
  const sub = args[0]?.toLowerCase();
  if (sub === "tatami") {
    window.dispatchEvent(new CustomEvent("nw-dojo-mode", { detail: "tatami" }));
    write(nl + C.magenta("⛩ Abriendo DOJO → Modo TATAMI — misiones guiadas") + nl + nl);
  } else if (sub === "quiz") {
    window.dispatchEvent(new CustomEvent("nw-dojo-mode", { detail: "quiz" }));
    write(nl + C.magenta("⛩ Abriendo DOJO → Modo QUIZ") + nl + nl);
  } else if (sub === "forja") {
    window.dispatchEvent(new CustomEvent("nw-dojo-mode", { detail: "forja" }));
    write(nl + C.magenta("⛩ Abriendo DOJO → Modo FORJA — escribe scripts desde cero") + nl + nl);
  } else if (sub === "rosetta") {
    window.dispatchEvent(new CustomEvent("nw-dojo-mode", { detail: "rosetta" }));
    write(nl + C.magenta("⛩ Abriendo DOJO → Modo ROSETTA") + nl + nl);
  } else {
    write(nl + C.magenta("⛩ Abriendo DOJO — entrenamiento interactivo") + nl);
    write(C.dim("  Submodos: nw dojo quiz | tatami | forja | rosetta") + nl + nl);
  }
}

async function cmdNotebook(args, write) {
  window.dispatchEvent(new CustomEvent("nw-open-tab", { detail: "notebook" }));
  write(nl + C.green("📓 Abriendo NOTEBOOK") + nl + nl);
}

// ── nw plugin ─────────────────────────────────────────────────────────────────
const PLUGINS_KEY = "nw-plugins";
function loadPlugins() { try { return JSON.parse(localStorage.getItem(PLUGINS_KEY) || "{}"); } catch { return {}; } }
function savePlugins(p) { localStorage.setItem(PLUGINS_KEY, JSON.stringify(p)); }

async function cmdPlugin(args, write) {
  const sub = args[0]?.toLowerCase();
  const plugins = loadPlugins();

  if (sub === "install" && args[1]) {
    const name = args[1];
    if (plugins[name]) { write(nl + C.yellow(`  ⚠ Plugin '${name}' ya instalado`) + nl + nl); return; }

    write(nl + C.dim(`  Buscando plugin '${name}'...`) + nl);
    const pluginPath = `${process.env?.USERPROFILE || "~"}/.netwatch/plugins/${name}`;
    const res = await ps(`if (Test-Path "${pluginPath}/manifest.json") { Get-Content "${pluginPath}/manifest.json" -Raw } else { Write-Output "__NOTFOUND__" }`);
    const raw = res?.stdout?.trim();

    if (raw === "__NOTFOUND__" || !raw) {
      plugins[name] = { name, version: "1.0.0", commands: [], installed: new Date().toISOString(), local: false };
      savePlugins(plugins);
      write(C.green(`  ✓ Plugin '${name}' registrado (placeholder)`) + nl);
      write(C.dim(`  Crea: ~/.netwatch/plugins/${name}/manifest.json para comandos`) + nl + nl);
    } else {
      try {
        const manifest = JSON.parse(raw);
        plugins[name] = { ...manifest, installed: new Date().toISOString(), local: true };
        savePlugins(plugins);
        write(C.green(`  ✓ Plugin '${name}' v${manifest.version || "1.0"} instalado`) + nl);
        if (manifest.commands) write(C.dim(`  Comandos: ${manifest.commands.join(", ")}`) + nl);
        write(nl);
      } catch {
        write(C.red(`  ✗ manifest.json inválido para '${name}'`) + nl + nl);
      }
    }
    return;
  }

  if (sub === "remove" && args[1]) {
    if (plugins[args[1]]) {
      delete plugins[args[1]];
      savePlugins(plugins);
      write(nl + C.green(`  ✓ Plugin '${args[1]}' eliminado`) + nl + nl);
    } else {
      write(nl + C.red(`  ✗ Plugin '${args[1]}' no encontrado`) + nl + nl);
    }
    return;
  }

  // Default: list
  const names = Object.keys(plugins);
  write(nl + C.cyan("◈ PLUGINS") + nl + SEP + nl + nl);
  if (!names.length) {
    write(C.dim("  Sin plugins. nw plugin install <nombre>") + nl + nl);
    return;
  }
  names.forEach(name => {
    const p = plugins[name];
    write(`  ${C.yellow(name.padEnd(20))} ${C.dim("v" + (p.version || "?"))} ${C.gray(p.local ? "local" : "registered")}` + nl);
    if (p.commands?.length) write(`  ${C.dim("  cmds:")} ${C.green(p.commands.join(", "))}` + nl);
  });
  write(nl + C.dim("  nw plugin install/remove <nombre>") + nl + nl);
}

// ── nw profile ────────────────────────────────────────────────────────────────
async function cmdProfile(args, write) {
  const sub = args[0]?.toLowerCase();

  if (sub === "export") {
    const profile = {
      version: "1.0",
      theme: localStorage.getItem("nw-theme") || "cyan",
      panelOrder: JSON.parse(localStorage.getItem("nw-panel-order") || "null"),
      snippets: JSON.parse(localStorage.getItem("nw-snippets") || "{}"),
      plugins: loadPlugins(),
      notes: JSON.parse(localStorage.getItem("nw-notes") || "[]"),
      tasks: JSON.parse(localStorage.getItem("nw-tasks") || "[]"),
      clipboard: JSON.parse(localStorage.getItem("nw-clipboard") || "[]"),
      dojo: JSON.parse(localStorage.getItem("nw-dojo-progress") || "null"),
      exported: new Date().toISOString(),
    };
    const json = JSON.stringify(profile, null, 2);
    try { await navigator.clipboard.writeText(json); } catch {}
    write(nl + C.green("  ✓ Profile exportado al portapapeles") + nl);
    write(C.dim(`  ${json.length} bytes — pégalo en un archivo .nw-profile`) + nl + nl);
    return;
  }

  if (sub === "import") {
    write(nl + C.cyan("◈ IMPORT PROFILE") + nl + SEP + nl + nl);
    write(C.dim("  Para importar, copia el contenido del .nw-profile y ejecuta:") + nl);
    write(C.yellow("  nw profile load <json-en-una-línea>") + nl + nl);
    return;
  }

  if (sub === "load" && args[1]) {
    try {
      const json = args.slice(1).join(" ");
      const profile = JSON.parse(json);
      if (profile.theme) { localStorage.setItem("nw-theme", profile.theme); document.documentElement.dataset.theme = profile.theme; }
      if (profile.panelOrder) localStorage.setItem("nw-panel-order", JSON.stringify(profile.panelOrder));
      if (profile.snippets) localStorage.setItem("nw-snippets", JSON.stringify(profile.snippets));
      if (profile.plugins) savePlugins(profile.plugins);
      write(nl + C.green("  ✓ Profile importado correctamente") + nl);
      write(C.dim("  Recarga la app para aplicar todos los cambios.") + nl + nl);
    } catch (e) {
      write(nl + C.red(`  ✗ Error parseando profile: ${e.message}`) + nl + nl);
    }
    return;
  }

  write(nl + C.cyan("◈ PROFILES") + nl + SEP + nl + nl);
  write(`  ${C.yellow("nw profile export")}  ${C.dim("→")} exportar config al portapapeles` + nl);
  write(`  ${C.yellow("nw profile import")}  ${C.dim("→")} instrucciones para importar` + nl + nl);
  write(C.dim("  Incluye: tema, panel order, snippets, plugins, notas, tasks, dojo progress") + nl + nl);
}

// ── nw sync ──────────────────────────────────────────────────────────────────
const SYNC_REPO_KEY = "nw-sync-repo";

async function cmdSync(args, write, sendToShell) {
  const sub = args[0]?.toLowerCase();
  const syncRepo = localStorage.getItem(SYNC_REPO_KEY);

  if (sub === "setup" && args[1]) {
    localStorage.setItem(SYNC_REPO_KEY, args[1]);
    write(nl + C.green(`  ✓ Sync repo configurado: ${C.cyan(args[1])}`) + nl + nl);
    return;
  }

  if (!syncRepo) {
    write(nl + C.cyan("◈ SYNC") + nl + SEP + nl + nl);
    write(C.dim("  No hay repo de sync configurado.") + nl);
    write(`  ${C.yellow("nw sync setup <ruta-o-url>")} ${C.dim("→")} configurar repo git para sync` + nl + nl);
    write(C.dim("  Ejemplo: nw sync setup ~/netwatch-sync") + nl);
    write(C.dim("  Ejemplo: nw sync setup git@github.com:user/nw-config.git") + nl + nl);
    return;
  }

  if (sub === "push") {
    write(nl + C.cyan("◈ SYNC PUSH") + nl + SEP + nl + nl);
    const profile = {
      version: "1.0",
      theme: localStorage.getItem("nw-theme") || "cyan",
      panelOrder: JSON.parse(localStorage.getItem("nw-panel-order") || "null"),
      snippets: JSON.parse(localStorage.getItem("nw-snippets") || "{}"),
      plugins: loadPlugins(),
      synced: new Date().toISOString(),
    };
    const json = JSON.stringify(profile, null, 2);
    const cmds = [
      `cd "${syncRepo}"`,
      `if (-not (Test-Path .git)) { git init }`,
      `Set-Content -Path "nw-profile.json" -Value '${json.replace(/'/g, "''")}'`,
      `git add nw-profile.json`,
      `git commit -m "sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm')" 2>$null`,
    ].join("; ");
    const res = await ps(cmds);
    write(C.green("  ✓ Config guardada en repo de sync") + nl);
    write(C.dim(`  ${syncRepo}`) + nl + nl);
    if (res.stdout?.trim()) write(C.gray("  " + res.stdout.trim().split("\n").slice(-2).join("\r\n  ")) + nl + nl);
    return;
  }

  if (sub === "pull") {
    write(nl + C.cyan("◈ SYNC PULL") + nl + SEP + nl + nl);
    const res = await ps(`cd "${syncRepo}"; if (Test-Path "nw-profile.json") { Get-Content "nw-profile.json" -Raw } else { Write-Output "__NOTFOUND__" }`);
    const raw = res?.stdout?.trim();
    if (!raw || raw === "__NOTFOUND__") {
      write(C.red("  ✗ No se encontró nw-profile.json en el repo de sync") + nl + nl);
      return;
    }
    try {
      const profile = JSON.parse(raw);
      if (profile.theme) { localStorage.setItem("nw-theme", profile.theme); document.documentElement.dataset.theme = profile.theme; }
      if (profile.panelOrder) localStorage.setItem("nw-panel-order", JSON.stringify(profile.panelOrder));
      if (profile.snippets) localStorage.setItem("nw-snippets", JSON.stringify(profile.snippets));
      if (profile.plugins) savePlugins(profile.plugins);
      write(C.green("  ✓ Config importada desde repo de sync") + nl);
      write(C.dim(`  Fecha del sync: ${profile.synced || "?"}`) + nl + nl);
    } catch (e) {
      write(C.red(`  ✗ Error parseando profile: ${e.message}`) + nl + nl);
    }
    return;
  }

  write(nl + C.cyan("◈ SYNC") + nl + SEP + nl + nl);
  write(`  ${C.dim("Repo:")} ${C.cyan(syncRepo)}` + nl + nl);
  write(`  ${C.yellow("nw sync push")}          ${C.dim("→")} guardar config en repo` + nl);
  write(`  ${C.yellow("nw sync pull")}          ${C.dim("→")} cargar config desde repo` + nl);
  write(`  ${C.yellow("nw sync setup <repo>")}  ${C.dim("→")} cambiar repo` + nl + nl);
}

// ── nw tail — Monitorizar archivos ──────────────────────────────────────────
async function cmdTail(args, write, sendToShell) {
  const file = args[0];
  const lines = parseInt(args[1]) || 20;

  if (!file) {
    write(nl + C.cyan("◈ NW TAIL — Monitorizar archivos") + nl + SEP + nl + nl);
    write(`  ${C.yellow("nw tail <archivo>")}      ${C.dim("→")} últimas 20 líneas del archivo` + nl);
    write(`  ${C.yellow("nw tail <archivo> <n>")}   ${C.dim("→")} últimas N líneas` + nl);
    write(`  ${C.yellow("nw tail -f <archivo>")}    ${C.dim("→")} seguir archivo en terminal (tail -f)` + nl + nl);
    write(C.dim("  Ejemplo: nw tail /var/log/syslog 50") + nl);
    write(C.dim("  Ejemplo: nw tail -f app.log") + nl + nl);
    return;
  }

  if (file === "-f" && args[1]) {
    write(nl + C.cyan(`  ◈ TAIL -F: ${args[1]}`) + nl + C.dim("  Ctrl+C para detener") + nl + nl);
    sendToShell(`Get-Content "${args[1]}" -Wait -Tail 20\r`);
    return;
  }

  const res = await ps(`if (Test-Path "${file}") { Get-Content "${file}" -Tail ${lines} } else { Write-Output "__NOTFOUND__" }`);
  const output = res?.stdout?.trim();
  if (!output || output === "__NOTFOUND__") {
    write(nl + C.red(`  ✗ Archivo no encontrado: ${file}`) + nl + nl);
    return;
  }
  write(nl + C.cyan(`◈ TAIL: ${file}`) + C.dim(` (${lines} líneas)`) + nl + SEP + nl + nl);
  output.split("\n").forEach(line => {
    if (line.match(/error|exception|fail/i)) write(`  ${C.red(line)}` + nl);
    else if (line.match(/warn/i)) write(`  ${C.yellow(line)}` + nl);
    else write(`  ${C.gray(line)}` + nl);
  });
  write(nl);
}

// ── nw docker — Docker helper ──────────────────────────────────────────────
async function cmdDocker(args, write, sendToShell) {
  const sub = args[0]?.toLowerCase();

  if (sub === "ps") {
    write(nl + C.cyan("◈ DOCKER CONTAINERS") + nl + SEP + nl + nl);
    const res = await ps("docker ps --format '{{.ID}}|{{.Names}}|{{.Status}}|{{.Ports}}|{{.Image}}' 2>$null");
    const lines = (res?.stdout || "").trim().split("\n").filter(Boolean);
    if (!lines.length) { write(C.dim("  Sin contenedores activos.") + nl + nl); return; }
    lines.forEach(line => {
      const [id, name, status, ports, image] = line.split("|");
      const running = status?.includes("Up");
      write(`  ${running ? C.green("●") : C.red("●")} ${C.yellow((name || "").padEnd(20))} ${C.cyan((image || "").padEnd(24))} ${C.dim(id?.slice(0, 12))}` + nl);
      if (ports) write(`    ${C.gray(ports)}` + nl);
    });
    write(nl);
    return;
  }

  if (sub === "logs" && args[1]) {
    const container = args[1];
    const tail = args[2] || "30";
    write(nl + C.cyan(`◈ DOCKER LOGS: ${container}`) + C.dim(` (${tail} líneas)`) + nl + SEP + nl + nl);
    const res = await ps(`docker logs --tail ${tail} "${container}" 2>&1`);
    const output = (res?.stdout || "").trim();
    if (!output) { write(C.dim("  Sin output.") + nl + nl); return; }
    output.split("\n").forEach(line => {
      if (line.match(/error|exception|fail|panic/i)) write(`  ${C.red(line)}` + nl);
      else if (line.match(/warn/i)) write(`  ${C.yellow(line)}` + nl);
      else write(`  ${C.gray(line)}` + nl);
    });
    write(nl);
    return;
  }

  if (sub === "follow" && args[1]) {
    write(nl + C.cyan(`  ◈ DOCKER LOGS -F: ${args[1]}`) + nl + C.dim("  Ctrl+C para detener") + nl + nl);
    sendToShell(`docker logs -f "${args[1]}"\r`);
    return;
  }

  write(nl + C.cyan("◈ NW DOCKER") + nl + SEP + nl + nl);
  write(`  ${C.yellow("nw docker ps")}             ${C.dim("→")} contenedores activos` + nl);
  write(`  ${C.yellow("nw docker logs <name>")}    ${C.dim("→")} últimas 30 líneas de logs` + nl);
  write(`  ${C.yellow("nw docker logs <name> <n>")}${C.dim("→")} últimas N líneas` + nl);
  write(`  ${C.yellow("nw docker follow <name>")} ${C.dim("→")} seguir logs en tiempo real` + nl + nl);
}

// ── Registro ──────────────────────────────────────────────────────────────────
export const NW_COMMANDS = {
  help: cmdHelp, status: cmdStatus, eth: cmdEth, repos: cmdRepos,
  ssh: cmdSsh, snip: cmdSnip, deploy: cmdDeploy, ai: cmdAi, task: cmdTask, note: cmdNote,
  config: cmdConfig, theme: cmdTheme, json: cmdJson, fix: cmdFix, clip: cmdClip,
  ctx: cmdCtx, rec: cmdRec, dojo: cmdDojo, notebook: cmdNotebook,
  plugin: cmdPlugin, profile: cmdProfile, sync: cmdSync, tail: cmdTail, docker: cmdDocker,
};

async function tryRustBackend(input) {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke("execute_nw", { input });
  } catch { return null; }
}

export async function handleNwCommand(input, write, sendToShell, context = {}) {
  const trimmed = input.trim();
  if (!trimmed.startsWith("nw ") && trimmed !== "nw") return { handled: false };

  // Try Rust native DSL first
  const rustResult = await tryRustBackend(trimmed);
  if (rustResult?.handled) {
    write(rustResult.output);
    recordCommand(trimmed, rustResult.output);
    return { handled: true };
  }

  // Fall back to JS commands — capture output for recording
  let captured = "";
  const wrappedWrite = (t) => { captured += t; write(t); };
  const parts   = trimmed.split(/\s+/);
  const sub     = parts[1]?.toLowerCase();
  const args    = parts.slice(2);
  const handler = NW_COMMANDS[sub] || NW_COMMANDS["help"];
  try { await handler(sub ? args : [], wrappedWrite, sendToShell, context); }
  catch (e) { write(`\r\n${C.red(`✗ Error: ${e.message}`)}\r\n`); }
  recordCommand(trimmed, captured);
  return { handled: true };
}
