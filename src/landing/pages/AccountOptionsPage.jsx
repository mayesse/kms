import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { setStorageConfig, isElectron } from '../../lib/adapters/storageConfig'

const ACCOUNT_TYPES = [
  {
    id: 'hfsql',
    icon: '\uD83D\uDCC4',
    titleKey: 'onboarding.accountOptions.hfsql',
    descKey: 'onboarding.accountOptions.hfsqlDesc',
    ctaKey: 'onboarding.accountOptions.selectHfsql',
    badgeKey: 'onboarding.hfsqlSetup.desktopOnly',
  },
  {
    id: 'local',
    icon: '\uD83D\uDCBB',
    titleKey: 'onboarding.accountOptions.local',
    descKey: 'onboarding.accountOptions.localDesc',
    ctaKey: 'onboarding.accountOptions.selectLocal',
  },
  {
    id: 'cloud',
    icon: '\u2601\uFE0F',
    titleKey: 'onboarding.accountOptions.cloud',
    descKey: 'onboarding.accountOptions.cloudDesc',
    ctaKey: 'onboarding.accountOptions.selectCloud',
  },
]

export default function AccountOptionsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleSelect = (id) => {
    if (id === 'hfsql') {
      if (isElectron()) {
        navigate('/register/hfsql-setup')
      } else {
        toast(t('hfsqlSetup.desktopOnly'), { icon: '📄' })
      }
      return
    }
    if (id === 'local') {
      setStorageConfig({ mode: 'local' })
    } else {
      setStorageConfig({ mode: 'cloud' })
    }
    navigate('/app/auth/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-20">
        <Link
          to="/register"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-8 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          {t('common.back')}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white text-center">
            {t('onboarding.accountOptions.title')}
          </h1>
          <p className="mt-3 text-center text-gray-500 dark:text-gray-400 text-lg">
            {t('onboarding.accountOptions.subtitle')}
          </p>

          <div className="mt-12 grid sm:grid-cols-3 gap-6">
            {ACCOUNT_TYPES.map((type, i) => (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex flex-col"
              >
                <span className="text-4xl block mb-4">{type.icon}</span>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t(type.titleKey)}
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex-1 leading-relaxed">
                  {t(type.descKey)}
                </p>

                {type.id === 'cloud' && (
                  <p className="mt-4 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
                    {t('onboarding.accountOptions.cloudTrust')}
                  </p>
                )}

                {type.id === 'hfsql' && !isElectron() && (
                  <p className="mt-4 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                    {t('onboarding.hfsqlSetup.desktopOnly')}
                  </p>
                )}

                <button
                  onClick={() => handleSelect(type.id)}
                  className="mt-5 w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                >
                  {t(type.ctaKey)}
                </button>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16 text-center"
          >
            <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm max-w-md mx-auto">
              <span className="text-4xl">{'\u2705'}</span>
              <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
                {t('onboarding.accountOptions.done')}
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('onboarding.accountOptions.doneSubtitle')}
              </p>
              <Link
                to="/app/auth/login"
                className="mt-6 inline-block w-full py-3 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors shadow-sm"
              >
                {t('onboarding.accountOptions.goToLogin')}
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
