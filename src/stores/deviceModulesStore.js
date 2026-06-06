import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'device-fingerprint'
const CONFIGURED_KEY = 'device_configured'

function getDeviceFingerprint() {
  let fp = localStorage.getItem(STORAGE_KEY)
  if (!fp) {
    fp = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, fp)
  }
  return fp
}

export const useDeviceModulesStore = create((set, get) => ({
  deviceFingerprint: getDeviceFingerprint(),
  overrides: [],
  loaded: false,
  configured: localStorage.getItem(CONFIGURED_KEY) === 'true',
  locked: localStorage.getItem(CONFIGURED_KEY) === 'true',
  _v: 0,

  isConfigured: () => {
    return localStorage.getItem(CONFIGURED_KEY) === 'true'
  },

  isLocked: () => {
    return localStorage.getItem(CONFIGURED_KEY) === 'true'
  },

  /**
   * Locks the device config permanently (one-way).
   * Writes to localStorage + device_configs table in DB.
   * Once locked, cannot be unlocked — only reinstall (clear localStorage) can reset.
   */
  _lock: async (storeId) => {
    const fp = get().deviceFingerprint
    const { error } = await supabase
      .from('device_configs')
      .upsert({ store_id: storeId, device_fingerprint: fp }, { onConflict: 'store_id,device_fingerprint' })
    if (error) console.error('Failed to persist device lock:', error)
    localStorage.setItem(CONFIGURED_KEY, 'true')
    set(s => ({ configured: true, locked: true, _v: s._v + 1 }))
    return true
  },

  setIsConfigured: (val, storeId) => {
    if (get().locked) return
    if (val && storeId) {
      get()._lock(storeId)
    }
  },

  load: async (storeId) => {
    if (!storeId) return
    const fp = get().deviceFingerprint
    const [{ data, error }, { data: configData }] = await Promise.all([
      supabase
        .from('device_module_settings')
        .select('module_key, visible')
        .eq('store_id', storeId)
        .eq('device_fingerprint', fp),
      supabase
        .from('device_configs')
        .select('device_fingerprint')
        .eq('store_id', storeId)
        .eq('device_fingerprint', fp)
        .maybeSingle(),
    ])
    if (error) {
      console.error('Failed to load device module settings:', error)
      return
    }
    const isLocked = !!configData
    if (isLocked) localStorage.setItem(CONFIGURED_KEY, 'true')
    set(s => ({
      overrides: data || [],
      loaded: true,
      configured: s.configured || isLocked,
      locked: s.locked || isLocked,
      _v: s._v + 1,
    }))
  },

  getVisibleModules: (baseModules) => {
    const { overrides, configured } = get()
    if (!configured || overrides.length === 0) return baseModules
    const overrideMap = {}
    for (const ov of overrides) {
      overrideMap[ov.module_key] = ov
    }
    return baseModules.filter(m => {
      const ov = overrideMap[m]
      return ov === undefined || ov.visible !== false
    })
  },

  hasModuleOnDevice: (businessType, moduleId, baseHasModule) => {
    const { overrides, configured } = get()
    if (!configured || overrides.length === 0) return baseHasModule(businessType, moduleId)
    const ov = overrides.find(o => o.module_key === moduleId)
    if (ov !== undefined) return ov.visible !== false
    return baseHasModule(businessType, moduleId)
  },

  setOverride: async (storeId, moduleKey, visible) => {
    const { deviceFingerprint, locked } = get()
    if (!locked) {
      await get()._lock(storeId)
    }
    const { error } = await supabase
      .from('device_module_settings')
      .upsert({
        store_id: storeId,
        device_fingerprint: deviceFingerprint,
        module_key: moduleKey,
        visible,
      }, {
        onConflict: 'store_id,device_fingerprint,module_key',
      })
    if (error) {
      console.error('Failed to save device module override:', error)
      return false
    }
    set(s => {
      const idx = s.overrides.findIndex(o => o.module_key === moduleKey)
      const ov = { module_key: moduleKey, visible }
      if (idx >= 0) {
        const arr = [...s.overrides]
        arr[idx] = ov
        return { overrides: arr, _v: s._v + 1 }
      }
      return { overrides: [...s.overrides, ov], _v: s._v + 1 }
    })
    return true
  },

  removeOverride: async (storeId, moduleKey) => {
    const { deviceFingerprint, locked } = get()
    if (!locked) {
      await get()._lock(storeId)
    }
    const { error } = await supabase
      .from('device_module_settings')
      .delete()
      .eq('store_id', storeId)
      .eq('device_fingerprint', deviceFingerprint)
      .eq('module_key', moduleKey)
    if (error) {
      console.error('Failed to remove device module override:', error)
      return false
    }
    set(s => ({
      overrides: s.overrides.filter(o => o.module_key !== moduleKey),
      _v: s._v + 1,
    }))
    return true
  },
}))
