const PROJECT_TYPES = [
  {
    id: "node",
    label: "Node.js",
    color: "#39FF14",
    detect: ["package.json"],
    scripts: (data) => {
      try {
        const pkg = JSON.parse(data["package.json"] || "{}");
        return Object.keys(pkg.scripts || {}).slice(0, 8);
      } catch { return []; }
    },
    version: (data) => {
      try {
        const pkg = JSON.parse(data["package.json"] || "{}");
        return pkg.engines?.node || "";
      } catch { return ""; }
    },
    runtime: "node",
  },
  {
    id: "rust",
    label: "Rust/Cargo",
    color: "#ff5555",
    detect: ["Cargo.toml"],
    scripts: () => ["cargo build", "cargo run", "cargo test", "cargo check"],
    version: () => "",
    runtime: "cargo",
  },
  {
    id: "python",
    label: "Python",
    color: "#FCEE0A",
    detect: ["requirements.txt", "setup.py", "pyproject.toml", "Pipfile"],
    scripts: () => ["pip install -r requirements.txt", "python main.py", "pytest"],
    version: () => "",
    runtime: "python",
  },
  {
    id: "docker",
    label: "Docker",
    color: "#00F0FF",
    detect: ["docker-compose.yml", "docker-compose.yaml", "Dockerfile"],
    scripts: () => ["docker-compose up", "docker-compose down", "docker build ."],
    version: () => "",
    runtime: "docker",
  },
  {
    id: "tauri",
    label: "Tauri",
    color: "#D9027D",
    detect: ["src-tauri/tauri.conf.json"],
    scripts: () => ["cargo tauri dev", "cargo tauri build", "npm run dev"],
    version: () => "",
    runtime: "tauri",
  },
  {
    id: "hardhat",
    label: "Hardhat (Web3)",
    color: "#FCEE0A",
    detect: ["hardhat.config.js", "hardhat.config.ts"],
    scripts: () => ["npx hardhat compile", "npx hardhat test", "npx hardhat node"],
    version: () => "",
    runtime: "hardhat",
  },
  {
    id: "next",
    label: "Next.js",
    color: "#E8E8E8",
    detect: ["next.config.js", "next.config.mjs", "next.config.ts"],
    scripts: () => ["npm run dev", "npm run build", "npm run start"],
    version: () => "",
    runtime: "next",
  },
];

export async function detectProjectType(cwd) {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const files = {};

    for (const pType of PROJECT_TYPES) {
      for (const file of pType.detect) {
        const res = await invoke("run_powershell", {
          command: `if (Test-Path "${cwd}\\${file}") { Get-Content "${cwd}\\${file}" -Raw -ErrorAction SilentlyContinue | Select-Object -First 100 } else { Write-Output "__NOTFOUND__" }`
        });
        const content = res?.stdout?.trim();
        if (content && content !== "__NOTFOUND__") {
          files[file] = content;
        }
      }
    }

    const detected = [];
    for (const pType of PROJECT_TYPES) {
      const hasFile = pType.detect.some(f => files[f]);
      if (hasFile) {
        detected.push({
          ...pType,
          scripts: pType.scripts(files),
          version: pType.version(files),
        });
      }
    }

    let gitBranch = "";
    let gitDirty = false;
    const gitRes = await invoke("run_powershell", {
      command: `cd "${cwd}"; $b = git branch --show-current 2>$null; $s = git status --porcelain 2>$null; Write-Output "$b|$(if($s){'dirty'}else{'clean'})"`
    });
    const [branch, status] = (gitRes?.stdout?.trim() || "").split("|");
    if (branch) {
      gitBranch = branch;
      gitDirty = status === "dirty";
    }

    return { types: detected, gitBranch, gitDirty, cwd };
  } catch {
    return { types: [], gitBranch: "", gitDirty: false, cwd };
  }
}
