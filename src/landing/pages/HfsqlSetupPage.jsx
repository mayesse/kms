import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { setStorageConfig, isElectron } from '../../lib/adapters/storageConfig'

export default function HfsqlSetupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [host, setHost] = useState('')
  const [port, setPort] = useState('4900')
  const [database, setDatabase] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

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
    setStorageConfig({
      mode: 'hfsql',
      connection: { host, port: parseInt(port), database, username, password },
    })
    toast.success(t('onboarding.hfsqlSetup.saved'))
    navigate('/app/auth/login')
  }

  const isDesktop = isElectron()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-lg mx-auto px-4 py-12 sm:py-20">
        <Link
          to="/register/account-options"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-8 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          {t('common.back')}
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 sm:p-8">
          <div className="text-center mb-6">
            <span className="text-4xl block mb-3">📄</span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('onboarding.hfsqlSetup.title')}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('onboarding.hfsqlSetup.subtitle')}
            </p>
          </div>

          {!isDesktop && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                {t('onboarding.hfsqlSetup.desktopOnly')}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
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
            <div className={`mt-4 flex items-center gap-2 text-sm p-3 rounded-xl ${
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

          <div className="mt-6 space-y-3">
            <button
              onClick={handleTest}
              disabled={testing || !isDesktop}
              className="w-full py-3 px-4 border-2 border-green-500 text-green-600 dark:text-green-400 font-semibold rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? t('onboarding.hfsqlSetup.testing') : t('onboarding.hfsqlSetup.testConnection')}
            </button>

            <button
              onClick={handleSave}
              disabled={testResult !== 'success'}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {t('onboarding.hfsqlSetup.saveAndContinue')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
