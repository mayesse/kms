import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

const REGIONS = [
  { id: 'algeria', icon: '🇩🇿', titleKey: 'onboarding.region.algeria', descKey: 'onboarding.region.algeriaDesc', path: '/register/algeria', comingSoon: false },
  { id: 'italy', icon: '🇮🇹', titleKey: 'onboarding.regionAdditional.italy', descKey: 'onboarding.regionAdditional.italyDesc', comingSoon: true },
  { id: 'germany', icon: '🇩🇪', titleKey: 'onboarding.regionAdditional.germany', descKey: 'onboarding.regionAdditional.germanyDesc', comingSoon: true },
  { id: 'mena', icon: '🌍', titleKey: 'onboarding.regionAdditional.mena', descKey: 'onboarding.regionAdditional.menaDesc', comingSoon: true },
  { id: 'france', icon: '🇫🇷', titleKey: 'onboarding.regionAdditional.france', descKey: 'onboarding.regionAdditional.franceDesc', comingSoon: true },
  { id: 'canada', icon: '🇨🇦', titleKey: 'onboarding.regionAdditional.canada', descKey: 'onboarding.regionAdditional.canadaDesc', comingSoon: true },
]

export default function RegionSelect() {
  const { t } = useTranslation()
  const [notifyEmail, setNotifyEmail] = useState({})
  const [notifySent, setNotifySent] = useState({})

  const handleNotify = (regionId, e) => {
    e.preventDefault()
    const email = notifyEmail[regionId]
    if (!email || !email.includes('@')) return
    setNotifySent(prev => ({ ...prev, [regionId]: true }))
    toast.success(t('onboarding.regionAdditional.thankYou', { region: t(REGIONS.find(r => r.id === regionId).titleKey) }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-8 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          {t('app.name')}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white text-center">
            {t('onboarding.region.title')}
          </h1>
          <p className="mt-3 text-center text-gray-500 dark:text-gray-400 text-lg">
            {t('onboarding.region.subtitle')}
          </p>

          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {REGIONS.map((region, i) => (
              <motion.div
                key={region.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                {region.comingSoon ? (
                  <div className="block p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                    <span className="text-4xl block mb-4">{region.icon}</span>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t(region.titleKey)}
                      </h3>
                      <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full">
                        {t('onboarding.regionAdditional.comingSoon')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                      {t(region.descKey)}
                    </p>
                    {notifySent[region.id] ? (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        ✅ {t('onboarding.regionAdditional.thankYou', { region: t(region.titleKey) })}
                      </p>
                    ) : (
                      <form onSubmit={(e) => handleNotify(region.id, e)} className="flex gap-2">
                        <input
                          type="email"
                          value={notifyEmail[region.id] || ''}
                          onChange={(e) => setNotifyEmail(prev => ({ ...prev, [region.id]: e.target.value }))}
                          placeholder={t('onboarding.regionAdditional.emailPlaceholder')}
                          className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                          required
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors shrink-0"
                        >
                          {t('onboarding.regionAdditional.notifyMe')}
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <Link
                    to={region.path}
                    className="block p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-600 transition-all duration-200 group"
                  >
                    <span className="text-4xl block mb-4">{region.icon}</span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {t(region.titleKey)}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {t(region.descKey)}
                    </p>
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
