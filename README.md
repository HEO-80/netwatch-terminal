# NETWATCH OS v2.077

> Cyberpunk terminal environment for developers — built with Tauri, React and Rust.

AI-powered · Real-time metrics · Multi-shell · Crypto dashboard · MEV bot monitoring

[![LinkedIn](https://img.shields.io/badge/LinkedIn-HEO--80-D9027D?style=flat-square&logo=linkedin)](https://linkedin.com/in/hectorob)
[![GitHub](https://img.shields.io/badge/GitHub-HEO--80-39FF14?style=flat-square&logo=github)](https://github.com/HEO-80)

---

![NETWATCH Terminal — Dashboard](frontend/img/Netwatch-terminal1.png)

![NETWATCH Terminal — AI Panel + Metrics](frontend/img/Netwatch-terminal2.png)

![NETWATCH Terminal — INFRA + CRYPTO panels](frontend/img/Netwatch-terminal3.png)

---

## 🖥️ What is NETWATCH?

NETWATCH is a fully custom terminal environment built as a native Windows app. It replaces the default terminal with a cyberpunk-themed workspace that integrates AI assistants, real-time system metrics, crypto prices, infrastructure monitoring and MEV bot status — all in a single interface with keyboard-driven navigation.

No Electron. No browser tab. A native Tauri app with a Rust PTY server running real shells.

---

## ⚡ Architecture

```
Tauri (Rust backend)
  ├── PTY Server       ws://127.0.0.1:7777   — real shell processes via WebSocket
  └── invoke()         run_powershell         — system metrics via WMI queries

React (frontend)
  ├── App.jsx                  — layout, global state, keyboard shortcuts
  ├── TitleBar                 — top bar with title and controls
  ├── AIPanel                  — collapsible AI panel (top of center column)
  ├── MetricsPanel             — collapsible system metrics (above tab bar)
  ├── InfraPanel               — left sidebar (SSH, ports, K8s, Terraform, GitHub)
  ├── SidePanel                — right sidebar (Crypto, Gas, Docker, MEV Bots)
  ├── Dashboard                — home screen with system info and shortcuts
  └── Terminal                 — xterm.js instances connected to PTY server
```

---

## 🎛️ Panels & Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+A` | Toggle AI panel |
| `Alt+M` | Toggle Metrics panel |
| `Alt+I` | Toggle INFRA panel (left) |
| `Alt+P` | Toggle CRYPTO panel (right) |
| `Alt+T` | New PowerShell tab |
| `Alt+W` | Close active tab |
| `Alt+D` | Go to Dashboard |
| `Alt+1–9` | Jump to tab by number |

---

## 🤖 AI Panel

Three providers, one interface.

| Provider | Type | Requirements |
|----------|------|-------------|
| **Ollama** | Local | Ollama installed — no API key, no internet |
| **Gemini CLI** | Cloud | `GEMINI_API_KEY` in localStorage |
| **Claude API** | Cloud | `ANTHROPIC_API_KEY` in localStorage |

**Features:**
- Background provider detection on app start — no delay when opening the panel
- Ollama warm-up on launch — model loaded into VRAM before first use
- Dynamic model selector — reads installed models via Ollama `/api/tags`
- Persistent conversation history in localStorage (up to 50 messages)
- Real-time streaming with blinking cursor
- Token counter (~1 token ≈ 4 chars)
- `Esc` or `◼ stop` to interrupt generation

**Quick commands with specialized system prompts:**

| Command | System prompt focus | Use case |
|---------|-------------------|----------|
| `/code` | Senior dev, clean code output | Review or write code |
| `/git` | Git expert, exact command first | Git flows and commands |
| `/sol` | Smart contract auditor, MEV & DeFi context | Solidity and contracts |
| `/explain` | Technical and concise, senior level | Explain concepts or errors |

---

## 📊 Metrics Panel

Live system data refreshed every 3 seconds via Tauri `invoke("run_powershell")`.

| Section | Data |
|---------|------|
| **CPU** | Usage % + 50-point sparkline |
| **Memory** | Usage % + GB used/total + sparkline |
| **Disk** | All drives auto-detected, 2-column layout, usage bar per partition |
| **Network** | RX/TX in KB/s or MB/s + traffic sparkline |

Color alerting: green → yellow (>75%) → red (>90%)

Header shows `user@hostname` detected dynamically via `$env:USERNAME` and `$env:COMPUTERNAME`. Falls back to animated mock data when Tauri invoke is unavailable.

---

## 🔧 INFRA Panel (left sidebar)

- **SSH Servers** — online/offline status of configured servers
- **Active Ports** — list of ports in use with labels (Vite dev, PTY server, etc.)
- **Kubernetes** — kubectl status
- **Terraform** — `.tfstate` file detection
- **GitHub** — latest commits from the current repository

---

## 💹 CRYPTO / NETWATCH Panel (right sidebar)

- **BTC & ETH** — live prices + 24h change
- **Gas (Gwei)** — slow / standard / fast
- **Docker** — active containers
- **MEV Bots** — online/offline status per bot and chain:
  - MEV-ETH-Main · Ethereum Mainnet
  - MEV-BSC-Flash · BSC
  - MEV-ARB-Snipe · Arbitrum

---

## 💻 Terminal

**Supported shells:**

| Shell | Color | Binary |
|-------|-------|--------|
| PowerShell | Yellow `#FCEE0A` | `pwsh.exe` |
| WSL/bash | Green `#39FF14` | `wsl.exe` |
| CMD | Cyan `#00F0FF` | `cmd.exe` |

**xterm.js features:**
- Full NETWATCH color theme (each ANSI color has a fixed semantic meaning)
- JetBrainsMono Nerd Font with icons
- Auto-reconnect to PTY server (up to 5 retries)
- Multiple simultaneous tabs
- Auto-resize on window change

**Custom `nw` commands:**
- `nw help` — list all available commands
- `nw ai` — quick access to the AI panel from the terminal

**PowerShell profile (Cyberpunk2077 theme):**
- Custom prompt with NETWATCH colors
- `z` — fast directory jumping (zoxide)
- `fzf` — interactive file search (`Ctrl+T`) and history (`Ctrl+R`)
- Autocompletion with gray suggestions (right arrow to accept)
- `help-ps` — list all aliases and commands

---

## 🎨 Design System

One color, one meaning. Always.

| Color | Hex | Meaning |
|-------|-----|---------|
| Yellow | `#FCEE0A` | NETWATCH identity, titles, max highlights |
| Green | `#39FF14` | Success, bash/Linux, confirmations, AI |
| Cyan | `#00F0FF` | Paths, info, CMD, CRYPTO panel |
| Magenta | `#D9027D` | Git, actions, PS shell, decorative corners |
| Red | `#ff5555` | Errors only |
| White | `#E8E8E8` | Base text |
| Gray | `#546E7A` | Dim text, hints |
| BG | `#080700` | Main background |

**Effects:** CSS scanlines · Magenta corner marks · Glitch hover on titles · 3px custom scrollbar · Blink animations for cursors and loading states

---

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Node.js 18+, Rust, Tauri CLI
npm install -g @tauri-apps/cli

# Optional: Ollama for local AI
winget install Ollama.Ollama
```

### 2. Install dependencies

```bash
npm install
cd frontend && npm install
```

### 3. Run in development

```bash
npm run dev
# Starts Vite + Tauri + PTY server
```

### 4. Build for production

```bash
npm run tauri build
```

### 5. Configure AI providers (optional)

```javascript
// In browser devtools console — only needed for cloud providers
localStorage.setItem('nw-gemini-key', 'YOUR_GEMINI_API_KEY')
localStorage.setItem('nw-claude-key', 'YOUR_ANTHROPIC_API_KEY')
// Ollama works out of the box if installed locally
```

---

## 📁 Project Structure

```
netwatch-terminal/
├── frontend/
│   ├── img/                         ← Screenshots
│   └── src/
│       ├── App.jsx                  ← Layout + global state + shortcuts
│       ├── components/
│       │   ├── AIPanel.jsx          ← AI panel with multi-provider support
│       │   ├── MetricsPanel.jsx     ← Live system metrics
│       │   ├── InfraPanel.jsx       ← Left sidebar
│       │   ├── SidePanel.jsx        ← Right sidebar (crypto + MEV)
│       │   ├── Dashboard.jsx        ← Home screen
│       │   ├── Terminal.jsx         ← xterm.js shell instances
│       │   └── TitleBar.jsx         ← Top bar
│       ├── commands/
│       │   └── nw-commands.js       ← Custom `nw` commands
│       └── styles/
│           └── themes.css           ← Color palette + CSS variables + effects
└── src-tauri/
    └── src/
        └── main.rs                  ← PTY server + Tauri invoke handlers
```

---

## ✅ Status

| Feature | Status |
|---------|--------|
| Boot screen animation | ✅ Done |
| Multi-tab (PowerShell, WSL, CMD) | ✅ Done |
| AI panel — Ollama, Gemini, Claude | ✅ Done |
| Quick commands `/code /git /sol /explain` | ✅ Done |
| Persistent AI conversation history | ✅ Done |
| Live metrics (CPU, RAM, Disk, Network) | ✅ Done |
| Multi-drive disk detection | ✅ Done |
| INFRA panel (SSH, ports, K8s, Terraform, GitHub) | ✅ Done |
| CRYPTO panel (BTC, ETH, Gas, Docker, MEV Bots) | ✅ Done |
| Full-height side panels | ✅ Done |
| Ollama warm-up on launch | ✅ Done |
| Gas (Gwei) live API data | ⏳ Pending |
| SSH connect to Beelink from INFRA panel | ⏳ Pending |
| Prometheus auto-start with Windows | ⏳ Pending |

---

## ⚠️ Disclaimer

This project is a personal development environment built for educational and productivity purposes. MEV bot monitoring displays status of existing bots — no trading logic is included in this repository.

---

## 🧑‍💻 Author

**Héctor Oviedo** — Full Stack Dev & DeFi Researcher · Zaragoza, España

[![LinkedIn](https://img.shields.io/badge/LinkedIn-hectorob-D9027D?style=flat-square&logo=linkedin)](https://linkedin.com/in/hectorob)
[![GitHub](https://img.shields.io/badge/GitHub-HEO--80-39FF14?style=flat-square&logo=github)](https://github.com/HEO-80)

---

*NETWATCH OS v2.077 · Built with Tauri + React + Rust · Héctor Oviedo · Zaragoza, España*
