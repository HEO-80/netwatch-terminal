# NETWATCH OS v2.077 — Manual de Uso

> Manual completo de la interfaz, paneles y funcionalidades.

---

## Índice

1. [Arranque y boot screen](#1-arranque-y-boot-screen)
2. [Estructura general de la interfaz](#2-estructura-general-de-la-interfaz)
3. [TitleBar — barra superior](#3-titlebar--barra-superior)
4. [TabBar — barra inferior de pestañas](#4-tabbar--barra-inferior-de-pestañas)
5. [Dashboard — pantalla de inicio](#5-dashboard--pantalla-de-inicio)
6. [Terminal — shells en tiempo real](#6-terminal--shells-en-tiempo-real)
7. [Panel AI](#7-panel-ai)
8. [Panel METRICS](#8-panel-metrics)
9. [Panel INFRA — sidebar izquierdo](#9-panel-infra--sidebar-izquierdo)
10. [Panel CRYPTO / NETWATCH — sidebar derecho](#10-panel-crypto--netwatch--sidebar-derecho)
11. [Atajos de teclado — referencia completa](#11-atajos-de-teclado--referencia-completa)
12. [Configuración de providers AI](#12-configuración-de-providers-ai)
13. [Comandos propios `nw`](#13-comandos-propios-nw)
14. [PowerShell profile — comandos extra](#14-powershell-profile--comandos-extra)

---

## 1. Arranque y boot screen

Al abrir NETWATCH por primera vez en una sesión, verás la secuencia de arranque animada:

```
NETWATCH OS v2.077 — INITIALIZING...
► Loading system modules...
► Connecting to hardware interface...
► Reading CPU / RAM / OS data...
► Mounting shortcuts registry...
► PTY server online [ws://127.0.0.1:7777]
────────────────────────────────────────────
SYSTEM STATUS: ONLINE  ●
ACCESS GRANTED — Welcome, HEO-80
```

Cada línea aparece con un delay de 140ms. Puedes saltarla con el botón **SKIP ▸** (esquina inferior derecha).

La boot screen solo aparece una vez por sesión. Si recargas la app en la misma sesión, se omite automáticamente y vas directo al Dashboard.

---

## 2. Estructura general de la interfaz

```
┌─────────────────────────────────────────────────────────────────┐
│                        TITLEBAR                                  │
├─────────────────────────────────────────────────────────────────┤
│                    [ AI PANEL — desplegable ]                    │
├──────────┬──────────────────────────────────────────┬───────────┤
│          │                                          │           │
│  INFRA   │         ZONA CENTRAL                     │  CRYPTO   │
│  PANEL   │   (Dashboard / Terminal / tabs)          │  PANEL    │
│          │                                          │           │
│ Alt+I    │                                          │  Alt+P    │
│          │                                          │           │
├──────────┴──────────────────────────────────────────┴───────────┤
│                  [ METRICS PANEL — desplegable ]                 │
├─────────────────────────────────────────────────────────────────┤
│                        TABBAR                                    │
└─────────────────────────────────────────────────────────────────┘
```

Los paneles laterales (INFRA y CRYPTO) ocupan **toda la altura** de la aplicación, independientemente de si el panel AI está abierto o no. El AI panel solo ocupa espacio en la zona central.

Los paneles se pueden abrir y cerrar de forma independiente y combinarse libremente. Puedes tener INFRA + AI + METRICS abiertos a la vez, o ninguno.

---

## 3. TitleBar — barra superior

La barra superior muestra:

- **NETWATCH OS V2.077** — nombre y versión del sistema
- **HEO-80** — identificador del usuario
- **Tab activa** — nombre de la pestaña actual (DASHBOARD, POWERSHELL, etc.)
- **Atajos de referencia** — `Alt+T Nueva PS · Alt+D Dashboard · Alt+W cerrar tab · Alt+1-9 saltar`

La TitleBar es informativa y no tiene controles clicables, ya que toda la navegación se hace desde la TabBar inferior o con atajos de teclado.

---

## 4. TabBar — barra inferior de pestañas

La barra inferior es el centro de control de NETWATCH. Se divide en tres zonas:

### Zona izquierda — INFRA toggle
- **◈ INFRA** — abre/cierra el panel INFRA (atajo: `Alt+I`)
- Se ilumina en magenta cuando el panel está abierto

### Zona central — pestañas
- Cada pestaña tiene un icono, nombre y botón `×` para cerrar
- La pestaña activa se marca con una línea amarilla en la parte superior
- La pestaña **Dashboard** no se puede cerrar
- Las pestañas de shell (PowerShell, WSL, CMD) sí se pueden cerrar

### Zona derecha — controles
Botones de nueva terminal:
- **+ PS** — nueva pestaña PowerShell (`pwsh.exe`)
- **+ WSL** — nueva pestaña WSL/bash (`wsl.exe`)
- **+ CMD** — nueva pestaña CMD (`cmd.exe`)

Toggles de paneles:
- **◈ AI** — abre/cierra panel AI (verde cuando activo)
- **◈ METRICS** — abre/cierra panel de métricas (verde cuando activo)
- **◈ CRYPTO** — abre/cierra panel CRYPTO (cyan cuando activo)

Reloj en tiempo real (`HH:MM`).

---

## 5. Dashboard — pantalla de inicio

El Dashboard es la pantalla que aparece al arrancar. Muestra dos columnas:

### System Info (izquierda)
Información del sistema detectada automáticamente al arrancar:
- **Started** — fecha y hora de inicio de la sesión
- **Shell** — versión de PowerShell
- **CPU** — modelo del procesador
- **RAM** — memoria total instalada
- **User** — usuario de Windows
- **OS** — sistema operativo

### Shortcuts (derecha)
Accesos directos configurados para abrir apps desde el Dashboard o la terminal:

| Atajo | Acción |
|-------|--------|
| `n` | Abrir Notion |
| `o` | Abrir Obsidian |
| `g` | Abrir Gmail en el navegador |
| `vsc` | Abrir VS Code en el directorio actual |
| `proj` | Abrir VS Code en `C:\Users\Heo\Source\Repos` |
| `bee` | Conectar via SSH al Beelink (`ssh heo@192.168.1.x`) |

### Features instalados
Lista de las capacidades del perfil de PowerShell configuradas:
- `ls / dir` — iconos junto a archivos y carpetas (Terminal Icons)
- `Ctrl+T` — búsqueda interactiva de archivos con Fzf
- `Ctrl+R` — búsqueda en historial de comandos con Fzf
- `Flecha →` — acepta sugerencia de autocompletado
- `help-ps` — ver todos los comandos disponibles

### Docker
Muestra contenedores Docker activos. Si Docker no está corriendo, muestra "Sin contenedores activos."

### Botón LAUNCH TERMINAL
Abre una nueva pestaña PowerShell directamente desde el Dashboard.

---

## 6. Terminal — shells en tiempo real

Cada pestaña de terminal conecta con el PTY server en `ws://127.0.0.1:7777` y ejecuta un proceso de shell real.

### Tipos de shell

| Shell | Icono | Color identificador | Binary |
|-------|-------|-------------------|--------|
| PowerShell | PS | Amarillo `#FCEE0A` | `pwsh.exe` |
| WSL/bash | λ | Verde `#39FF14` | `wsl.exe` |
| CMD | ⚡ | Cyan `#00F0FF` | `cmd.exe` |

El color del dot y el nombre en la info bar de cada terminal corresponde al shell activo.

### Info bar de la terminal
Encima de cada terminal hay una barra que muestra:
- **Dot de color** + nombre del shell
- `netwatch@HEO-80` — usuario y máquina
- URL del PTY server (dim, solo referencia)

### Reconexión automática
Si el PTY server se desconecta, la terminal intenta reconectar automáticamente hasta 5 veces con un delay de 2 segundos entre intentos. Verás el mensaje:
```
[Reconectando 1/5...]
```
Si los 5 intentos fallan:
```
✗ Sin conexión al PTY server.
```

### Hints bar inferior
Debajo de cada terminal hay una barra de ayuda rápida:
- `nw help` — comandos propios de NETWATCH
- `nw ai` — abrir el panel AI
- `Tab` — completar comando
- `→` — aceptar sugerencia PSReadLine
- `Ctrl+R` — búsqueda en historial con Fzf
- `z dir` — saltar a directorio con zoxide

### Múltiples terminales simultáneas
Puedes tener tantas pestañas de terminal como necesites. Cada una tiene su propio proceso independiente. Para crear una nueva:
- Clic en **+ PS**, **+ WSL** o **+ CMD** en la TabBar
- O usa `Alt+T` para una nueva PowerShell

Para cerrar una terminal: clic en el `×` de la pestaña, o `Alt+W`.

---

## 7. Panel AI

El panel AI se despliega desde la parte superior de la zona central. Se activa con `Alt+A` o el botón **◈ AI** en la TabBar.

### Providers disponibles

#### Ollama (local) — punto verde
Ollama corre en tu máquina (`http://localhost:11434`). No necesita internet ni API key.

Al arrancar NETWATCH, el sistema:
1. Detecta automáticamente si Ollama está instalado
2. Lee los modelos instalados via `/api/tags`
3. Hace un **warm-up** silencioso del modelo por defecto — lo carga en VRAM antes de que lo necesites, eliminando el delay de la primera respuesta

Si Ollama no está instalado, el badge aparece en gris con opacidad reducida.

#### Gemini CLI — punto cyan
Usa la API REST de Google Generative Language. Requiere API key configurada:
```javascript
localStorage.setItem('nw-gemini-key', 'TU_API_KEY')
```
Modelos disponibles: `gemini-2.0-flash`, `gemini-1.5-pro`

#### Claude API — punto magenta
Usa la API de Anthropic. Requiere API key configurada:
```javascript
localStorage.setItem('nw-claude-key', 'TU_API_KEY')
```
Modelos disponibles: `claude-sonnet-4-20250514`, `claude-haiku-4-5-20251001`

### Selector de modelo
Cuando hay más de un modelo disponible para el provider activo, aparece un desplegable junto a los badges para seleccionar el modelo.

### Header de estado
El header muestra el estado actual:
- `detectando...` — comprobando providers al arrancar
- `◌ cargando modelo...` — Ollama haciendo warm-up (parpadea)
- `● Ollama · llama3.1` — provider activo y modelo seleccionado
- `~1,240t · 8 msgs` — tokens estimados y mensajes en la conversación

### Comandos rápidos
La barra de comandos rápidos aparece debajo del header. Al hacer clic en uno o escribir el prefijo, se activa un **system prompt especializado** para esa tarea:

| Comando | System prompt | Para qué |
|---------|--------------|----------|
| `/code` | Senior dev, stack: React, Next.js, Solidity, PowerShell. Responde con código limpio y explicación breve | Revisar errores, escribir funciones, refactorizar |
| `/git` | Experto Git. Comando exacto primero, luego explicación breve | Resolver situaciones de Git |
| `/sol` | Auditor de smart contracts y DeFi. Prioriza seguridad, gas efficiency. Contexto MEV en Ethereum y BSC | Revisar contratos, lógica DeFi |
| `/explain` | Conciso y técnico, nivel senior. Sin relleno innecesario | Entender conceptos, errores, arquitecturas |

El prefijo se incluye en el mensaje enviado al modelo. El input cambia de color y el cursor adopta el color del comando activo.

### Enviar mensajes
- **Enter** — enviar mensaje
- **Shift+Enter** — nueva línea sin enviar
- **Esc** — detener la generación en curso
- Botón **▸ send** — enviar con ratón
- Botón **◼ stop** — aparece durante la generación, detiene el streaming

### Historial persistente
El historial de conversación se guarda automáticamente en `localStorage` bajo la clave `nw-ai-history`. Sobrevive al cerrar y abrir el panel, y al reiniciar la app.

- Máximo 50 mensajes guardados (los más recientes)
- Botón **clear** en el header elimina el historial completamente
- Cada mensaje tiene timestamp y estimación de tokens

### Sugerencias rápidas en pantalla vacía
Cuando no hay historial, el panel muestra sugerencias clicables para empezar:
- `/code explícame este error: [pega el error]`
- `/git cómo revierto el último commit sin perder cambios`
- `/solidity revisa esta función para reentrancy`
- `/explain qué es un MEV flashloan attack`

Al hacer clic, el texto se carga en el input listo para editar y enviar.

---

## 8. Panel METRICS

El panel de métricas se despliega desde la parte inferior de la pantalla, justo encima de la TabBar. Se activa con `Alt+M` o el botón **◈ METRICS**.

Los datos se actualizan cada **3 segundos** via Tauri `invoke("run_powershell")` con una query WMI compacta que no interfiere con las terminales activas.

### Header
- `◈ METRICS` — título del panel
- `usuario@hostname` — detectado dinámicamente del sistema
- `AMD Ryzen 7 7800X3D · 31.17 GB RAM` — especificaciones del hardware
- `● live · 3s` — indicador de datos reales en tiempo real
- `◌ simulado` — aparece si Tauri invoke no está disponible (modo preview)

### Sección CPU
- Porcentaje de uso con número grande
- Sparkline de los últimos 50 puntos (≈ 2.5 minutos de historia)
- Barra de progreso delgada (2px) con cambio de color automático

### Sección MEMORY
- Porcentaje de uso + GB usados / GB totales
- Sparkline de los últimos 50 puntos
- Barra de progreso con alertas de color

### Sección DISK
Todos los drives del sistema detectados automáticamente via `Get-PSDrive -PSProvider FileSystem`:
- Nombre del drive (C:, D:, E:, F:, H:, T:...)
- GB usados / GB totales
- Porcentaje de uso
- Barra inline de 2px por cada drive
- **Distribución en 2 columnas** cuando hay más de 4 drives

**Alertas de color:**
- Verde — uso normal (<75%)
- Amarillo — atención (75%–90%)
- Rojo/magenta — crítico (>90%)

### Sección NETWORK
- **↓ RX** — tráfico recibido en KB/s o MB/s
- **↑ TX** — tráfico enviado en KB/s o MB/s
- Sparkline del tráfico RX de los últimos 50 puntos

### Modo simulado
Si Tauri invoke no está disponible (desarrollo en browser puro, sin compilar), el panel muestra datos animados realistas basados en funciones seno + ruido aleatorio, para poder trabajar en el diseño sin necesitar la app compilada.

---

## 9. Panel INFRA — sidebar izquierdo

El panel INFRA ocupa el lado izquierdo y **siempre llega desde el TitleBar hasta el MetricsPanel/TabBar**, independientemente del estado del panel AI. Se activa con `Alt+I` o el botón **◈ INFRA** en la TabBar (se ilumina en magenta cuando está activo).

### SSH Servers
Lista de servidores SSH configurados con estado de conexión:

| Servidor | IP | Estado |
|----------|-----|--------|
| Beelink | 192.168.1.139 | ONLINE / OFFLINE |
| Localhost | 127.0.0.1 | ONLINE / OFFLINE |

El dot rojo indica OFFLINE, verde indica ONLINE. El estado se actualiza periódicamente.

Para conectar al Beelink desde la terminal puedes usar el shortcut `bee` del dashboard.

### Puertos activos
Lista de puertos en uso detectados automáticamente con etiquetas descriptivas:

| Puerto | Etiqueta |
|--------|---------|
| `:3000` | React/Node |
| `:4000` | GraphQL |
| `:5173` | Vite dev |
| `:7777` | PTY server |

Los puertos se detectan en tiempo real. Al arrancar un servidor de desarrollo, aparece automáticamente en esta lista.

### Kubernetes
Estado de `kubectl`. Muestra:
- `Conectando...` — intentando conectar con el cluster
- `kubectl no disponible` — kubectl no instalado o sin cluster configurado
- Nombre del contexto activo si hay cluster disponible

### Terraform
Detecta archivos `.tfstate` en el directorio de trabajo. Muestra:
- `No se encontraron .tfstate` — sin infraestructura Terraform activa
- Lista de archivos de estado encontrados

### GitHub
Últimos commits del repositorio actual (directorio de trabajo):
- Nombre del commit
- Tiempo relativo (`1h ago`, `2h ago`, `15h ago`)

Si no hay repositorio Git en el directorio actual, la sección aparece vacía.

---

## 10. Panel CRYPTO / NETWATCH — sidebar derecho

El panel CRYPTO ocupa el lado derecho con la misma altura que el INFRA. Se activa con `Alt+P` o el botón **◈ CRYPTO** en la TabBar (se ilumina en cyan cuando está activo).

El panel tiene dos pestañas en la cabecera: **NETWATCH** (datos del sistema) y puede alternar entre ellas.

### SISTEMA
- **UPTIME** — tiempo que lleva la app abierta (`HH:MM:SS`)
- **HORA** — reloj en tiempo real (`HH:MM`)

### CRYPTO
Precios en tiempo real actualizados periódicamente:

| Asset | Dato | Ejemplo |
|-------|------|---------|
| BTC | Precio USD + cambio 24h | $73,751 · -0.03% 24h |
| ETH | Precio USD + cambio 24h | $2,318 · +1.72% 24h |

Los cambios positivos se muestran en verde, los negativos en rojo.

### GAS (GWEI)
Estimaciones de gas de la red Ethereum:
- **slow** — transacción barata, confirmación lenta
- **std** — estándar, balance precio/velocidad
- **fast** — confirmación rápida, más caro

Los valores muestran `?` cuando no hay conexión con la API de gas.

### DOCKER
Lista de contenedores Docker activos. Muestra nombre, imagen y estado. Si Docker no está corriendo: `No disponible`.

### MEV BOTS
Estado en tiempo real de los bots MEV en producción:

| Bot | Red | Estado |
|-----|-----|--------|
| MEV-ETH-Main | Ethereum Mainnet | ONLINE / OFFLINE |
| MEV-BSC-Flash | Binance Smart Chain | ONLINE / OFFLINE |
| MEV-ARB-Snipe | Arbitrum | ONLINE / OFFLINE |

Cada bot muestra:
- Dot verde (ONLINE) o rojo (OFFLINE)
- Red en la que opera
- `last tx Xm ago` — tiempo desde la última transacción ejecutada

---

## 11. Atajos de teclado — referencia completa

### Navegación global

| Atajo | Acción |
|-------|--------|
| `Alt+A` | Abrir / cerrar panel AI |
| `Alt+M` | Abrir / cerrar panel Metrics |
| `Alt+I` | Abrir / cerrar panel INFRA |
| `Alt+P` | Abrir / cerrar panel CRYPTO |
| `Alt+T` | Nueva pestaña PowerShell |
| `Alt+W` | Cerrar pestaña activa |
| `Alt+D` | Ir al Dashboard |
| `Alt+1` a `Alt+9` | Saltar a la pestaña por número |

### En el panel AI

| Atajo | Acción |
|-------|--------|
| `Enter` | Enviar mensaje |
| `Shift+Enter` | Nueva línea en el mensaje |
| `Esc` | Detener generación en curso |

### En la terminal (PowerShell profile)

| Atajo | Acción |
|-------|--------|
| `Tab` | Autocompletar comando o ruta |
| `→` (flecha derecha) | Aceptar sugerencia PSReadLine |
| `Ctrl+R` | Búsqueda en historial con Fzf |
| `Ctrl+T` | Búsqueda interactiva de archivos con Fzf |
| `Ctrl+C` | Cancelar comando en ejecución |

---

## 12. Configuración de providers AI

### Ollama (recomendado para uso local)

```powershell
# Instalar Ollama
winget install Ollama.Ollama

# Descargar modelos
ollama pull llama3.2        # Modelo general, rápido
ollama pull codellama       # Especializado en código
ollama pull qwen2.5-coder  # Especializado en código, muy bueno
ollama pull mistral         # Modelo alternativo general

# Ver modelos instalados
ollama list
```

NETWATCH detecta automáticamente los modelos instalados y los muestra en el selector.

### Gemini CLI

1. Obtén una API key en [Google AI Studio](https://aistudio.google.com/)
2. Configúrala en NETWATCH:
```javascript
// Abre DevTools en NETWATCH (si está disponible) o usa la terminal
localStorage.setItem('nw-gemini-key', 'TU_API_KEY_AQUI')
```

### Claude API

1. Obtén una API key en [console.anthropic.com](https://console.anthropic.com/)
2. Configúrala en NETWATCH:
```javascript
localStorage.setItem('nw-claude-key', 'TU_API_KEY_AQUI')
```

---

## 13. Comandos propios `nw`

NETWATCH tiene un sistema de comandos propios que se pueden ejecutar desde cualquier terminal escribiendo `nw` seguido del subcomando.

```powershell
nw help     # Lista todos los comandos disponibles
nw ai       # Abre el panel AI directamente desde la terminal
```

Los comandos `nw` se interceptan antes de llegar al shell — no son comandos de PowerShell, son propios del sistema NETWATCH.

---

## 14. PowerShell profile — comandos extra

El perfil de PowerShell de NETWATCH (Cyberpunk2077 theme) añade los siguientes comandos y alias:

### Navegación rápida
```powershell
z nombre-directorio    # Salta al directorio más frecuente que coincida
                       # Ejemplo: z projects → va a C:\Cursos\Projects
```

### Búsqueda con Fzf
```powershell
Ctrl+T    # Búsqueda interactiva de archivos en el directorio actual
Ctrl+R    # Búsqueda interactiva en el historial de comandos
```

### Shortcuts de apps
```powershell
n         # Abrir Notion
o         # Abrir Obsidian
g         # Abrir Gmail en el navegador
vsc       # Abrir VS Code (directorio actual)
proj      # Abrir VS Code en C:\Users\Heo\Source\Repos
bee       # SSH → Beelink (ssh heo@192.168.1.x)
help-ps   # Ver todos los alias y comandos disponibles
```

### Autocompletado inteligente
PSReadLine está configurado para mostrar sugerencias en gris basadas en el historial de comandos. Acepta la sugerencia completa con la flecha derecha `→`, o acepta solo una palabra con `Ctrl+→`.

---

*NETWATCH OS v2.077 · Héctor Oviedo · Zaragoza, España*
