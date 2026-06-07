import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { isElectron } from '../lib/adapters/storageConfig'

export default function Titlebar() {
  const { t } = useTranslation()

  const handleRefresh = useCallback(() => {
    window.location.reload()
  }, [])

  const handleCheckUpdates = useCallback(async () => {
    if (typeof window.gc?.checkForUpdates === 'function') {
      await window.gc.checkForUpdates()
    }
  }, [])

  if (!isElectron()) return null

  return (
    <div
      className="fixed top-0 start-0 end-0 z-[9999] h-[38px] flex items-center bg-gray-900 dark:bg-gray-950 border-b border-gray-700 select-none"
      style={{ WebkitAppRegion: 'drag' }}
    >
      <div className="flex items-center gap-1 px-2" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={handleRefresh}
          className="flex items-center justify-center w-8 h-7 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors text-base"
          title={t('common.refresh') || 'تحديث'}
        >
          ↺
        </button>
        <button
          onClick={handleCheckUpdates}
          className="flex items-center justify-center w-8 h-7 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors text-base"
          title={t('update.check') || 'التحديثات'}
        >
          ⟳
        </button>
      </div>
    </div>
  )
}
