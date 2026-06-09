import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircleIcon, XCircleIcon, ServerStackIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { setStorageConfig, getStorageConfig, isHfsqlMode, isElectron } from '../../lib/adapters/storageConfig'

export default function HfsqlSection() {
  const { t } = useTranslation()
  const saved = getStorageConfig()
  const [host, setHost] = useState(saved?.connection?.host || '')
  const [port, setPort] = useState(saved?.connection?.port || '4900')
  const [database, setDatabase] = useState(saved?.connection?.database || '')
  const [username, setUsername] = useState(saved?.connection?.username || '')
  const [password, setPassword] = useState(saved?.connection?.password || '')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [active, setActive] = useState(isHfsqlMode())

  const handleTest = async () => {
    if (!host || !database) {
      toast.error(t('onboarding.hfsqlSetup.fillRequired'))
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      if (isElectron() && window.gc?.hfsql) {
        const result = await window.gc.hfsql.testConnection({ host, port: parseInt(port), database, username, password })
        if (result.success) {
          setTestResult('success')
          toast.success(t('onboarding.hfsqlSetup.testSuccess'))
        } else {
          setTestResult('error')
          toast.error(result.error || t('onboarding.hfsqlSetup.testFailed'))
        }
      } else {
        setTestResult('error')
        toast.error(t('onboarding.hfsqlSetup.testFailed'))
      }
    } catch {
      setTestResult('error')
    }
    setTesting(false)
  }

  const handleSave = () => {
    if (testResult !== 'success') {
      toast.error(t('onboarding.hfsqlSetup.testFirst'))
      return
    }
    const result = setStorageConfig({
      mode: 'hfsql',
      connection: { host, port: parseInt(port), database, username, password },
      setupComplete: true,
    })
    if (result.error) { toast.error(result.error); return }
    setActive(true)
    toast.success(t('onboarding.hfsqlSetup.saved'))
  }

  const handleDisconnect = () => {
    const result = setStorageConfig({ mode: 'cloud', setupComplete: true })
    if (result.error) { toast.error(result.error); return }
    setActive(false)
    setHost('')
    setPort('4900')
    setDatabase('')
    setUsername('')
    setPassword('')
    setTestResult(null)
    toast.success(t('settings.hfsqlDisconnected'))
  }

  const isDesktop = isElectron()

  return (
    <div className="space-y-5">
      {active ? (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4 flex items-start gap-3">
          <CheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              {t('settings.hfsqlConnected')}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              {host}:{port}/{database}
            </p>
          </div>
          <button
            onClick={handleDisconnect}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            {t('settings.hfsqlDisconnect')}
          </button>
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex items-start gap-3">
          <ServerStackIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {t('settings.hfsqlNotConnected')}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {t('settings.hfsqlNotConnectedDesc')}
            </p>
          </div>
        </div>
      )}

      {!isDesktop && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
            {t('onboarding.hfsqlSetup.desktopOnly')}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            {t('onboarding.hfsqlSetup.downloadApp')}
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('onboarding.hfsqlSetup.host')}
          </label>
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="192.168.1.100"
            className="w-full h-11 px-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('onboarding.hfsqlSetup.port')}
            </label>
            <input
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="4900"
              className="w-full h-11 px-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('onboarding.hfsqlSetup.database')}
            </label>
            <input
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder="GreenCrownDB"
              className="w-full h-11 px-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('onboarding.hfsqlSetup.username')}
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            className="w-full h-11 px-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('onboarding.hfsqlSetup.password')}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full h-11 px-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          />
        </div>
      </div>

      {testResult && (
        <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${
          testResult === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
        }`}>
          {testResult === 'success'
            ? <CheckCircleIcon className="h-5 w-5 shrink-0" />
            : <XCircleIcon className="h-5 w-5 shrink-0" />
          }
          {testResult === 'success' ? t('onboarding.hfsqlSetup.testSuccess') : t('onboarding.hfsqlSetup.testFailed')}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleTest}
          disabled={testing || !isDesktop}
          className="flex-1 py-3 px-4 border-2 border-green-500 text-green-600 dark:text-green-400 font-semibold rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? t('onboarding.hfsqlSetup.testing') : t('onboarding.hfsqlSetup.testConnection')}
        </button>

        <button
          onClick={handleSave}
          disabled={testResult !== 'success'}
          className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {t('onboarding.hfsqlSetup.saveAndContinue')}
        </button>
      </div>
    </div>
  )
}
