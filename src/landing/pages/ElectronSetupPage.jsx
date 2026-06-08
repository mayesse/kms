import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { setStorageConfig, STORAGE_MODES, isElectron } from '../../lib/adapters/storageConfig'
import { CloudIcon, ServerStackIcon } from '@heroicons/react/24/outline'

export default function ElectronSetupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mode, setMode] = useState('cloud')

  useEffect(() => {
    if (!isElectron()) {
      navigate('/', { replace: true })
    }
  }, [navigate])

  const handleContinue = () => {
    setStorageConfig({ mode: STORAGE_MODES.CLOUD, setupComplete: true })
    navigate('/', { replace: true })
  }

  const handleHfsql = () => {
    setStorageConfig({ mode: STORAGE_MODES.HFSQL, setupComplete: true })
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-8 text-center">
          <div className="text-5xl mb-4">👑</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('onboarding.electronSetup.welcome')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            {t('onboarding.electronSetup.subtitle')}
          </p>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-5 mb-6 text-start">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-800/40 flex items-center justify-center shrink-0 mt-0.5">
                <CloudIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  {t('onboarding.electronSetup.cloudTitle')}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  {t('onboarding.electronSetup.cloudDesc')}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleContinue}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors shadow-sm mb-3"
          >
            {t('onboarding.electronSetup.continue')}
          </button>

          <button
            onClick={handleHfsql}
            className="w-full py-3 px-4 border-2 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            <ServerStackIcon className="w-4 h-4" />
            {t('onboarding.electronSetup.hfsqlOption')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
