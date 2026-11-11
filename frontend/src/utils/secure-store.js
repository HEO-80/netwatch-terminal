let _store = null;
let _ready = false;

const STORE_FILE = "netwatch-keys.json";

const LEGACY_MAP = {
  "gemini-key":   "nw-gemini-key",
  "claude-key":   "nw-claude-key",
  "github-token": "nw-github-token",
  "github-user":  "nw-github-user",
};

async function getStore() {
  if (_store && _ready) return _store;
  try {
    const { load } = await import("@tauri-apps/plugin-store");
    _store = await load(STORE_FILE, { autoSave: true });
    _ready = true;
    return _store;
  } catch {
    _store = null;
    _ready = false;
    return null;
  }
}

export async function secureGet(key) {
  const store = await getStore();
  if (store) {
    const val = await store.get(key);
    if (val !== null && val !== undefined) return val;
    const legacy = LEGACY_MAP[key];
    if (legacy) {
      const old = localStorage.getItem(legacy);
      if (old) {
        await store.set(key, old);
        localStorage.removeItem(legacy);
        return old;
      }
    }
    return "";
  }
  return localStorage.getItem(LEGACY_MAP[key] || `nw-${key}`) || "";
}

export async function secureSet(key, value) {
  const store = await getStore();
  if (store) {
    await store.set(key, value);
    const legacy = LEGACY_MAP[key];
    if (legacy) localStorage.removeItem(legacy);
    return;
  }
  localStorage.setItem(LEGACY_MAP[key] || `nw-${key}`, value);
}

export async function secureDelete(key) {
  const store = await getStore();
  if (store) {
    await store.delete(key);
    return;
  }
  localStorage.removeItem(LEGACY_MAP[key] || `nw-${key}`);
}

export async function getAllKeys() {
  const store = await getStore();
  if (store) {
    const entries = await store.entries();
    return Object.fromEntries(entries);
  }
  const result = {};
  for (const [k, legacy] of Object.entries(LEGACY_MAP)) {
    const v = localStorage.getItem(legacy);
    if (v) result[k] = v;
  }
  return result;
}

export function isSecureBackend() {
  return _ready && _store !== null;
}
