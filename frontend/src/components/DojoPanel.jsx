import { useState, useEffect, useCallback, useRef, memo } from "react";

const Y   = "#FCEE0A";
const G   = "#39FF14";
const C   = "var(--nw-accent)";
const M   = "#D9027D";
const R   = "#ff5555";
const DIM = "#333";
const W   = "#E8E8E8";
const CYAN = "#00F0FF";

async function invoke(cmd, args) {
  try {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    return await tauriInvoke(cmd, args);
  } catch { return null; }
}

const DOJO_KEY = "nw-dojo-progress";
const TATAMI_KEY = "nw-tatami-progress";

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(DOJO_KEY) || "null") || defaultProgress(); }
  catch { return defaultProgress(); }
}
function saveProgress(p) { localStorage.setItem(DOJO_KEY, JSON.stringify(p)); }
function defaultProgress() {
  return { level: 1, xp: 0, streak: 0, lastDay: null, history: [], totalCorrect: 0, totalWrong: 0 };
}

const QUIZ_BANK = [
  { cat: "powershell", q: "¿Cómo listas todos los procesos en PowerShell?", options: ["Get-Process", "ps aux", "tasklist", "top"], answer: 0 },
  { cat: "powershell", q: "¿Cómo obtienes la IP local en PowerShell?", options: ["ipconfig", "Get-NetIPAddress", "ifconfig", "hostname -I"], answer: 1 },
  { cat: "powershell", q: "¿Cómo creas un archivo vacío en PowerShell?", options: ["touch file.txt", "New-Item file.txt", "echo > file.txt", "cat file.txt"], answer: 1 },
  { cat: "powershell", q: "¿Qué cmdlet muestra los servicios del sistema?", options: ["Get-Service", "sc query", "systemctl", "services.msc"], answer: 0 },
  { cat: "linux", q: "¿Cómo ves permisos de un archivo en Linux?", options: ["ls -l", "dir /q", "Get-Acl", "chmod"], answer: 0 },
  { cat: "linux", q: "¿Qué comando busca texto dentro de archivos?", options: ["find", "grep", "locate", "which"], answer: 1 },
  { cat: "linux", q: "¿Cómo cambias el dueño de un archivo?", options: ["chmod", "chown", "chgrp", "setfacl"], answer: 1 },
  { cat: "linux", q: "¿Cómo muestras las últimas 20 líneas de un log?", options: ["head -20", "tail -20", "cat -20", "less -20"], answer: 1 },
  { cat: "git", q: "¿Cómo ves el historial de commits en una línea?", options: ["git log --oneline", "git status", "git show", "git diff"], answer: 0 },
  { cat: "git", q: "¿Cómo deshaces el último commit sin perder cambios?", options: ["git revert HEAD", "git reset --soft HEAD~1", "git checkout .", "git stash"], answer: 1 },
  { cat: "git", q: "¿Cómo ves qué archivos están staged?", options: ["git diff", "git status", "git log", "git show"], answer: 1 },
  { cat: "git", q: "¿Cómo creas y cambias a una nueva rama?", options: ["git branch new && git checkout new", "git checkout -b new", "git switch new", "git merge new"], answer: 1 },
  { cat: "docker", q: "¿Cómo listas contenedores activos?", options: ["docker ps", "docker images", "docker ls", "docker run"], answer: 0 },
  { cat: "docker", q: "¿Cómo paras todos los contenedores?", options: ["docker kill all", "docker stop $(docker ps -q)", "docker rm -f *", "docker down"], answer: 1 },
  { cat: "docker", q: "¿Cómo ves los logs de un contenedor?", options: ["docker info <id>", "docker logs <id>", "docker inspect <id>", "docker cat <id>"], answer: 1 },
  { cat: "redes", q: "¿Qué puerto usa SSH por defecto?", options: ["21", "22", "80", "443"], answer: 1 },
  { cat: "redes", q: "¿Qué protocolo usa HTTPS?", options: ["HTTP", "FTP", "TLS/SSL", "SMTP"], answer: 2 },
  { cat: "redes", q: "¿Qué herramienta analiza paquetes de red?", options: ["ping", "tracert", "Wireshark", "nslookup"], answer: 2 },
  { cat: "k8s", q: "¿Cómo listas los pods en Kubernetes?", options: ["kubectl get pods", "kubectl list", "k8s pods", "docker ps"], answer: 0 },
  { cat: "k8s", q: "¿Qué es un Deployment en K8s?", options: ["Un contenedor", "Un pod wrapper", "Un controlador de réplicas", "Un servicio"], answer: 2 },
];

const ROSETTA = [
  { action: "Listar archivos",     ps: "Get-ChildItem / dir",       bash: "ls -la",         cmd: "dir" },
  { action: "Ver procesos",        ps: "Get-Process",               bash: "ps aux / top",    cmd: "tasklist" },
  { action: "Copiar archivo",      ps: "Copy-Item a b",             bash: "cp a b",          cmd: "copy a b" },
  { action: "Mover archivo",       ps: "Move-Item a b",             bash: "mv a b",          cmd: "move a b" },
  { action: "Eliminar archivo",    ps: "Remove-Item file",          bash: "rm file",         cmd: "del file" },
  { action: "Ver contenido",       ps: "Get-Content file",          bash: "cat file",        cmd: "type file" },
  { action: "Buscar texto",        ps: "Select-String 'pattern'",   bash: "grep 'pattern'",  cmd: "findstr pattern" },
  { action: "IP local",            ps: "Get-NetIPAddress",          bash: "ip addr / ifconfig", cmd: "ipconfig" },
  { action: "Puertos abiertos",    ps: "Get-NetTCPConnection",      bash: "ss -tlnp / netstat", cmd: "netstat -ano" },
  { action: "Variable entorno",    ps: "$env:PATH",                 bash: "$PATH",           cmd: "%PATH%" },
  { action: "Crear directorio",    ps: "New-Item -Type Dir name",   bash: "mkdir name",      cmd: "mkdir name" },
  { action: "Permisos",            ps: "Get-Acl file",              bash: "chmod 755 file",  cmd: "icacls file" },
];

const CAT_COLORS = { powershell: Y, linux: G, git: M, docker: "#00F0FF", redes: "#ff8800", k8s: "#39ccff", filesystem: Y, services: "#ff8800", networking: CYAN };

const MISSIONS_BANK = [
  {
    id: "fs-01", cat: "filesystem", title: "Crea tu estructura de proyecto",
    desc: "Aprende a crear directorios y archivos desde la terminal.",
    difficulty: 1, xp: 25,
    steps: [
      {
        instruction: "Crea un directorio llamado 'dojo-lab' en tu carpeta temporal.",
        hint: "New-Item -ItemType Directory -Path $env:TEMP\\dojo-lab",
        validate: `if (Test-Path "$env:TEMP\\dojo-lab") { "OK" } else { "FAIL" }`,
      },
      {
        instruction: "Dentro de 'dojo-lab', crea un archivo 'README.md'.",
        hint: "New-Item -Path $env:TEMP\\dojo-lab\\README.md -ItemType File",
        validate: `if (Test-Path "$env:TEMP\\dojo-lab\\README.md") { "OK" } else { "FAIL" }`,
      },
      {
        instruction: "Escribe 'Hola Dojo' dentro de README.md.",
        hint: "Set-Content $env:TEMP\\dojo-lab\\README.md 'Hola Dojo'",
        validate: `if ((Get-Content "$env:TEMP\\dojo-lab\\README.md" -Raw -ErrorAction SilentlyContinue) -match 'Hola Dojo') { "OK" } else { "FAIL" }`,
      },
      {
        instruction: "Crea subdirectorios 'src' y 'docs' dentro de dojo-lab.",
        hint: "New-Item -ItemType Directory $env:TEMP\\dojo-lab\\src, $env:TEMP\\dojo-lab\\docs",
        validate: `if ((Test-Path "$env:TEMP\\dojo-lab\\src") -and (Test-Path "$env:TEMP\\dojo-lab\\docs")) { "OK" } else { "FAIL" }`,
      },
    ],
  },
  {
    id: "fs-02", cat: "filesystem", title: "Buscar y filtrar archivos",
    desc: "Domina la búsqueda de archivos con Get-ChildItem y filtros.",
    difficulty: 2, xp: 30,
    steps: [
      {
        instruction: "Lista todos los archivos .txt en tu carpeta TEMP (solo el primer nivel).",
        hint: "Get-ChildItem $env:TEMP -Filter *.txt -File",
        validate: `$r = Get-ChildItem $env:TEMP -Filter *.txt -File -ErrorAction SilentlyContinue; if ($null -ne $r) { "OK" } else { "OK" }`,
      },
      {
        instruction: "Crea 3 archivos en dojo-lab: test1.log, test2.log, data.csv.",
        hint: "'a' | Set-Content $env:TEMP\\dojo-lab\\test1.log; 'b' | Set-Content $env:TEMP\\dojo-lab\\test2.log; 'c' | Set-Content $env:TEMP\\dojo-lab\\data.csv",
        validate: `$p = "$env:TEMP\\dojo-lab"; if ((Test-Path "$p\\test1.log") -and (Test-Path "$p\\test2.log") -and (Test-Path "$p\\data.csv")) { "OK" } else { "FAIL" }`,
      },
      {
        instruction: "Cuenta cuántos archivos .log hay en dojo-lab.",
        hint: "(Get-ChildItem $env:TEMP\\dojo-lab -Filter *.log).Count",
        validate: `$c = (Get-ChildItem "$env:TEMP\\dojo-lab" -Filter *.log -ErrorAction SilentlyContinue).Count; if ($c -ge 2) { "OK" } else { "FAIL" }`,
      },
    ],
  },
  {
    id: "svc-01", cat: "services", title: "Explora los servicios del sistema",
    desc: "Aprende a consultar y entender los servicios de Windows.",
    difficulty: 1, xp: 20,
    steps: [
      {
        instruction: "Lista los servicios que están corriendo (Running).",
        hint: "Get-Service | Where-Object Status -eq 'Running'",
        validate: `$s = Get-Service | Where-Object Status -eq 'Running'; if ($s.Count -gt 0) { "OK" } else { "FAIL" }`,
      },
      {
        instruction: "Busca el servicio 'wuauserv' (Windows Update) y comprueba su estado.",
        hint: "Get-Service wuauserv",
        validate: `$s = Get-Service wuauserv -ErrorAction SilentlyContinue; if ($s) { "OK" } else { "OK" }`,
      },
      {
        instruction: "Exporta la lista de servicios detenidos a dojo-lab/stopped-services.txt.",
        hint: "Get-Service | Where Status -eq Stopped | Select Name | Out-File $env:TEMP\\dojo-lab\\stopped-services.txt",
        validate: `if (Test-Path "$env:TEMP\\dojo-lab\\stopped-services.txt") { "OK" } else { "FAIL" }`,
      },
    ],
  },
  {
    id: "net-01", cat: "networking", title: "Diagnóstico de red básico",
    desc: "Usa herramientas de red para diagnosticar conectividad.",
    difficulty: 1, xp: 20,
    steps: [
      {
        instruction: "Obtén tu dirección IP local.",
        hint: "Get-NetIPAddress -AddressFamily IPv4 | Where InterfaceAlias -notlike '*Loopback*'",
        validate: `$ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -ne '127.0.0.1' }; if ($ip) { "OK" } else { "OK" }`,
      },
      {
        instruction: "Haz ping a localhost (1 paquete) y guarda el resultado en dojo-lab/ping.txt.",
        hint: "Test-Connection localhost -Count 1 | Out-File $env:TEMP\\dojo-lab\\ping.txt",
        validate: `if (Test-Path "$env:TEMP\\dojo-lab\\ping.txt") { "OK" } else { "FAIL" }`,
      },
      {
        instruction: "Lista los puertos TCP que están escuchando.",
        hint: "Get-NetTCPConnection -State Listen | Select LocalPort -Unique | Sort LocalPort",
        validate: `$p = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue; if ($p) { "OK" } else { "OK" }`,
      },
    ],
  },
  {
    id: "net-02", cat: "networking", title: "DNS y resolución de nombres",
    desc: "Entiende cómo funciona la resolución DNS desde la terminal.",
    difficulty: 2, xp: 30,
    steps: [
      {
        instruction: "Resuelve la IP de 'google.com' usando Resolve-DnsName.",
        hint: "Resolve-DnsName google.com -Type A",
        validate: `$r = Resolve-DnsName google.com -Type A -ErrorAction SilentlyContinue; if ($r) { "OK" } else { "OK" }`,
      },
      {
        instruction: "Consulta los registros MX de 'google.com'.",
        hint: "Resolve-DnsName google.com -Type MX",
        validate: `$r = Resolve-DnsName google.com -Type MX -ErrorAction SilentlyContinue; if ($r) { "OK" } else { "OK" }`,
      },
      {
        instruction: "Guarda la configuración DNS de tu adaptador en dojo-lab/dns-config.txt.",
        hint: "Get-DnsClientServerAddress | Out-File $env:TEMP\\dojo-lab\\dns-config.txt",
        validate: `if (Test-Path "$env:TEMP\\dojo-lab\\dns-config.txt") { "OK" } else { "FAIL" }`,
      },
    ],
  },
  {
    id: "git-01", cat: "git", title: "Inicializa un repositorio",
    desc: "Crea un repo git desde cero y haz tu primer commit.",
    difficulty: 1, xp: 25,
    steps: [
      {
        instruction: "Inicializa un repositorio git en dojo-lab.",
        hint: "cd $env:TEMP\\dojo-lab; git init",
        validate: `if (Test-Path "$env:TEMP\\dojo-lab\\.git") { "OK" } else { "FAIL" }`,
      },
      {
        instruction: "Añade todos los archivos al staging area.",
        hint: "cd $env:TEMP\\dojo-lab; git add .",
        validate: `$r = (cd "$env:TEMP\\dojo-lab" 2>$null && git status --porcelain 2>$null); "OK"`,
      },
      {
        instruction: "Haz un commit con el mensaje 'init: primer commit del dojo'.",
        hint: "cd $env:TEMP\\dojo-lab; git commit -m 'init: primer commit del dojo'",
        validate: `$r = (cd "$env:TEMP\\dojo-lab" 2>$null && git log --oneline -1 2>$null); if ($r) { "OK" } else { "FAIL" }`,
      },
    ],
  },
  {
    id: "docker-01", cat: "docker", title: "Primeros pasos con Docker",
    desc: "Comprueba tu instalación de Docker y explora imágenes.",
    difficulty: 2, xp: 25,
    steps: [
      {
        instruction: "Comprueba que Docker está instalado y muestra la versión.",
        hint: "docker --version",
        validate: `$v = docker --version 2>$null; if ($v) { "OK" } else { "SKIP:Docker no detectado — puedes saltar esta misión" }`,
      },
      {
        instruction: "Lista las imágenes Docker descargadas.",
        hint: "docker images",
        validate: `$r = docker images 2>$null; if ($LASTEXITCODE -eq 0) { "OK" } else { "SKIP:Docker no disponible" }`,
      },
      {
        instruction: "Lista los contenedores (activos e inactivos).",
        hint: "docker ps -a",
        validate: `$r = docker ps -a 2>$null; if ($LASTEXITCODE -eq 0) { "OK" } else { "SKIP:Docker no disponible" }`,
      },
    ],
  },
  {
    id: "ps-01", cat: "powershell", title: "Procesos y rendimiento",
    desc: "Monitoriza procesos y uso de recursos del sistema.",
    difficulty: 2, xp: 30,
    steps: [
      {
        instruction: "Lista los 5 procesos que más CPU consumen.",
        hint: "Get-Process | Sort CPU -Descending | Select -First 5 Name, CPU, Id",
        validate: `$p = Get-Process | Sort CPU -Descending | Select -First 5; if ($p.Count -eq 5) { "OK" } else { "OK" }`,
      },
      {
        instruction: "Guarda la info de los procesos actuales en dojo-lab/procs.csv.",
        hint: "Get-Process | Select Name, Id, CPU, WorkingSet | Export-Csv $env:TEMP\\dojo-lab\\procs.csv -NoTypeInformation",
        validate: `if (Test-Path "$env:TEMP\\dojo-lab\\procs.csv") { "OK" } else { "FAIL" }`,
      },
      {
        instruction: "Muestra cuánta RAM total tiene el sistema (en GB).",
        hint: "[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)",
        validate: `$m = (Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue).TotalPhysicalMemory; if ($m -gt 0) { "OK" } else { "OK" }`,
      },
    ],
  },
];

const MISSION_CAT_COLORS = { filesystem: Y, services: "#ff8800", networking: CYAN, git: M, docker: "#00F0FF", powershell: Y };

function loadTatami() {
  try { return JSON.parse(localStorage.getItem(TATAMI_KEY) || "null") || { completed: [], current: null, currentStep: 0 }; }
  catch { return { completed: [], current: null, currentStep: 0 }; }
}
function saveTatami(t) { localStorage.setItem(TATAMI_KEY, JSON.stringify(t)); }

const FORJA_KEY = "nw-forja-progress";

const FORJA_CHALLENGES = [
  {
    id: "forja-01", cat: "powershell", title: "Listar archivos grandes",
    desc: "Escribe un script que liste los 5 archivos más grandes del directorio TEMP.",
    difficulty: 1, xp: 20,
    starter: "# Lista los 5 archivos más grandes de $env:TEMP\n",
    validate: `$out = __OUTPUT__; if ($out -match '\\d' -and $out.Split(\"\\n\").Count -ge 2) { "OK" } else { "FAIL:El script debe producir una lista de archivos con tamaños" }`,
    hint: "Get-ChildItem $env:TEMP -File | Sort Length -Descending | Select -First 5 Name, @{N='MB';E={[math]::Round($_.Length/1MB,2)}}",
  },
  {
    id: "forja-02", cat: "powershell", title: "Servicios activos a CSV",
    desc: "Exporta los servicios en estado 'Running' a un CSV con Name y DisplayName.",
    difficulty: 1, xp: 20,
    starter: "# Exporta servicios Running a CSV\n",
    validate: `$out = __OUTPUT__; if ($out -match 'Name' -or $out -match 'Running' -or $out -match ',') { "OK" } else { "FAIL:El output debe contener datos CSV con nombres de servicios" }`,
    hint: "Get-Service | Where Status -eq Running | Select Name, DisplayName | ConvertTo-Csv -NoTypeInformation",
  },
  {
    id: "forja-03", cat: "filesystem", title: "Contador de extensiones",
    desc: "Cuenta cuántos archivos hay por extensión en el directorio actual.",
    difficulty: 2, xp: 30,
    starter: "# Cuenta archivos agrupados por extensión\n",
    validate: `$out = __OUTPUT__; if ($out -match '\\.' -and $out.Split(\"\\n\").Count -ge 1) { "OK" } else { "FAIL:El output debe mostrar extensiones con sus conteos" }`,
    hint: "Get-ChildItem -File | Group-Object Extension | Sort Count -Descending | Select Count, Name",
  },
  {
    id: "forja-04", cat: "networking", title: "Puertos en escucha",
    desc: "Muestra los puertos TCP en estado Listen con el proceso asociado.",
    difficulty: 2, xp: 30,
    starter: "# Muestra puertos TCP Listen con nombre del proceso\n",
    validate: `$out = __OUTPUT__; if ($out -match '\\d+' -and ($out -match 'Listen' -or $out -match 'LocalPort' -or $out -match 'Process')) { "OK" } else { "FAIL:Debe mostrar puertos con proceso asociado" }`,
    hint: "Get-NetTCPConnection -State Listen | Select LocalPort, OwningProcess, @{N='Process';E={(Get-Process -Id $_.OwningProcess -EA 0).ProcessName}} | Sort LocalPort -Unique",
  },
  {
    id: "forja-05", cat: "git", title: "Resumen de commits",
    desc: "Muestra los últimos 10 commits con fecha, autor y mensaje en una línea.",
    difficulty: 1, xp: 20,
    starter: "# Últimos 10 commits: fecha + autor + mensaje\n",
    validate: `$out = __OUTPUT__; if ($out -and $out.Split(\"\\n\").Count -ge 1) { "OK" } else { "FAIL:Debe mostrar commits con formato" }`,
    hint: "git log --oneline --format='%h %ad %an: %s' --date=short -10",
  },
  {
    id: "forja-06", cat: "powershell", title: "Monitor de RAM",
    desc: "Muestra la RAM total, usada y libre del sistema en GB.",
    difficulty: 2, xp: 25,
    starter: "# Muestra RAM: total, usada, libre (en GB)\n",
    validate: `$out = __OUTPUT__; if ($out -match 'GB' -or $out -match '\\d+\\.\\d+') { "OK" } else { "FAIL:Debe mostrar valores de RAM en GB" }`,
    hint: "$os = Get-CimInstance Win32_OperatingSystem; $total = [math]::Round($os.TotalVisibleMemorySize/1MB,2); $free = [math]::Round($os.FreePhysicalMemory/1MB,2); \"Total: ${total}GB | Libre: ${free}GB | Usada: $([math]::Round($total-$free,2))GB\"",
  },
];

function loadForja() {
  try { return JSON.parse(localStorage.getItem(FORJA_KEY) || "null") || { completed: [], solutions: {} }; }
  catch { return { completed: [], solutions: {} }; }
}
function saveForja(f) { localStorage.setItem(FORJA_KEY, JSON.stringify(f)); }

const MODES = ["quiz", "tatami", "forja", "rosetta", "progress"];

function DojoPanel() {
  const [progress, setProgress] = useState(loadProgress);
  const [mode, setMode] = useState("quiz");
  const [currentQ, setCurrentQ] = useState(null);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [catFilter, setCatFilter] = useState(null);

  const [tatami, setTatami] = useState(loadTatami);
  const [tatamiMission, setTatamiMission] = useState(null);
  const [tatamiStep, setTatamiStep] = useState(0);
  const [validating, setValidating] = useState(false);
  const [stepResult, setStepResult] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [missionCatFilter, setMissionCatFilter] = useState(null);

  const [forja, setForja] = useState(loadForja);
  const [forjaChallenge, setForjaChallenge] = useState(null);
  const [forjaCode, setForjaCode] = useState("");
  const [forjaRunning, setForjaRunning] = useState(false);
  const [forjaOutput, setForjaOutput] = useState(null);
  const [forjaResult, setForjaResult] = useState(null);
  const [forjaShowHint, setForjaShowHint] = useState(false);

  useEffect(() => { saveProgress(progress); }, [progress]);
  useEffect(() => { saveTatami(tatami); }, [tatami]);
  useEffect(() => { saveForja(forja); }, [forja]);

  useEffect(() => {
    const handler = (e) => {
      const m = e.detail;
      if (MODES.includes(m)) setMode(m);
    };
    window.addEventListener("nw-dojo-mode", handler);
    return () => window.removeEventListener("nw-dojo-mode", handler);
  }, []);

  const pickQuestion = useCallback(() => {
    const pool = catFilter ? QUIZ_BANK.filter(q => q.cat === catFilter) : QUIZ_BANK;
    const q = pool[Math.floor(Math.random() * pool.length)];
    setCurrentQ(q);
    setSelected(null);
    setRevealed(false);
  }, [catFilter]);

  useEffect(() => { if (mode === "quiz" && !currentQ) pickQuestion(); }, [mode, currentQ, pickQuestion]);

  const handleAnswer = (idx) => {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
    const correct = idx === currentQ.answer;
    const today = new Date().toISOString().slice(0, 10);

    setProgress(prev => {
      const streak = prev.lastDay === today ? prev.streak :
        (prev.lastDay === new Date(Date.now() - 86400000).toISOString().slice(0, 10) ? prev.streak + 1 : 1);
      const xpGain = correct ? 10 + Math.floor(streak * 2) : 0;
      const newXp = prev.xp + xpGain;
      const newLevel = Math.floor(newXp / 100) + 1;
      return {
        ...prev,
        level: newLevel,
        xp: newXp,
        streak,
        lastDay: today,
        totalCorrect: prev.totalCorrect + (correct ? 1 : 0),
        totalWrong: prev.totalWrong + (correct ? 0 : 1),
        history: [...prev.history, { cat: currentQ.cat, correct, date: today }].slice(-200),
      };
    });
  };

  const startMission = useCallback((mission) => {
    setTatamiMission(mission);
    setTatamiStep(0);
    setStepResult(null);
    setShowHint(false);
    setTatami(prev => ({ ...prev, current: mission.id, currentStep: 0 }));
  }, []);

  const validateStep = useCallback(async () => {
    if (!tatamiMission || validating) return;
    const step = tatamiMission.steps[tatamiStep];
    if (!step) return;
    setValidating(true);
    setStepResult(null);
    try {
      const res = await invoke("run_powershell", { command: step.validate });
      const out = (res?.stdout || "").trim();
      if (out === "OK") {
        setStepResult("ok");
        if (tatamiStep + 1 >= tatamiMission.steps.length) {
          const today = new Date().toISOString().slice(0, 10);
          setTatami(prev => ({
            ...prev,
            completed: prev.completed.includes(tatamiMission.id)
              ? prev.completed
              : [...prev.completed, tatamiMission.id],
            current: null, currentStep: 0,
          }));
          setProgress(prev => {
            const streak = prev.lastDay === today ? prev.streak :
              (prev.lastDay === new Date(Date.now() - 86400000).toISOString().slice(0, 10) ? prev.streak + 1 : 1);
            const newXp = prev.xp + tatamiMission.xp;
            return { ...prev, level: Math.floor(newXp / 100) + 1, xp: newXp, streak, lastDay: today };
          });
        }
      } else if (out.startsWith("SKIP:")) {
        setStepResult("skip:" + out.slice(5));
      } else {
        setStepResult("fail");
      }
    } catch {
      setStepResult("fail");
    }
    setValidating(false);
  }, [tatamiMission, tatamiStep, validating]);

  const advanceStep = useCallback(() => {
    if (!tatamiMission) return;
    const next = tatamiStep + 1;
    if (next < tatamiMission.steps.length) {
      setTatamiStep(next);
      setStepResult(null);
      setShowHint(false);
      setTatami(prev => ({ ...prev, currentStep: next }));
    } else {
      setTatamiMission(null);
      setTatamiStep(0);
      setStepResult(null);
    }
  }, [tatamiMission, tatamiStep]);

  const skipStep = useCallback(() => {
    advanceStep();
  }, [advanceStep]);

  const abandonMission = useCallback(() => {
    setTatamiMission(null);
    setTatamiStep(0);
    setStepResult(null);
    setShowHint(false);
    setTatami(prev => ({ ...prev, current: null, currentStep: 0 }));
  }, []);

  const startForjaChallenge = useCallback((ch) => {
    setForjaChallenge(ch);
    setForjaCode(forja.solutions[ch.id] || ch.starter);
    setForjaOutput(null);
    setForjaResult(null);
    setForjaShowHint(false);
  }, [forja]);

  const runForjaCode = useCallback(async () => {
    if (!forjaChallenge || forjaRunning) return;
    setForjaRunning(true);
    setForjaOutput(null);
    setForjaResult(null);
    try {
      const res = await invoke("run_powershell", { command: forjaCode });
      const stdout = (res?.stdout || "").trim();
      const stderr = (res?.stderr || "").trim();
      setForjaOutput(stdout || stderr || "(sin output)");

      const validateCmd = forjaChallenge.validate.replace("__OUTPUT__", `'${stdout.replace(/'/g, "''")}'`);
      const valRes = await invoke("run_powershell", { command: validateCmd });
      const valOut = (valRes?.stdout || "").trim();

      if (valOut === "OK") {
        setForjaResult("ok");
        const today = new Date().toISOString().slice(0, 10);
        setForja(prev => ({
          ...prev,
          completed: prev.completed.includes(forjaChallenge.id) ? prev.completed : [...prev.completed, forjaChallenge.id],
          solutions: { ...prev.solutions, [forjaChallenge.id]: forjaCode },
        }));
        if (!forja.completed.includes(forjaChallenge.id)) {
          setProgress(prev => {
            const streak = prev.lastDay === today ? prev.streak :
              (prev.lastDay === new Date(Date.now() - 86400000).toISOString().slice(0, 10) ? prev.streak + 1 : 1);
            const newXp = prev.xp + forjaChallenge.xp;
            return { ...prev, level: Math.floor(newXp / 100) + 1, xp: newXp, streak, lastDay: today };
          });
        }
      } else if (valOut.startsWith("FAIL:")) {
        setForjaResult("fail:" + valOut.slice(5));
      } else {
        setForjaResult("fail");
      }
    } catch {
      setForjaOutput("Error al ejecutar el script");
      setForjaResult("fail");
    }
    setForjaRunning(false);
  }, [forjaChallenge, forjaCode, forjaRunning, forja]);

  const missionCats = [...new Set(MISSIONS_BANK.map(m => m.cat))];
  const filteredMissions = missionCatFilter
    ? MISSIONS_BANK.filter(m => m.cat === missionCatFilter)
    : MISSIONS_BANK;

  const xpForLevel = (progress.level - 1) * 100;
  const xpInLevel = progress.xp - xpForLevel;
  const xpPercent = Math.min(100, (xpInLevel / 100) * 100);

  const cats = [...new Set(QUIZ_BANK.map(q => q.cat))];
  const accuracy = progress.totalCorrect + progress.totalWrong > 0
    ? Math.round((progress.totalCorrect / (progress.totalCorrect + progress.totalWrong)) * 100)
    : 0;

  return (
    <div style={{
      flex: 1, overflow: "hidden", display: "flex", flexDirection: "column",
      background: "#050500", fontFamily: "var(--font-mono)",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px", borderBottom: `1px solid ${M}33`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: M, fontSize: "14px" }}>⛩</span>
          <span style={{ color: Y, fontSize: "12px", letterSpacing: "0.15em" }}>NETWATCH DOJO</span>
          <span style={{ color: DIM, fontSize: "10px" }}>Lv.{progress.level}</span>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {MODES.map(m => (
            <button key={m} onClick={() => { setMode(m); if (m === "quiz") setCurrentQ(null); }}
              style={{
                background: mode === m ? `${M}33` : "transparent",
                border: `1px solid ${mode === m ? M : "#1a1a1a"}`,
                color: mode === m ? M : "#444",
                fontFamily: "var(--font-mono)", fontSize: "9px",
                padding: "3px 10px", cursor: "pointer",
                textTransform: "uppercase", letterSpacing: "0.08em",
              }}
            >{m}</button>
          ))}
        </div>
      </div>

      {/* XP bar */}
      <div style={{ padding: "6px 16px", display: "flex", gap: "8px", alignItems: "center" }}>
        <span style={{ color: Y, fontSize: "9px" }}>XP {progress.xp}</span>
        <div style={{ flex: 1, height: 4, background: "#1a1a00", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${xpPercent}%`, background: G, transition: "width 0.3s" }}/>
        </div>
        <span style={{ color: DIM, fontSize: "9px" }}>🔥{progress.streak}d</span>
        <span style={{ color: DIM, fontSize: "9px" }}>{accuracy}%</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {mode === "quiz" && currentQ && (
          <div>
            {/* Category filters */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "16px", flexWrap: "wrap" }}>
              <button onClick={() => { setCatFilter(null); setCurrentQ(null); }}
                style={{ background: !catFilter ? "#1a1a00" : "transparent", border: `1px solid ${!catFilter ? Y + "55" : "#111"}`, color: !catFilter ? Y : "#333", fontFamily: "var(--font-mono)", fontSize: "8px", padding: "2px 8px", cursor: "pointer" }}
              >ALL</button>
              {cats.map(cat => (
                <button key={cat} onClick={() => { setCatFilter(cat); setCurrentQ(null); }}
                  style={{ background: catFilter === cat ? `${CAT_COLORS[cat]}18` : "transparent", border: `1px solid ${catFilter === cat ? CAT_COLORS[cat] + "55" : "#111"}`, color: catFilter === cat ? CAT_COLORS[cat] : "#333", fontFamily: "var(--font-mono)", fontSize: "8px", padding: "2px 8px", cursor: "pointer", textTransform: "uppercase" }}
                >{cat}</button>
              ))}
            </div>

            {/* Question */}
            <div style={{ marginBottom: "16px" }}>
              <span style={{ color: CAT_COLORS[currentQ.cat] || W, fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {currentQ.cat}
              </span>
              <div style={{ color: W, fontSize: "13px", marginTop: "8px", lineHeight: "20px" }}>
                {currentQ.q}
              </div>
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
              {currentQ.options.map((opt, i) => {
                let bg = "transparent";
                let borderColor = "#1a1a1a";
                let color = "#888";
                if (revealed) {
                  if (i === currentQ.answer) { bg = `${G}18`; borderColor = G; color = G; }
                  else if (i === selected && i !== currentQ.answer) { bg = `${R}18`; borderColor = R; color = R; }
                } else if (i === selected) {
                  borderColor = Y; color = Y;
                }
                return (
                  <button key={i} onClick={() => handleAnswer(i)}
                    style={{
                      background: bg, border: `1px solid ${borderColor}`,
                      color, fontFamily: "var(--font-mono)", fontSize: "12px",
                      padding: "8px 14px", cursor: revealed ? "default" : "pointer",
                      textAlign: "left", transition: "all 0.15s",
                    }}
                  >
                    <span style={{ color: Y, marginRight: "8px", fontSize: "10px" }}>{String.fromCharCode(65 + i)}</span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Result + Next */}
            {revealed && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ color: selected === currentQ.answer ? G : R, fontSize: "12px" }}>
                  {selected === currentQ.answer ? "✓ Correcto! +10 XP" : `✗ Incorrecto — ${currentQ.options[currentQ.answer]}`}
                </span>
                <button onClick={pickQuestion}
                  style={{ background: "transparent", border: `1px solid ${Y}`, color: Y, fontFamily: "var(--font-mono)", fontSize: "10px", padding: "4px 14px", cursor: "pointer", marginLeft: "auto" }}
                >NEXT ▸</button>
              </div>
            )}
          </div>
        )}

        {mode === "tatami" && !tatamiMission && (
          <div>
            <div style={{ color: Y, fontSize: "11px", marginBottom: "8px", letterSpacing: "0.1em" }}>
              TATAMI — Misiones guiadas
            </div>
            <div style={{ color: DIM, fontSize: "9px", marginBottom: "12px" }}>
              Ejecuta los pasos en tu terminal y valida cada uno. Gana XP al completar misiones.
            </div>

            {/* Mission category filter */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "14px", flexWrap: "wrap" }}>
              <button onClick={() => setMissionCatFilter(null)}
                style={{ background: !missionCatFilter ? "#1a1a00" : "transparent", border: `1px solid ${!missionCatFilter ? Y + "55" : "#111"}`, color: !missionCatFilter ? Y : "#444", fontFamily: "var(--font-mono)", fontSize: "8px", padding: "2px 8px", cursor: "pointer" }}
              >ALL</button>
              {missionCats.map(cat => (
                <button key={cat} onClick={() => setMissionCatFilter(cat)}
                  style={{ background: missionCatFilter === cat ? `${MISSION_CAT_COLORS[cat] || W}18` : "transparent", border: `1px solid ${missionCatFilter === cat ? (MISSION_CAT_COLORS[cat] || W) + "55" : "#111"}`, color: missionCatFilter === cat ? (MISSION_CAT_COLORS[cat] || W) : "#444", fontFamily: "var(--font-mono)", fontSize: "8px", padding: "2px 8px", cursor: "pointer", textTransform: "uppercase" }}
                >{cat}</button>
              ))}
            </div>

            {/* Mission list */}
            {filteredMissions.map(mission => {
              const done = tatami.completed.includes(mission.id);
              const color = MISSION_CAT_COLORS[mission.cat] || W;
              return (
                <div key={mission.id}
                  onClick={() => { if (!done) startMission(mission); }}
                  style={{
                    padding: "10px 12px", marginBottom: "6px",
                    border: `1px solid ${done ? G + "33" : color + "22"}`,
                    background: done ? `${G}08` : "#0a0a00",
                    cursor: done ? "default" : "pointer",
                    transition: "border-color 0.15s",
                  }}
                  onMouseOver={e => { if (!done) e.currentTarget.style.borderColor = color + "66"; }}
                  onMouseOut={e => { if (!done) e.currentTarget.style.borderColor = color + "22"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: done ? G : color, fontSize: "10px" }}>{done ? "✓" : "○"}</span>
                      <span style={{ color: done ? G + "88" : W, fontSize: "11px" }}>{mission.title}</span>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{ color: DIM, fontSize: "8px" }}>
                        {"★".repeat(mission.difficulty)}{"☆".repeat(3 - mission.difficulty)}
                      </span>
                      <span style={{ color: Y + "88", fontSize: "8px" }}>+{mission.xp}xp</span>
                    </div>
                  </div>
                  <div style={{ color: DIM, fontSize: "9px", marginLeft: "18px" }}>{mission.desc}</div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "4px", marginLeft: "18px" }}>
                    <span style={{ color: color + "66", fontSize: "8px", textTransform: "uppercase" }}>{mission.cat}</span>
                    <span style={{ color: DIM, fontSize: "8px" }}>{mission.steps.length} pasos</span>
                  </div>
                </div>
              );
            })}

            {/* Completed count */}
            <div style={{ marginTop: "12px", color: DIM, fontSize: "9px", textAlign: "center" }}>
              {tatami.completed.length}/{MISSIONS_BANK.length} misiones completadas
            </div>
          </div>
        )}

        {mode === "tatami" && tatamiMission && (
          <div>
            {/* Mission header */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: MISSION_CAT_COLORS[tatamiMission.cat] || W, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {tatamiMission.cat}
                </span>
                <button onClick={abandonMission}
                  style={{ background: "transparent", border: `1px solid ${R}33`, color: R + "88", fontFamily: "var(--font-mono)", fontSize: "8px", padding: "2px 8px", cursor: "pointer" }}
                >ABANDONAR</button>
              </div>
              <div style={{ color: W, fontSize: "13px", marginTop: "6px" }}>{tatamiMission.title}</div>
              <div style={{ color: DIM, fontSize: "9px", marginTop: "4px" }}>{tatamiMission.desc}</div>
            </div>

            {/* Step progress bar */}
            <div style={{ display: "flex", gap: "3px", marginBottom: "16px" }}>
              {tatamiMission.steps.map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 4,
                  background: i < tatamiStep ? G : i === tatamiStep ? Y : "#1a1a00",
                  transition: "background 0.3s",
                  borderRadius: 1,
                }}/>
              ))}
            </div>

            {/* Current step */}
            <div style={{
              padding: "14px", border: `1px solid ${Y}22`,
              background: "#0a0a00", marginBottom: "12px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ color: Y, fontSize: "9px" }}>PASO {tatamiStep + 1}/{tatamiMission.steps.length}</span>
                <span style={{ color: DIM, fontSize: "8px" }}>+{tatamiMission.xp}xp al completar</span>
              </div>
              <div style={{ color: W, fontSize: "12px", lineHeight: "18px", marginBottom: "14px" }}>
                {tatamiMission.steps[tatamiStep].instruction}
              </div>

              {/* Hint toggle */}
              <div style={{ marginBottom: "12px" }}>
                <button onClick={() => setShowHint(!showHint)}
                  style={{ background: "transparent", border: `1px solid #1a1a1a`, color: showHint ? Y : "#444", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "3px 10px", cursor: "pointer" }}
                >{showHint ? "▾ OCULTAR PISTA" : "▸ MOSTRAR PISTA"}</button>
                {showHint && (
                  <div style={{
                    marginTop: "8px", padding: "8px 10px",
                    background: "#111", border: `1px solid ${Y}18`,
                    fontFamily: "var(--font-mono)", fontSize: "10px", color: Y + "cc",
                    wordBreak: "break-all", userSelect: "all",
                  }}>
                    {tatamiMission.steps[tatamiStep].hint}
                  </div>
                )}
              </div>

              {/* Validate button */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button onClick={validateStep} disabled={validating}
                  style={{
                    background: validating ? "#1a1a00" : `${G}18`,
                    border: `1px solid ${G}55`,
                    color: validating ? DIM : G,
                    fontFamily: "var(--font-mono)", fontSize: "10px",
                    padding: "6px 16px", cursor: validating ? "wait" : "pointer",
                  }}
                >{validating ? "VALIDANDO..." : "▸ VALIDAR PASO"}</button>

                {stepResult === "ok" && tatamiStep + 1 < tatamiMission.steps.length && (
                  <button onClick={advanceStep}
                    style={{ background: "transparent", border: `1px solid ${Y}`, color: Y, fontFamily: "var(--font-mono)", fontSize: "10px", padding: "6px 14px", cursor: "pointer" }}
                  >SIGUIENTE ▸</button>
                )}
                {stepResult === "ok" && tatamiStep + 1 >= tatamiMission.steps.length && (
                  <button onClick={abandonMission}
                    style={{ background: `${G}18`, border: `1px solid ${G}`, color: G, fontFamily: "var(--font-mono)", fontSize: "10px", padding: "6px 14px", cursor: "pointer" }}
                  >MISIÓN COMPLETADA ✓</button>
                )}
              </div>

              {/* Step result feedback */}
              {stepResult && (
                <div style={{ marginTop: "10px", fontSize: "11px" }}>
                  {stepResult === "ok" && (
                    <span style={{ color: G }}>✓ Paso validado correctamente</span>
                  )}
                  {stepResult === "fail" && (
                    <span style={{ color: R }}>✗ No se cumple la condición — ejecuta el comando y vuelve a validar</span>
                  )}
                  {typeof stepResult === "string" && stepResult.startsWith("skip:") && (
                    <div>
                      <span style={{ color: "#ff8800" }}>⚠ {stepResult.slice(5)}</span>
                      <button onClick={skipStep}
                        style={{ marginLeft: "8px", background: "transparent", border: `1px solid #ff880044`, color: "#ff8800", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "2px 10px", cursor: "pointer" }}
                      >SALTAR</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {mode === "forja" && !forjaChallenge && (
          <div>
            <div style={{ color: Y, fontSize: "11px", marginBottom: "8px", letterSpacing: "0.1em" }}>
              FORJA — Escribe scripts desde cero
            </div>
            <div style={{ color: DIM, fontSize: "9px", marginBottom: "12px" }}>
              Escribe el script completo, ejecútalo y valida que el resultado es correcto.
            </div>

            {FORJA_CHALLENGES.map(ch => {
              const done = forja.completed.includes(ch.id);
              const color = MISSION_CAT_COLORS[ch.cat] || W;
              return (
                <div key={ch.id}
                  onClick={() => startForjaChallenge(ch)}
                  style={{
                    padding: "10px 12px", marginBottom: "6px",
                    border: `1px solid ${done ? G + "33" : color + "22"}`,
                    background: done ? `${G}08` : "#0a0a00",
                    cursor: "pointer", transition: "border-color 0.15s",
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = color + "66"}
                  onMouseOut={e => e.currentTarget.style.borderColor = done ? G + "33" : color + "22"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ color: done ? G : color, fontSize: "10px" }}>{done ? "✓" : "⚒"}</span>
                      <span style={{ color: done ? G + "88" : W, fontSize: "11px" }}>{ch.title}</span>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{ color: DIM, fontSize: "8px" }}>{"★".repeat(ch.difficulty)}{"☆".repeat(3 - ch.difficulty)}</span>
                      <span style={{ color: Y + "88", fontSize: "8px" }}>+{ch.xp}xp</span>
                    </div>
                  </div>
                  <div style={{ color: DIM, fontSize: "9px", marginLeft: "18px" }}>{ch.desc}</div>
                </div>
              );
            })}

            <div style={{ marginTop: "12px", color: DIM, fontSize: "9px", textAlign: "center" }}>
              {forja.completed.length}/{FORJA_CHALLENGES.length} retos completados
            </div>
          </div>
        )}

        {mode === "forja" && forjaChallenge && (
          <div>
            {/* Challenge header */}
            <div style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: MISSION_CAT_COLORS[forjaChallenge.cat] || W, fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {forjaChallenge.cat} · ⚒ FORJA
                </span>
                <button onClick={() => { setForja(prev => ({ ...prev, solutions: { ...prev.solutions, [forjaChallenge.id]: forjaCode } })); setForjaChallenge(null); }}
                  style={{ background: "transparent", border: `1px solid ${R}33`, color: R + "88", fontFamily: "var(--font-mono)", fontSize: "8px", padding: "2px 8px", cursor: "pointer" }}
                >SALIR</button>
              </div>
              <div style={{ color: W, fontSize: "13px", marginTop: "6px" }}>{forjaChallenge.title}</div>
              <div style={{ color: DIM, fontSize: "10px", marginTop: "4px", lineHeight: "16px" }}>{forjaChallenge.desc}</div>
            </div>

            {/* Code editor */}
            <textarea
              value={forjaCode}
              onChange={e => setForjaCode(e.target.value)}
              spellCheck={false}
              style={{
                width: "100%", minHeight: "120px", maxHeight: "200px",
                background: "#0a0a00", border: `1px solid ${Y}22`,
                color: Y, fontFamily: "var(--font-mono)", fontSize: "11px",
                padding: "10px", resize: "vertical", outline: "none",
                lineHeight: "18px", tabSize: 2,
              }}
              onKeyDown={e => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const start = e.target.selectionStart;
                  const end = e.target.selectionEnd;
                  setForjaCode(forjaCode.substring(0, start) + "  " + forjaCode.substring(end));
                  setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = start + 2; }, 0);
                }
              }}
            />

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px", marginTop: "10px", alignItems: "center" }}>
              <button onClick={runForjaCode} disabled={forjaRunning}
                style={{
                  background: forjaRunning ? "#1a1a00" : `${G}18`,
                  border: `1px solid ${G}55`, color: forjaRunning ? DIM : G,
                  fontFamily: "var(--font-mono)", fontSize: "10px",
                  padding: "6px 16px", cursor: forjaRunning ? "wait" : "pointer",
                }}
              >{forjaRunning ? "EJECUTANDO..." : "▸ EJECUTAR Y VALIDAR"}</button>
              <button onClick={() => setForjaShowHint(!forjaShowHint)}
                style={{ background: "transparent", border: `1px solid #1a1a1a`, color: forjaShowHint ? Y : "#555", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "4px 10px", cursor: "pointer" }}
              >{forjaShowHint ? "▾ PISTA" : "▸ PISTA"}</button>
            </div>

            {/* Hint */}
            {forjaShowHint && (
              <div style={{
                marginTop: "8px", padding: "8px 10px",
                background: "#111", border: `1px solid ${Y}18`,
                fontFamily: "var(--font-mono)", fontSize: "10px", color: Y + "cc",
                wordBreak: "break-all", userSelect: "all", whiteSpace: "pre-wrap",
              }}>
                {forjaChallenge.hint}
              </div>
            )}

            {/* Output */}
            {forjaOutput && (
              <div style={{ marginTop: "10px" }}>
                <div style={{ color: DIM, fontSize: "9px", marginBottom: "4px" }}>OUTPUT</div>
                <div style={{
                  padding: "8px 10px", background: "#050500",
                  border: `1px solid ${forjaResult === "ok" ? G + "33" : "#1a1a1a"}`,
                  fontFamily: "var(--font-mono)", fontSize: "10px",
                  color: "#ccc", maxHeight: "150px", overflowY: "auto",
                  whiteSpace: "pre-wrap", wordBreak: "break-all",
                }}>
                  {forjaOutput}
                </div>
              </div>
            )}

            {/* Result */}
            {forjaResult && (
              <div style={{ marginTop: "8px", fontSize: "11px" }}>
                {forjaResult === "ok" && (
                  <span style={{ color: G }}>✓ Script validado — +{forjaChallenge.xp} XP</span>
                )}
                {forjaResult === "fail" && (
                  <span style={{ color: R }}>✗ El output no cumple los requisitos — revisa tu script</span>
                )}
                {typeof forjaResult === "string" && forjaResult.startsWith("fail:") && (
                  <span style={{ color: R }}>✗ {forjaResult.slice(5)}</span>
                )}
              </div>
            )}
          </div>
        )}

        {mode === "rosetta" && (
          <div>
            <div style={{ color: Y, fontSize: "11px", marginBottom: "12px", letterSpacing: "0.1em" }}>
              ROSETTA — Equivalencias entre shells
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "10px" }}>
                <thead>
                  <tr>
                    {["Acción", "PowerShell", "Bash/Linux", "CMD"].map(h => (
                      <th key={h} style={{ padding: "6px 8px", borderBottom: `1px solid ${M}33`, color: Y, textAlign: "left", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROSETTA.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #111" }}>
                      <td style={{ padding: "5px 8px", color: W }}>{row.action}</td>
                      <td style={{ padding: "5px 8px", color: Y }}>{row.ps}</td>
                      <td style={{ padding: "5px 8px", color: G }}>{row.bash}</td>
                      <td style={{ padding: "5px 8px", color: "#00F0FF" }}>{row.cmd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {mode === "progress" && (
          <div>
            <div style={{ color: Y, fontSize: "11px", marginBottom: "16px", letterSpacing: "0.1em" }}>
              PROGRESO
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
              {[
                { label: "Nivel", value: progress.level, color: Y },
                { label: "XP Total", value: progress.xp, color: G },
                { label: "Racha", value: `${progress.streak} días`, color: "#ff8800" },
                { label: "Precisión", value: `${accuracy}%`, color: M },
                { label: "Correctas", value: progress.totalCorrect, color: G },
                { label: "Incorrectas", value: progress.totalWrong, color: R },
              ].map(stat => (
                <div key={stat.label} style={{
                  padding: "10px", border: `1px solid ${stat.color}22`,
                  background: `${stat.color}08`,
                }}>
                  <div style={{ color: DIM, fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase" }}>{stat.label}</div>
                  <div style={{ color: stat.color, fontSize: "18px", fontWeight: 700, marginTop: "4px" }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Category breakdown */}
            <div style={{ color: Y, fontSize: "10px", marginBottom: "8px" }}>POR CATEGORÍA</div>
            {cats.map(cat => {
              const catHistory = progress.history.filter(h => h.cat === cat);
              const catCorrect = catHistory.filter(h => h.correct).length;
              const catTotal = catHistory.length;
              const catPct = catTotal > 0 ? Math.round((catCorrect / catTotal) * 100) : 0;
              return (
                <div key={cat} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ color: CAT_COLORS[cat], fontSize: "9px", width: "70px", textTransform: "uppercase" }}>{cat}</span>
                  <div style={{ flex: 1, height: 6, background: "#1a1a00", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${catPct}%`, background: CAT_COLORS[cat], transition: "width 0.3s" }}/>
                  </div>
                  <span style={{ color: DIM, fontSize: "9px", width: "40px" }}>{catPct}%</span>
                  <span style={{ color: DIM, fontSize: "9px" }}>{catTotal}q</span>
                </div>
              );
            })}

            {/* Reset */}
            <button onClick={() => { setProgress(defaultProgress()); }}
              style={{
                marginTop: "20px", background: "transparent",
                border: `1px solid ${R}44`, color: R + "88",
                fontFamily: "var(--font-mono)", fontSize: "9px",
                padding: "4px 12px", cursor: "pointer",
              }}
            >RESET PROGRESO</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(DojoPanel);
