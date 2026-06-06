import { useSearchParams, Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

const PLAN_LABELS = {
  basic: 'onboarding.pricing.basic',
  professional: 'onboarding.pricing.professional',
  enterprise: 'onboarding.pricing.enterprise',
}

export default function SubscriptionPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const plan = searchParams.get('plan') || 'professional'
  const price = searchParams.get('price') || '2999'
  const period = searchParams.get('period') || 'monthly'
  const yearly = searchParams.get('yearly') === 'true'

  const planLabel = t(PLAN_LABELS[plan] || PLAN_LABELS.professional)
  const priceLabel = plan === 'basic' ? t('onboarding.pricing.free') : `${Number(price).toLocaleString()} DZD/${yearly ? 'yr' : 'mo'}`

  const handleConfirm = () => {
    navigate(`/register/billing?plan=${plan}&price=${price}&period=${period}&yearly=${yearly}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-lg mx-auto px-4 py-12 sm:py-20">
        <Link
          to="/register/pricing"
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
            {t('onboarding.subscribe.title')}
          </h1>
          <p className="mt-3 text-gray-500 dark:text-gray-400 text-lg">
            {t('onboarding.subscribe.subtitle', { plan: planLabel, price: priceLabel })}
          </p>

          <div className="mt-10 p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('onboarding.pricing.plan')}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{planLabel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('onboarding.pricing.monthly')}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {period === 'yearly' ? t('onboarding.pricing.yearly') : t('onboarding.pricing.monthly')}
                </span>
              </div>
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4 flex justify-between items-center">
                <span className="text-base font-semibold text-gray-900 dark:text-white">{t('pos.total')}</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{priceLabel}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleConfirm}
            className="mt-8 w-full py-3 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            {t('onboarding.subscribe.confirm')}
          </button>
        </motion.div>
      </div>
    </div>
  )
}
