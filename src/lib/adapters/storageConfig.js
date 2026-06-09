const CONFIG_KEY = 'gc_storage_config'
const ADMIN_CONFIG_KEY = 'gc_admin_storage_config'

const STORAGE_MODES = {
  CLOUD: 'cloud',
  LOCAL: 'local',
  HFSQL: 'hfsql',
}

export function getStorageConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  // Web users always default to CLOUD (real Supabase).
  // LOCAL mode is only for Electron/desktop with explicit setup.
  return { mode: STORAGE_MODES.CLOUD }
}

export function setStorageConfig(config) {
  const adminConfig = getAdminStorageConfig()
  if (adminConfig) {
    const mode = config.mode || STORAGE_MODES.LOCAL
    if (!isModeAllowed(mode)) {
      return { error: `Storage mode "${mode}" is not allowed by admin` }
    }
  }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  return { success: true }
}

export function getAdminStorageConfig() {
  try {
    const raw = localStorage.getItem(ADMIN_CONFIG_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

export function setAdminStorageConfig(config) {
  if (config) {
    localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(config))
  } else {
    localStorage.removeItem(ADMIN_CONFIG_KEY)
  }
}

export function isModeAllowed(mode) {
  const adminConfig = getAdminStorageConfig()
  if (!adminConfig) return true
  if (mode === STORAGE_MODES.CLOUD) return adminConfig.cloud_allowed !== false
  if (mode === STORAGE_MODES.LOCAL) return adminConfig.local_allowed !== false
  if (mode === STORAGE_MODES.HFSQL) return adminConfig.hfsql_allowed !== false
  return true
}

export function getStorageMode() {
  return getStorageConfig().mode
}

export function isHfsqlMode() {
  return getStorageMode() === STORAGE_MODES.HFSQL
}

export function isLocalMode() {
  return getStorageMode() === STORAGE_MODES.LOCAL
}

export function isCloudMode() {
  return getStorageMode() === STORAGE_MODES.CLOUD
}

export function isElectron() {
  return typeof window !== 'undefined' && window.gc?.platform
}

export function isAok() {
  return typeof window !== 'undefined' && window.__AOK_MODE__ === true
}

export function isDesktopApp() {
  return isElectron() || isAok()
}

export function getAppSource() {
  if (isElectron()) return 'electron'
  if (isAok()) return 'aok'
  return 'web'
}

export { STORAGE_MODES }
