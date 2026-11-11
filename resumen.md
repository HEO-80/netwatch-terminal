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




NETWATCH Terminal — Fase 6: Programming Mode + AI Copilot
BLOQUE A — Programming Mode (terminal → mini-IDE)

La idea es que cuando estás en un directorio de proyecto, NETWATCH entienda el lenguaje y te ayude a programar sin necesitar VS Code para cosas rápidas.

A1. Language Server Protocol (LSP) básico
 Integrar un LSP client ligero en el backend Rust que se comunique con language servers instalados en el sistema
 Detectar automáticamente qué language server usar según el proyecto: rust-analyzer (Rust), typescript-language-server (JS/TS), pylsp (Python), clangd (C/C++)
 Comando nw lang para ver qué language servers están disponibles y cuáles activos
 Comando nw lang install rust para instalar un language server si no lo tiene (wrapper de cargo install, npm install -g, pip install)
A2. Editor inline en terminal
 Comando nw edit archivo.rs abre un editor inline dentro de la terminal (no un tab nuevo, dentro del propio xterm.js)
 El editor tiene syntax highlighting por lenguaje (tree-sitter o highlight.js parseado)
 Numeración de líneas, cursor con posición (línea:columna) en la barra de estado
 Atajos básicos: Ctrl+S guardar, Ctrl+Z undo, Ctrl+Shift+Z redo, Ctrl+F buscar, Ctrl+G ir a línea
 Al guardar se ejecuta el linter y muestra errores/warnings inline (subrayado rojo/amarillo) con el mensaje al hacer hover o al navegar con F8/Shift+F8
A3. Autocompletado inteligente en la terminal
 Cuando escribes un comando en la terminal, sugerir autocompletado según el contexto:
Si estás en un proyecto Node: sugerir scripts de package.json, dependencias, flags de npm/yarn
Si estás en un proyecto Rust: sugerir targets de cargo, flags, crates
Si escribes git: sugerir subcomandos, ramas, archivos modificados
Si escribes docker: sugerir contenedores, imágenes, volumes
 Las sugerencias aparecen como un dropdown semi-transparente encima de la línea de comandos (tipo fish shell o zsh-autosuggestions pero visual)
 Tab acepta la sugerencia, Esc la descarta, flechas navegan entre opciones
 Las sugerencias se alimentan de: historial de comandos, contexto del proyecto, y opcionalmente de la AI
A4. Snippets de código por lenguaje
 Extender el sistema de snippets existente (nw snip) con snippets de código por lenguaje
 nw snip code rust:match → inserta un bloque match de Rust
 nw snip code js:fetch → inserta un fetch con async/await
 nw snip code py:class → inserta una clase Python
 Snippets editables y ampliables por el usuario
 En el editor inline, Ctrl+Space abre el menú de snippets filtrado por el lenguaje del archivo
A5. Run/Build/Test integrado
 nw run → detecta el proyecto y ejecuta el comando apropiado:
Rust: cargo run
Node: npm start o npm run dev
Python: python main.py
Docker: docker-compose up
 nw build → cargo build, npm run build, etc.
 nw test → cargo test, npm test, pytest, etc.
 Output con colores: tests pasados en verde, fallidos en rojo, con resumen al final
 nw watch → modo watch que re-ejecuta al detectar cambios en archivos (usa notify/fswatch)
 Los errores de compilación/test son clickeables: click abre nw edit en el archivo y línea del error
A6. Sistema de extensiones/modos
 Estructura de extensión: carpeta en ~/.netwatch/modes/ con un mode.json que define:
Lenguaje que soporta
Comandos que añade
Snippets que incluye
Language server que necesita
Colores de highlighting
 nw mode list → muestra modos instalados y activos
 nw mode install rust / nw mode install python / nw mode install solidity
 nw mode auto → activa automáticamente el modo según el proyecto detectado
 Modos built-in: Rust, JavaScript/TypeScript, Python, Solidity, Bash, PowerShell, Markdown
 Los modos se pueden compartir como paquetes (futuro: registry propio o GitHub)
BLOQUE B — AI Copilot integrado (la AI vive dentro de la terminal)

La IA deja de ser un panel al que vas a preguntar y se convierte en un copiloto que está siempre ahí, entiende lo que haces y te ayuda sin que tengas que pedir.

B1. AI inline en la terminal (sugerencias mientras escribes)
 Cuando llevas 1-2 segundos sin escribir, la AI sugiere en gris tenue (como GitHub Copilot) lo que podría venir a continuación del comando
 Tab acepta la sugerencia, Esc la descarta
 La sugerencia tiene en cuenta: historial, directorio actual, proyecto detectado, último error
 Se puede desactivar con nw ai suggest off y activar con nw ai suggest on
 Usa el provider de AI configurado (Ollama local para velocidad, Claude/Gemini para calidad)
 Las sugerencias NO bloquean el input — son asíncronas y aparecen/desaparecen sin interferir
B2. AI error detection y auto-fix
 Cuando un comando falla (exit code != 0), la AI analiza el stderr automáticamente
 Muestra debajo del error un bloque con:
Explicación del error en una línea (en español)
Comando sugerido para arreglarlo
Botón/tecla para ejecutar el fix directamente (Enter aplica, Esc descarta)
 Ejemplo: npm install falla → “Falta el paquete X. Ejecutar: npm install X” → Enter lo instala
 nw fix como comando manual para pedir al AI que analice el último error si el auto-fix no saltó
 Configurable: nw config ai.autofix on/off
B3. AI context awareness (entiende tu sesión)
 La AI mantiene un contexto de la sesión actual:
Directorio en el que estás y tipo de proyecto
Últimos 20 comandos ejecutados y su output (resumido)
Archivos modificados recientemente
Errores encontrados y cómo se resolvieron
 Cuando preguntas algo con nw ai, la AI ya tiene ese contexto sin que le expliques nada
 “nw ai qué me falta para deployar esto” → la AI mira el proyecto, el estado de git, los scripts disponibles y te dice
 El contexto se resetea al cerrar la terminal o con nw ai reset
B4. AI voice mode (hablarle y que te hable)
 nw ai voice activa el modo voz: escucha por micrófono y responde por altavoz
 Speech-to-text: usar la API de Whisper (local con whisper.cpp si hay GPU, o API de OpenAI)
 Text-to-speech: usar la API de TTS del provider o Edge TTS (gratis)
 Mientras está en modo voz, un indicador visual en la barra de estado muestra que está escuchando (dot pulsante)
 Puedes hablarle mientras trabajas: “oye, qué hace este error” y te responde
 nw ai voice off para desactivar
 Push-to-talk alternativo: mantener una tecla (ej. Ctrl+Space) para hablar
B5. AI code review en terminal
 nw ai review → la AI revisa los archivos modificados (git diff) y da feedback:
Bugs potenciales
Mejoras de rendimiento
Code style
Seguridad
 nw ai review archivo.rs → review de un archivo específico
 El output es interactivo: cada sugerencia es clickeable, Enter aplica el cambio, n pasa al siguiente
 nw ai commit → la AI genera un mensaje de commit basado en los cambios, tú lo aceptas o editas
B6. AI learning mode (aprende de ti)
 La AI guarda en local (store de Tauri) patrones de uso:
Comandos que más usas
Errores que cometes frecuentemente
Proyectos en los que trabajas
Preferencias de estilo de código
 Con el tiempo, las sugerencias se vuelven más personalizadas
 nw ai profile → muestra lo que la AI ha aprendido de ti
 nw ai forget → borra el perfil aprendido
 Todo en local, nada se envía a ningún servidor (privacidad total)
Prioridad sugerida dentro de la Fase 6

Primero (impacto inmediato, factible):

A3 — Autocompletado inteligente en terminal
B2 — AI error detection y auto-fix
A5 — Run/Build/Test integrado
B3 — AI context awareness

Segundo (potente pero mas trabajo):
5. A2 — Editor inline
6. B1 — AI inline suggestions (tipo Copilot)
7. B5 — AI code review
8. A4 — Snippets de codigo por lenguaje

Tercero (largo plazo):
9. A1 — LSP integration
10. A6 — Sistema de extensiones/modos
11. B4 — Voice mode
12. B6 — AI learning mode

---

## CHECKLIST DE DESARROLLO — TODO

### FASE 3: Interactividad de paneles (raton)

#### 3A. Hover y glow en paneles
- [x] Hover sobre panel: borde glow sutil `box-shadow: 0 0 12px rgba(color, 0.3)` con `transition 0.2s`
- [x] Hover en InfraPanel (magenta)
- [x] Hover en SidePanel/Crypto (cyan)
- [x] Hover en MetricsPanel (verde)
- [x] Hover en AIPanel (verde)
- [x] Hover en GitPanel (magenta)
- [x] Hover en TasksPanel (amarillo)
- [x] Hover en NotesPanel (verde)
- [x] Hover en LogsPanel (rojo)
- [x] Hover en SettingsPanel (magenta)
- [ ] Hover sobre elementos clickeables dentro del panel: fondo mas claro + cursor pointer (verificar consistencia)
- [x] Tooltips en toggles de TabBar: nombre completo + descripcion de una linea
- [x] TabBar: toggles activos muestran color del panel, cerrados con color tenue (opacity 0.5) + hover full color

#### 3B. Click en elementos — info contextual y acciones
- [x] Panel AI: click en provider sin configurar -> formulario inline para API key + boton guardar
- [x] Panel INFRA > SSH Servers: click -> "Conectar", "Copiar IP"
- [x] Panel INFRA > Puertos: click -> proceso + "Abrir en navegador" si HTTP
- [x] Panel INFRA > GitHub: click en commit -> abrir en navegador
- [x] Panel CRYPTO > BTC/ETH: click -> expandir detalle (high/low 24h, market cap, volumen)
- [x] Panel CRYPTO > Docker: click en contenedor -> start/stop/logs
- [x] Panel CRYPTO > MEV Bots: click -> expandir detalle
- [x] Panel METRICS > CPU/RAM/Disk: click -> vista expandida con historial
- [x] Panel GIT > archivos: click -> diff inline (ya existia)
- [ ] Panel NOTES: click en nota -> opciones editar, copiar contenido
- [ ] Panel AI: click en mensaje de conversacion -> copiar al clipboard
- [ ] Panel INFRA > SSH OFFLINE: click muestra tooltip "Servidor no responde" + opciones

#### 3C. Paneles a primer plano
- [x] Click en header del panel -> modo focus: expande de 220px a 350px
- [x] Icono minimizar (restore) en header cuando esta en focus
- [x] Doble click en header -> overlay con fondo semi-transparente
- [x] Esc cierra overlay, segundo Esc cierra focus
- [x] Click fuera del panel en overlay lo cierra (backdrop click)

#### 3D. Window controls en cada panel (minimize/maximize/restore)
- [ ] Mini-botones en header: Minimizar (—), Maximizar (square), Restaurar
- [ ] Minimizar: colapsa panel a solo barra de header (franja fina con nombre)
- [ ] Maximizar: panel se expande a toda el area central como overlay
- [ ] Restaurar: vuelve al tamano normal
- [ ] Botones 12-14px, color del panel, hover highlight
- [ ] Panel minimizado sigue ocupando su posicion pero en version mini

### FASE 3.5: Mejoras UI especificas

#### AI Panel
- [x] Sin provider activo: colapsar automaticamente a barra fina "AI - sin provider — click para configurar"
- [x] Providers como botones clickeables con guia paso a paso (badges clickeables + inline config)
- [x] No mostrar conversacion vieja si no hay provider activo

#### Dashboard
- [x] Seccion "Estado rapido" / hub con resumen de una linea de cada panel (Git, Puertos, Uptime, Docker)
- [ ] Quick Actions: ultimos 5 comandos como botones re-ejecutables
- [ ] Reducir espacio muerto entre "Features instalados" y el prompt

#### Otros
- [x] Borde cyan del panel activo mas sutil (opacity 0.3 cuando no tiene focus)
- [x] Padding inferior del prompt de terminal (mas espacio antes de la barra de hints)

### FASE 4: Navegacion completa por teclado

#### 4A. Teclas F para focus en zona de paneles
- [ ] F1 -> Focus panel izquierdo (INFRA)
- [ ] F2 -> Focus panel derecho (CRYPTO/GIT/TASKS/NOTES/LOGS/SETTINGS)
- [ ] F3 -> Focus panel superior (AI)
- [ ] F4 -> Focus panel inferior (METRICS)
- [ ] F5 -> Focus de vuelta a la terminal
- [ ] Al dar focus a panel: glow de borde se activa

#### 4B. Tab/Shift+Tab para ciclar entre paneles
- [ ] Tab dentro de panel -> cicla al siguiente panel visible (izq -> arriba -> der -> abajo -> terminal)
- [ ] Shift+Tab -> cicla en sentido contrario
- [ ] Solo cicla entre paneles visibles/abiertos

#### 4C. Navegacion dentro de panel con flechas
- [ ] Flecha arriba/abajo -> navegar entre elementos/secciones del panel
- [ ] Elemento seleccionado resaltado con fondo sutil (como hover raton)
- [ ] Enter -> ejecutar accion del elemento (equivalente a click)
- [ ] Space -> expandir/colapsar seccion del panel
- [ ] Esc -> salir del panel, volver focus a terminal

#### 4D. Atajos rapidos dentro de panel
- [ ] `c` -> Copiar (IP, precio, path) al clipboard
- [ ] `o` -> Open (abrir en navegador si aplica)
- [ ] `e` -> Edit/Expand (expandir detalle, editar server)
- [ ] `d` -> Delete/Disconnect (segun contexto)
- [ ] `r` -> Refresh (refrescar datos del panel)

#### 4E. Ciclar paneles en misma posicion
- [ ] Ctrl+F2 -> cicla al siguiente panel de esa posicion (CRYPTO -> GIT -> TASKS -> NOTES)
- [ ] Alternativa: `[` y `]` cuando panel tiene focus

#### 4F. Controles de ventana por teclado
- [ ] Con panel en focus: `m` -> minimizar
- [ ] Con panel en focus: `x` -> maximizar
- [ ] Esc -> restaurar si esta maximizado

#### 4G. Indicador visual de focus
- [ ] Borde mas brillante que hover de raton
- [ ] Etiqueta "[FOCUS]" o icono keyboard en el header
- [ ] Elemento seleccionado: fondo highlight amarillo tenue o borde izquierdo `#FCEE0A` opacity 0.3
- [ ] En TabBar/barra de estado: mostrar que panel y elemento tiene focus

#### 4H. Cheat sheet de atajos
- [ ] `?` o F12 -> overlay con todos los atajos organizados por categoria
- [ ] Categorias: paneles, terminal, tabs, comandos nw
- [ ] Esc o `?` de nuevo cierra
- [ ] Mantener actualizado con cada nuevo atajo

#### Reglas de teclado
- [ ] F1-F5 y Tab para paneles solo funcionan cuando focus NO esta en linea de comandos
- [ ] Si estas escribiendo en xterm.js, terminal tiene prioridad total
- [ ] Focus se transfiere a terminal automaticamente cuando empiezas a escribir
- [ ] Animaciones rapidas (200ms max)

### FASE 5: Arquitectura modular

#### 5A. Core (siempre incluido, no desactivable)
- [ ] Ventana Tauri con titlebar custom
- [ ] xterm.js multi-tab (PowerShell, WSL, CMD)
- [ ] WebSocket PTY bridge
- [ ] Paleta de colores cyberpunk + sistema de temas
- [ ] Comandos basicos: `nw help`, `nw config`
- [ ] TabBar con tabs de terminal
- [ ] Boot screen (skipeable/desactivable en config)

#### 5B. Modulos opcionales (activables con `nw config`)
- [ ] Panel AI — `nw config panels.ai on/off` (default: off hasta configurar provider)
- [ ] Panel METRICS — `nw config panels.metrics on/off` (default: on)
- [ ] Panel INFRA — `nw config panels.infra on/off` (default: off)
- [ ] Panel CRYPTO — `nw config panels.crypto on/off` (default: off)
- [ ] Panel GIT — `nw config panels.git on/off` (default: off, auto si hay repo git)
- [ ] Panel TASKS — `nw config panels.tasks on/off` (default: off)
- [ ] Panel NOTES — `nw config panels.notes on/off` (default: off)
- [ ] Panel LOGS — `nw config panels.logs on/off` (default: off)
- [ ] Dashboard — `nw config dashboard on/off` (default: on)
- [ ] Dojo (quiz/tatami/forja) — `nw config dojo on/off` (default: off)
- [ ] Notebook — `nw config notebook on/off` (default: off)
- [ ] Clipboard manager — `nw config clipboard on/off` (default: off)
- [ ] Session recording — `nw config recording on/off` (default: off)
- [ ] Command Palette — `nw config palette on/off` (default: on)
- [ ] Smart output (JSON -> tabla) — `nw config smartoutput on/off` (default: on)
- [ ] Snippets — `nw config snippets on/off` (default: on)

#### 5C. Lazy loading obligatorio
- [ ] Modulos desactivados NO se importan en React (React.lazy + Suspense)
- [ ] Paneles activados pero ocultos (toggle off) no hacen fetch ni polling
- [ ] Backend Rust solo arranca workers de modulos activos
- [ ] API keys solo se validan al activar el modulo correspondiente

#### 5D. First-run wizard
- [ ] Wizard rapido (3 pasos max) en primera ejecucion
- [ ] Paso 1: "Solo terminal o tambien paneles?"
- [ ] Paso 2: Checkboxes para elegir paneles (con descripcion)
- [ ] Paso 3: "Tienes provider de AI?" -> configurar key o skip
- [ ] Re-lanzable con `nw setup`
- [ ] Configuracion en store de Tauri, aplicacion inmediata

#### 5E. Presets de configuracion
- [ ] `nw config preset minimal` — solo terminal, cero paneles
- [ ] `nw config preset developer` — terminal + git + metrics + palette + smart output
- [ ] `nw config preset sysadmin` — terminal + infra + metrics + logs + SSH
- [ ] `nw config preset full` — todo activado
- [ ] `nw config preset custom` — lo configurado manualmente

#### 5F. Metricas de rendimiento
- [ ] `nw perf` — tiempo de arranque, RAM, modulos cargados, fetch activos
- [ ] Objetivo: minimal < 500ms, full < 2s
- [ ] Warning si un modulo tarda > 200ms en cargar

#### 5G. Gestion de almacenamiento
- [ ] `nw storage` — cuanto ocupa cada modulo en disco y store
- [ ] `nw storage clean` — limpiar cache, historiales antiguos, datos de modulos desactivados

### FASE 6: Programming Mode + AI Copilot

#### 6A. Programming Mode (terminal -> mini-IDE)
- [ ] A1: LSP client ligero en Rust (rust-analyzer, tsserver, pylsp, clangd)
- [ ] A2: Editor inline en terminal (`nw edit archivo`) con syntax highlighting
- [ ] A3: Autocompletado inteligente segun contexto (Node scripts, cargo targets, git branches)
- [ ] A4: Snippets de codigo por lenguaje (`nw snip code rust:match`)
- [ ] A5: Run/Build/Test integrado (`nw run`, `nw build`, `nw test`, `nw watch`)
- [ ] A6: Sistema de extensiones/modos (`~/.netwatch/modes/`, `nw mode install`)

#### 6B. AI Copilot integrado
- [ ] B1: AI inline suggestions mientras escribes (tipo Copilot, Tab acepta)
- [ ] B2: AI error detection y auto-fix (analiza stderr, sugiere fix)
- [ ] B3: AI context awareness (entiende directorio, proyecto, historial)
- [ ] B4: AI voice mode (speech-to-text + text-to-speech)
- [ ] B5: AI code review en terminal (`nw ai review`, `nw ai commit`)
- [ ] B6: AI learning mode (aprende patrones de uso, todo local)

#### Fase 6 — Modulos opcionales futuros
- [ ] Programming Mode / LSP — `nw mode install rust`
- [ ] AI Copilot inline — `nw config ai.copilot on/off` (default: off)
- [ ] AI Voice — `nw config ai.voice on/off` (default: off)
- [ ] AI Auto-fix — `nw config ai.autofix on/off` (default: off)
- [ ] Extensiones/modos — `nw mode install <modo>`