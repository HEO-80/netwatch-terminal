// custom.js — Comandos personalizados de NETWATCH Terminal
// Estos se ejecutan en el frontend sin pasar por PowerShell

const cy = (hex, text) => {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
};

const Y  = (t) => cy("#FCEE0A", t);  // yellow
const G  = (t) => cy("#39FF14", t);  // green
const M  = (t) => cy("#D9027D", t);  // magenta
const C  = (t) => cy("#00F0FF", t);  // cyan
const W  = (t) => cy("#E8E8E8", t);  // white
const D  = (t) => cy("#666666", t);  // dim
const R  = (t) => cy("#ff5555", t);  // red

export const customCommands = {

  // ── whoami ─────────────────────────────────────────────────────────────────
  whoami: async ({ writeln }) => {
    writeln(Y("╔══════════════════════════════════════╗"));
    writeln(Y("║") + C("  NETWATCH OPERATIVE PROFILE         ") + Y("║"));
    writeln(Y("╚══════════════════════════════════════╝"));
    writeln("");
    writeln(`  ${C("Handle")}   ${D("→")}  ${G("HEO-80")}`);
    writeln(`  ${C("Role")}     ${D("→")}  ${G("Full Stack Dev · DeFi Researcher")}`);
    writeln(`  ${C("Base")}     ${D("→")}  ${G("Zaragoza, España")}`);
    writeln(`  ${C("Shell")}    ${D("→")}  ${G("PowerShell 7.5 Core")}`);
    writeln(`  ${C("OS")}       ${D("→")}  ${G("Windows 11 Home + NETWATCH v2.077")}`);
    writeln("");
    writeln(`  ${C("GitHub")}   ${D("→")}  ${M("https://github.com/HEO-80")}`);
    writeln(`  ${C("LinkedIn")} ${D("→")}  ${M("https://linkedin.com/in/hectorob")}`);
    writeln("");
  },

  // ── projects ───────────────────────────────────────────────────────────────
  projects: async ({ writeln }) => {
    writeln(Y("Repositorios activos:"));
    writeln("");
    const projects = [
      { name: "netwatch-terminal", desc: "App terminal instalable Tauri + React",       status: "🟡 WIP" },
      { name: "codetyper",         desc: "Typing trainer para developers",               status: "🟢 live" },
      { name: "vaultflow",         desc: "Web3 B2B smart contract platform",             status: "🟡 WIP" },
      { name: "powershell-cyberpunk", desc: "Terminal Cyberpunk 2077 para PowerShell",  status: "🟢 live" },
      { name: "devflow-ai",        desc: "PR contributor — Wei/ETH Converter",           status: "🟢 merged" },
    ];
    for (const p of projects) {
      writeln(`  ${M(p.name.padEnd(24))} ${D("·")} ${W(p.desc.padEnd(42))} ${p.status}`);
    }
    writeln("");
    writeln(`  ${D("→ github.com/HEO-80")}`);
  },

  // ── skills ─────────────────────────────────────────────────────────────────
  skills: async ({ writeln }) => {
    writeln(Y("Módulos instalados:"));
    writeln("");
    const sections = [
      {
        name: "Frontend",
        items: ["React", "Next.js", "TypeScript", "Astro", "Tailwind", "GSAP", "React Native"],
      },
      {
        name: "Backend",
        items: ["Node.js", "Spring Boot", "PostgreSQL", "REST API", "Thymeleaf"],
      },
      {
        name: "Blockchain",
        items: ["Solidity", "Hardhat", "Ethers.js", "RainbowKit", "SIWE", "MEV bots (mainnet + BSC)"],
      },
      {
        name: "Desktop / DevOps",
        items: ["Tauri", "Rust (learning)", "PowerShell", "Docker", "Git", "Linux"],
      },
    ];
    for (const s of sections) {
      writeln(`  ${C(s.name)}`);
      writeln(`  ${D("└─")} ${G(s.items.join(", "))}`);
      writeln("");
    }
  },

  // ── contact ────────────────────────────────────────────────────────────────
  contact: async ({ writeln, invoke }) => {
    writeln(Y("Canales de comunicación:"));
    writeln("");
    const channels = [
      { label: "GitHub",   url: "https://github.com/HEO-80",          key: "gh" },
      { label: "LinkedIn", url: "https://linkedin.com/in/hectorob",   key: "li" },
      { label: "Email",    url: "mailto:heo80@example.com",            key: "mail" },
    ];
    for (const ch of channels) {
      writeln(`  ${C(ch.label.padEnd(12))} ${D("→")}  ${M(ch.url)}`);
    }
    writeln("");
    writeln(`  ${D("Tip:")} ${W("Haz clic en cualquier URL para abrir en el navegador.")}`);
  },

  // ── status ─────────────────────────────────────────────────────────────────
  status: async ({ writeln, invoke }) => {
    writeln(Y("Estado del sistema:"));
    writeln("");
    try {
      const info = await invoke("get_system_info");
      writeln(`  ${C("CPU")}     ${D("→")} ${G(info.cpu)}`);
      writeln(`  ${C("RAM")}     ${D("→")} ${G(info.ram)}`);
      writeln(`  ${C("OS")}      ${D("→")} ${G(info.os)}`);
      writeln(`  ${C("User")}    ${D("→")} ${G(info.user)}`);
    } catch {
      writeln(`  ${R("No se pudo obtener info del sistema.")}`);
    }
    writeln("");
    try {
      const docker = await invoke("get_docker_status");
      if (!docker.available) {
        writeln(`  ${C("Docker")}  ${D("→")} ${D("no disponible")}`);
      } else if (docker.containers.length === 0) {
        writeln(`  ${C("Docker")}  ${D("→")} ${W("sin contenedores activos")}`);
      } else {
        writeln(`  ${C("Docker")}  ${D("→")} ${G(docker.containers.length + " contenedores activos")}`);
        for (const c of docker.containers) {
          writeln(`    ${D("·")} ${M(c.name)} ${D("-")} ${G(c.status)}`);
        }
      }
    } catch {
      writeln(`  ${C("Docker")}  ${D("→")} ${R("error al obtener estado")}`);
    }
    writeln("");
  },

  // ── bee — SSH Beelink ──────────────────────────────────────────────────────
  bee: async ({ writeln, invoke }) => {
    writeln(`${Y("Conectando a Beelink...")} ${D("heo@192.168.1.139 -p 38")}`);
    writeln("");
    try {
      await invoke("ssh_beelink", { host: "heo@192.168.1.139", port: 38 });
      writeln(`${G("✓")} Conexión SSH iniciada en nueva ventana.`);
    } catch (e) {
      writeln(`${R("✗")} Error: ${e}`);
    }
  },

  // ── notion / obsidian / gmail — shortcuts rápidos ─────────────────────────
  notion: async ({ invoke, writeln }) => {
    await invoke("open_url", { url: "https://www.notion.so/" });
    writeln(`${G("✓")} Abriendo Notion...`);
  },
  obsidian: async ({ invoke, writeln }) => {
    await invoke("open_url", { url: "obsidian://" });
    writeln(`${G("✓")} Abriendo Obsidian...`);
  },
  gmail: async ({ invoke, writeln }) => {
    await invoke("open_url", { url: "https://mail.google.com" });
    writeln(`${G("✓")} Abriendo Gmail...`);
  },
  vsc: async ({ invoke, writeln }) => {
    await invoke("open_vscode", { path: null });
    writeln(`${G("✓")} Abriendo VS Code...`);
  },
};
