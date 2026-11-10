# NETWATCH Terminal — Resumen completo

## Que es

Una **aplicacion de escritorio instalable** (`.exe`) que funciona como una terminal personalizada con estetica **Cyberpunk 2077**. No es un tema de Windows Terminal: es una app propia construida desde cero con ventana custom, icono propio e instalador NSIS.

**Version**: `2.0.77` | **Autor**: Hector Oviedo Blasco (HEO-80) | **Branch actual**: `feature/tauri-setup`

---

## Stack tecnologico

| Capa | Tecnologia |
|------|------------|
| **Shell nativo** | Tauri v2 (Rust) — bundle ~3MB |
| **Terminal** | xterm.js (GPU-accelerated) via WebSocket |
| **PTY bridge** | Servidor Node.js sidecar (`pty-server.js`) que conecta xterm.js con PowerShell/WSL/CMD reales |
| **Frontend** | React + Vite |
| **Instalador** | Tauri bundler (NSIS/MSI) |

---

## Arquitectura del backend Rust (`src-tauri/`)

### `main.rs`

Arranca la app Tauri, lanza el servidor PTY como proceso hijo (sidecar), y lo mata al cerrar la ventana. Ventana sin decoraciones nativas (`decorations: false`, `transparent: true`) para el look custom.

### `commands.rs`

10 comandos Tauri expuestos al frontend:

- `get_system_info` — CPU, RAM, OS, usuario (via WMI/PowerShell)
- `get_docker_status` — Lista contenedores Docker activos
- `run_powershell` — Ejecuta cualquier comando PowerShell y devuelve stdout/stderr
- `open_url` / `open_vscode` / `ssh_beelink` — Shortcuts rapidos
- `minimize_window` / `maximize_window` / `close_window` / `toggle_fullscreen` — Controles de ventana

---

## Frontend — Componentes (`frontend/src/`)

### `App.jsx`

Componente raiz. Incluye:

- **Boot Screen** — Animacion de arranque tipo hacker con lineas que aparecen secuencialmente (skipeable)
- **Sistema de tabs** — Dashboard + multiples terminales (PowerShell, WSL, CMD) con `Alt+T/W/D/1-9`
- **4 paneles laterales** toggleables:
  - Panel Crypto (derecha)
  - Panel Infra (izquierda)
  - Panel AI (arriba)
  - Panel Metrics (abajo)
- **TabBar** inferior con powerline estilo NETWATCH

### `TitleBar.jsx`

Barra de titulo custom con:

- Dots macOS (cerrar/minimizar/maximizar) que llaman a comandos Tauri
- Titulo "NETWATCH OS V2.077" con drag-to-move
- Hints de atajos de teclado

### `Terminal.jsx`

Wrapper de xterm.js:

- Conecta via WebSocket a `ws://127.0.0.1:7777` (PTY server)
- Soporta 3 shells: PowerShell (amarillo), WSL (verde), CMD (cyan)
- Intercepta comandos `nw *` antes de enviarlos al shell real
- Auto-reconexion (5 reintentos)
- ResizeObserver para auto-fit

### `Dashboard.jsx`

Pantalla de inicio tipo `profile.ps1`:

- Banner ASCII NETWATCH
- System Info (CPU, RAM, OS, Shell, User)
- Shortcuts clickeables (Notion, Obsidian, Gmail, VS Code, SSH Beelink)
- Features instalados (Terminal-Icons, Fzf, Autocompletado)
- Estado Docker
- Boton "Launch Terminal"

### `SidePanel.jsx` — Panel derecho "CRYPTO"

- Precios BTC/ETH en tiempo real (CoinGecko API, refresh cada 30s)
- Gas ETH (Etherscan API) — slow/standard/fast en Gwei
- Estado Docker (contenedores activos con dots verde/rojo)
- MEV Bots status (3 bots: ETH Main, BSC Flash, ARB Snipe — placeholder/mock)
- Uptime del sistema

### `InfraPanel.jsx` — Panel izquierdo "INFRA"

- SSH Servers (ping status con dots animados)
- Puertos activos (escaneo de puertos conocidos: 3000, 5173, 7777, 27017, etc.)
- Kubernetes pods (via `kubectl`)
- Terraform workspaces (lee `.tfstate` locales)
- GitHub activity (ultimos commits y repos via GitHub API)

### `AIPanel.jsx` — Panel superior "AI" (~700 lineas)

- **Multi-provider**: Ollama (local), Gemini API, Claude API
- Auto-deteccion de providers disponibles
- Warm-up automatico de modelo Ollama en VRAM
- Selector de modelo por provider
- **Comandos rapidos** con system prompts especializados: `/code`, `/git`, `/solidity`, `/explain`
- Historial persistente en localStorage (max 50 mensajes)
- Streaming de respuestas con cursor animado
- Estimacion de tokens

### `MetricsPanel.jsx` — Panel inferior "METRICS"

- **CPU**: porcentaje + sparkline SVG + barra de progreso (colores adaptativos: verde/amarillo/magenta segun carga)
- **RAM**: porcentaje + sparkline + GB usado/total
- **Discos**: todas las unidades con barras de porcentaje en 2 columnas
- **Red**: RX/TX en KB/s o MB/s + sparkline
- Datos reales via WMI (fallback a mock si no hay Tauri)
- Refresh cada 3 segundos

---

## Comandos personalizados (`nw *`)

### `nw-commands.js`

Comandos propios interceptados en la terminal:

| Comando | Funcion |
|---------|---------|
| `nw help` | Lista todos los comandos |
| `nw status` | Sistema, puertos activos, repos con cambios |
| `nw eth` | Precios BTC/ETH + gas |
| `nw repos` | Lista repos git con rama, estado dirty/clean, ahead |
| `nw ssh` | Servidores SSH guardados + conectar |
| `nw snip` | Snippets: guardar, listar, ejecutar comandos frecuentes |
| `nw deploy` | Wizard de deploy (detecta Tauri/Next/Hardhat/Docker y ofrece opciones) |
| `nw ai <pregunta>` | Chat con Claude AI desde la terminal |

### `custom.js`

Comandos de perfil: `whoami`, `projects`, `skills`, `contact`, `status`, `bee`, `notion`, `obsidian`, `gmail`, `vsc`

---

## Paleta de colores Cyberpunk 2077

| Color | Hex | Significado semantico |
|-------|-----|-----------------------|
| Amarillo | `#FCEE0A` | Marca NETWATCH, titulos, prompt, highlights |
| Verde neon | `#39FF14` | Exito, bash, confirmaciones |
| Magenta | `#D9027D` | Git, acciones importantes, bordes |
| Cyan | `#00F0FF` | Info, rutas, separadores, bordes |
| Rojo | `#ff5555` | Solo errores |
| Fondo | `#080700` / `#0b0a00` | Fondo principal / paneles |

---

## Atajos de teclado

| Atajo | Accion |
|-------|--------|
| `Alt+T` | Nueva terminal |
| `Alt+W` | Cerrar tab |
| `Alt+D` | Dashboard |
| `Alt+1-9` | Saltar a tab |
| `Alt+P` | Panel Crypto |
| `Alt+I` | Panel Infra |
| `Alt+A` | Panel AI |
| `Alt+M` | Panel Metrics |

---

## En resumen

Es un **workstation completo** disfrazado de terminal cyberpunk: terminal real multi-shell, dashboard de sistema, monitoreo de infra (K8s, Terraform, SSH, puertos), precios crypto en vivo, MEV bots status, chat AI multi-provider, metricas de hardware en tiempo real, deploy wizard, y un sistema de comandos propios. Todo empaquetado en un `.exe` de ~3MB.
