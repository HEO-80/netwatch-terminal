export const MODULE_DEFS = {
  // Panels
  "panels.infra":    { label: "INFRA",        category: "panel",   default: false, description: "SSH, puertos, K8s, Terraform" },
  "panels.crypto":   { label: "CRYPTO",       category: "panel",   default: false, description: "Precios BTC/ETH, gas, MEV" },
  "panels.tasks":    { label: "TASKS",        category: "panel",   default: false, description: "Kanban de tareas" },
  "panels.git":      { label: "GIT",          category: "panel",   default: false, description: "Repo, cambios, diff inline" },
  "panels.notes":    { label: "NOTES",        category: "panel",   default: false, description: "Notas rapidas, pin, export" },
  "panels.logs":     { label: "LOGS",         category: "panel",   default: false, description: "Logs del sistema, filtros" },
  "panels.settings": { label: "SETTINGS",     category: "panel",   default: false, description: "API keys, configuracion" },
  "panels.ai":       { label: "AI",           category: "panel",   default: false, description: "Chat con LLMs (Ollama/Gemini/Claude)" },
  "panels.metrics":  { label: "METRICS",      category: "panel",   default: true,  description: "CPU, RAM, disco en tiempo real" },

  // Features
  "features.palette":     { label: "Command Palette", category: "feature", default: true,  description: "Ctrl+Shift+P paleta de comandos" },
  "features.smartOutput": { label: "Smart Output",    category: "feature", default: true,  description: "Formateo inteligente de output" },
  "features.snippets":    { label: "Snippets",        category: "feature", default: true,  description: "nw snip: guardar y ejecutar snippets" },
  "features.dojo":        { label: "DOJO",            category: "feature", default: false, description: "Entrenamiento de comandos" },
  "features.notebook":    { label: "Notebook",        category: "feature", default: false, description: "Notebook interactivo" },
  "features.clipboard":   { label: "Clipboard",       category: "feature", default: true,  description: "nw clip: historial de clipboard" },
};

export const PRESETS = {
  minimal: {
    label: "Minimal",
    description: "Solo terminal — arranque ultra rapido",
    modules: {},
  },
  developer: {
    label: "Developer",
    description: "Terminal + Git + Metrics + Palette",
    modules: {
      "panels.git": true,
      "panels.metrics": true,
      "features.palette": true,
      "features.smartOutput": true,
      "features.snippets": true,
      "features.clipboard": true,
    },
  },
  sysadmin: {
    label: "SysAdmin",
    description: "Terminal + Infra + Metrics + Logs",
    modules: {
      "panels.infra": true,
      "panels.metrics": true,
      "panels.logs": true,
      "features.palette": true,
      "features.smartOutput": true,
      "features.snippets": true,
      "features.clipboard": true,
    },
  },
  full: {
    label: "Full",
    description: "Todo activado",
    modules: Object.fromEntries(
      Object.keys(MODULE_DEFS).map(k => [k, true])
    ),
  },
};

const CONFIG_KEY = "nw-module-config";

export function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function getDefaults() {
  const config = {};
  for (const [key, def] of Object.entries(MODULE_DEFS)) {
    config[key] = def.default;
  }
  return config;
}

export function applyPreset(presetName) {
  const preset = PRESETS[presetName];
  if (!preset) return null;
  const config = {};
  for (const key of Object.keys(MODULE_DEFS)) {
    config[key] = !!preset.modules[key];
  }
  config._preset = presetName;
  config._firstRunDone = true;
  saveConfig(config);
  return config;
}

export function isModuleEnabled(config, moduleKey) {
  if (!config) return MODULE_DEFS[moduleKey]?.default ?? false;
  return !!config[moduleKey];
}
