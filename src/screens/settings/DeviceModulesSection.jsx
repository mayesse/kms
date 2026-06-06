import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { useDeviceModulesStore } from '../../stores/deviceModulesStore'
import { BUSINESS_TYPES, getVisibleModules } from '../../utils/businessTypes'
import { ALL_MODULES } from '../../utils/businessTypes'

export default function DeviceModulesSection() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const businessType = useAuthStore(s => s.businessType)
  const {
    configured, locked, isConfigured, setIsConfigured,
    overrides, load, setOverride, removeOverride,
  } = useDeviceModulesStore()
  useDeviceModulesStore(s => s._v)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (storeId) load(storeId)
  }, [storeId, load])

  const baseModules = businessType ? getVisibleModules(businessType) : []
  const overrideMap = {}
  for (const ov of overrides) overrideMap[ov.module_key] = ov

  function isVisible(moduleKey) {
    if (!configured || !overrides.length) return baseModules.includes(moduleKey)
    const ov = overrideMap[moduleKey]
    return ov === undefined ? baseModules.includes(moduleKey) : ov.visible !== false
  }

  function getOverrideState(moduleKey) {
    const ov = overrideMap[moduleKey]
    if (!ov) return null
    return ov.visible
  }

  async function toggleModule(moduleKey, currentlyVisible) {
    setSaving(true)
    if (!configured) {
      await setOverride(storeId, moduleKey, !currentlyVisible)
    } else {
      const ov = getOverrideState(moduleKey)
      if (ov === null) {
        await setOverride(storeId, moduleKey, false)
      } else {
        await removeOverride(storeId, moduleKey)
      }
    }
    setSaving(false)
    setDirty(true)
  }

  async function handleConfigure() {
    if (locked) return
    setIsConfigured(true, storeId)
    await load(storeId)
    setDirty(true)
  }

  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
        {t('settings.deviceModules')}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t('settings.deviceModulesDesc')}
      </p>

      <label className={`flex items-center gap-3 py-2 ${locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
        <input
          type="checkbox"
          checked={configured}
          onChange={handleConfigure}
          disabled={locked}
          className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {t('settings.enableDeviceConfig')}
        </span>
      </label>
      {locked && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-700 dark:text-amber-300">
          🔒 {t('settings.deviceModulesLocked')}
        </div>
      )}

      {configured && (
        <div className="space-y-1 max-h-64 overflow-y-auto border rounded-lg p-3 dark:border-gray-600">
          {ALL_MODULES.map(mk => {
            const isEnabledByDefault = baseModules.includes(mk)
            const ov = getOverrideState(mk)
            const visible = ov === null ? isEnabledByDefault : ov
            if (!isEnabledByDefault && ov === null) return null
            return (
              <label key={mk} className="flex items-center justify-between py-1.5 cursor-pointer">
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  {t(`moduleNames.${mk}`)}
                  {!isEnabledByDefault && <span className="text-xs text-orange-500 me-1">(+{t('common.added')})</span>}
                </span>
                <input
                  type="checkbox"
                  checked={visible}
                  disabled={saving}
                  onChange={() => toggleModule(mk, visible)}
                  className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
              </label>
            )
          })}
        </div>
      )}

      {dirty && (
        <p className="text-xs text-amber-500">
          {t('settings.deviceModulesReload')}
        </p>
      )}
    </div>
  )
}
