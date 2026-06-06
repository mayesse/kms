import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { PRICING_TIERS } from '../utils/pricingData'

export default function PricingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleSelect = (tier) => {
    if (tier.id === 'enterprise') {
      window.location.href = 'mailto:sales@greencrown.store'
      return
    }
    navigate(`/register/subscribe?plan=${tier.id}`)
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.12, duration: 0.5 },
    }),
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-20">
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
            {t('onboarding.pricing.title')}
          </h1>
          <p className="mt-3 text-center text-gray-500 dark:text-gray-400 text-lg">
            {t('onboarding.pricing.subtitle')}
          </p>

          <div className="mt-8 max-w-lg mx-auto bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 text-center">
            <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
              ✨ {t('onboarding.payment.trialDesc')}
            </p>
          </div>

          <div className="mt-8 grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">
            {PRICING_TIERS.map((tier, i) => {
              const features = t(tier.featuresKey, { returnObjects: true })

              return (
                <motion.div
                  key={tier.id}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  className={`relative bg-white dark:bg-gray-800 rounded-2xl border shadow-sm p-8 flex flex-col ${
                    tier.popular
                      ? 'border-emerald-300 dark:border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-700 scale-[1.02] lg:scale-105'
                      : 'border-gray-100 dark:border-gray-700'
                  }`}
                >
                  {tier.popular && (
                    <span className="absolute -top-3 inset-x-0 mx-auto w-fit px-4 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                      {t('onboarding.pricing.popular')}
                    </span>
                  )}

                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t(tier.nameKey)}
                  </h3>

                  <div className="mt-4 mb-2">
                    {tier.id === 'enterprise' ? (
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        {t(tier.priceKey)}
                      </span>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-emerald-500">
                            {tier.offerPrice.toLocaleString()}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                            {tier.price.toLocaleString()} DZD
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 block">
                          {t('onboarding.pricing.lifetime')}
                        </span>
                        <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          {t('onboarding.pricing.placesLeft', { count: tier.placesLeft })}
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t(tier.descKey)}
                  </p>

                  <ul className="mt-6 space-y-3 flex-1">
                    {Array.isArray(features) && features.map((feat, fi) => (
                      <li key={fi} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <span className="shrink-0 text-emerald-500 mt-0.5">✓</span>
                        {feat}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSelect(tier)}
                    className={`mt-8 w-full py-3 px-6 rounded-xl font-semibold text-sm transition-colors shadow-sm ${
                      tier.popular
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        : tier.id === 'enterprise'
                        ? 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                        : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {t(tier.ctaKey)}
                  </button>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
