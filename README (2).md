# NETWATCH Terminal

> **Tu propia aplicación de terminal instalable — identidad Cyberpunk 2077**

![NETWATCH OS v2.077](docs/preview.png)
<!-- GIF animado próximamente -->

---

## ¿Qué es esto?

**NETWATCH Terminal** es una aplicación de escritorio instalable para Windows, construida con **Tauri + React + xterm.js**.  
No es un tema de Windows Terminal. Es una **app `.exe` propia**, con ventana propia, icono propio e instalador.

Arranca con un dashboard al estilo de tu `profile.ps1`: CPU, RAM, OS, Docker, shortcuts — todo en paleta Cyberpunk 2077.

---

## Stack

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Shell | **Tauri (Rust)** | Bundle ~3MB vs ~150MB Electron |
| Terminal render | **xterm.js** | GPU-accelerated, battle-tested |
| PTY bridge | **node-pty** | Conecta xterm.js con PowerShell real |
| Frontend | **React + Vite** | Componentes, temas, paleta CY |
| Prompt | **Oh My Posh** | `omp_cyberpunk.json` ya existente |
| Instalador | **Tauri bundler** | `.exe` NSIS o MSI en un comando |

---

## Estructura del proyecto

```
netwatch-terminal/
├── src-tauri/                  # Rust — core de la app
│   ├── src/
│   │   ├── main.rs             # Entry point Tauri
│   │   ├── commands.rs         # Comandos Tauri expuestos al frontend
│   │   └── pty.rs              # Bridge node-pty / PowerShell
│   ├── icons/                  # Iconos .ico, .png para el instalador
│   ├── Cargo.toml
│   └── tauri.conf.json         # Configuración ventana, título, permisos
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Terminal.jsx     # xterm.js wrapper
│       │   ├── Dashboard.jsx    # Pantalla de arranque (System Info, Docker...)
│       │   ├── TitleBar.jsx     # Barra custom con dots macOS + título NETWATCH
│       │   └── StatusBar.jsx    # Powerline inferior (usuario, hora, cwd)
│       ├── styles/
│       │   ├── themes.css       # Paleta $global:CY — amarillo, verde neón, magenta, cyan
│       │   └── app.css
│       ├── commands/
│       │   └── custom.js        # whoami, projects, skills, contact, bee, Set-Theme...
│       ├── App.jsx
│       └── main.jsx
│
├── docs/
│   └── preview.png             # Screenshot / GIF para el README
│
├── .gitignore
├── package.json                # Root — scripts de dev y build
└── README.md
```

---

## Features planeados

- [x] Estructura base del proyecto
- [x] Configuración Tauri (`tauri.conf.json`)
- [x] Paleta Cyberpunk 2077 completa (`$global:CY`)
- [ ] Dashboard de arranque — System Info, Shortcuts, Features, Docker
- [ ] Integración xterm.js con PowerShell real vía node-pty
- [ ] Prompt NETWATCH con Oh My Posh (`omp_cyberpunk.json`)
- [ ] Comandos personalizados: `whoami`, `projects`, `skills`, `contact`, `bee`, `status`
- [ ] Comando `Set-Theme` — cambiar tema en caliente
- [ ] Drag to move + minimize + fullscreen
- [ ] Build `.exe` con instalador NSIS
- [ ] README con GIF animado + LinkedIn post

---

## Instalación (desarrollo)

### Prerrequisitos

```powershell
# 1. Rust
winget install Rustlang.Rustup

# 2. Node.js 18+
winget install OpenJS.NodeJS.LTS

# 3. Visual Studio Build Tools (C++ workload)
winget install Microsoft.VisualStudio.2022.BuildTools

# 4. Tauri CLI
cargo install tauri-cli
```

### Arrancar en dev

```powershell
# Clonar
git clone https://github.com/HEO-80/netwatch-terminal
cd netwatch-terminal

# Instalar dependencias frontend
cd frontend && npm install && cd ..

# Dev mode (abre la ventana con hot-reload)
cargo tauri dev
```

### Build `.exe`

```powershell
cargo tauri build
# Output: src-tauri/target/release/bundle/nsis/NETWATCH_x.x.x_x64-setup.exe
```

---

## Paleta de colores

Basada en `themes/Cyberpunk2077.ps1` del repo [powershell-cyberpunk](https://github.com/HEO-80/powershell-cyberpunk).

| Variable | Hex | Uso |
|----------|-----|-----|
| `CY_YELLOW` | `#FCEE0A` | Títulos, prompt activo, highlights |
| `CY_GREEN` | `#39FF14` | Éxito, output positivo |
| `CY_MAGENTA` | `#D9027D` | Acciones, comandos |
| `CY_CYAN` | `#00F0FF` | Info, separadores |
| `CY_BG` | `#0b0a00` | Fondo principal |
| `CY_BG2` | `#0f0d00` | Titlebar, panels |

---

## Referencia base

Este proyecto migra directamente desde:

- [`powershell-cyberpunk`](https://github.com/HEO-80/powershell-cyberpunk) — paleta, prompt OMP, dashboard, instalador
- [`CodeTyper`](https://github.com/HEO-80/codetyper) — componentes de terminal React ya battle-tested

---

## Autor

**Héctor Oviedo Blasco** · [GitHub @HEO-80](https://github.com/HEO-80) · [LinkedIn](https://www.linkedin.com/in/hectorob)

> *"Construí mi propia aplicación de terminal instalable desde cero."*

---

<sub>Built with Tauri · xterm.js · React · PowerShell · Cyberpunk 2077 palette</sub>
