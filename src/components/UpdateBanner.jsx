import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDownCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

export default function UpdateBanner() {
  const { t } = useTranslation()
  const [status, setStatus] = useState(null)
  const [progress, setProgress] = useState(0)
  const [version, setVersion] = useState('')

  useEffect(() => {
    if (typeof window.gc?.onUpdateStatus !== 'function') return
    const unsub = window.gc.onUpdateStatus((type, data) => {
      if (type === 'updateAvailable' || type === 'menuCheckUpdates') {
        setStatus('available')
        setVersion(data?.version || '')
      } else if (type === 'updateProgress') {
        setStatus('downloading')
        setProgress(data?.percent || 0)
      } else if (type === 'updateDownloaded') {
        setStatus('downloaded')
        setVersion(data?.version || '')
      } else if (type === 'updateError') {
        setStatus('error')
      }
    })
    return unsub
  }, [])

  const handleCheck = useCallback(async () => {
    if (typeof window.gc?.checkForUpdates !== 'function') return
    const result = await window.gc.checkForUpdates()
    if (result?.updateAvailable) {
      setStatus('available')
      setVersion(result?.info?.version || '')
    } else {
      setStatus('upToDate')
      setTimeout(() => setStatus(null), 3000)
    }
  }, [])

  const handleDownload = useCallback(async () => {
    if (typeof window.gc?.downloadUpdate !== 'function') return
    setStatus('downloading')
    await window.gc.downloadUpdate()
  }, [])

  const handleInstall = useCallback(() => {
    if (typeof window.gc?.installUpdate === 'function') window.gc.installUpdate()
  }, [])

  if (!status) return null

  return (
    <div className="fixed bottom-20 lg:bottom-4 end-4 z-50 max-w-sm w-full animate-slide-up">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4">
        {status === 'available' && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ArrowDownCircleIcon className="h-5 w-5 text-green-600 shrink-0" />
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {version ? t('update.available', { version }) : t('update.availableGeneric')}
              </p>
            </div>
            <button onClick={handleDownload} className="shrink-0 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors">
              {t('update.download')}
            </button>
          </div>
        )}
        {status === 'downloading' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ArrowPathIcon className="h-5 w-5 text-blue-600 animate-spin shrink-0" />
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('update.downloading')}</p>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-500 text-start">{Math.round(progress)}%</p>
          </div>
        )}
        {status === 'downloaded' && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ArrowDownCircleIcon className="h-5 w-5 text-green-600 shrink-0" />
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('update.downloaded')}</p>
            </div>
            <button onClick={handleInstall} className="shrink-0 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors">
              {t('update.install')}
            </button>
          </div>
        )}
        {status === 'upToDate' && (
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-500">{t('update.upToDate')}</p>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-red-600">{t('update.error')}</p>
            <button onClick={handleCheck} className="text-xs text-green-600 hover:underline">{t('common.retry')}</button>
          </div>
        )}
      </div>
    </div>
  )
}
