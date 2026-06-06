import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

export default function PaymentPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const params = searchParams.toString()

  const handleSkip = () => {
    toast.success(t('onboarding.payment.trialStarted'))
    navigate('/register/account-options' + (params ? '?' + params : ''))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-lg mx-auto px-4 py-12 sm:py-20">
        <Link
          to="/register/billing"
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('onboarding.payment.title')}
          </h1>
          <p className="mt-3 text-gray-500 dark:text-gray-400 text-lg">
            {t('onboarding.payment.subtitle')}
          </p>

          <div className="mt-10 p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {t('onboarding.payment.trialTitle')}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                {t('onboarding.payment.trialDesc')}
              </p>
            </div>

            <div className="mt-8 space-y-3">
              <button
                onClick={handleSkip}
                className="w-full py-3 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors shadow-sm"
              >
                {t('onboarding.payment.startTrial')}
              </button>
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                {t('onboarding.payment.noCard')}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
