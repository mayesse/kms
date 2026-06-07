const CONFIG_KEY = 'gc_storage_config'

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
  return { mode: STORAGE_MODES.CLOUD }
}

export function setStorageConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
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
