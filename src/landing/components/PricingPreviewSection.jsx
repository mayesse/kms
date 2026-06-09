import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { PRICING_TIERS } from '../utils/pricingData'

export default function PricingPreviewSection() {
  const { t } = useTranslation()

  return (
    <section className="py-20 lg:py-28 bg-white dark:bg-gray-900" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            {t('landing.pricing.title')}
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            {t('landing.pricing.subtitle')}
          </p>
        </motion.div>

        <div className="mt-6 max-w-lg mx-auto bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 text-center">
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
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
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
                    </div>
                  )}
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t(tier.descKey)}
                </p>

                <ul className="mt-6 space-y-3 flex-1">
                  {Array.isArray(features) && features.slice(0, 4).map((feat, fi) => (
                    <li key={fi} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <span className="shrink-0 text-emerald-500 mt-0.5">✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/app/auth/register"
                  className={`mt-8 w-full py-3 px-6 rounded-xl font-semibold text-sm transition-colors shadow-sm text-center ${
                    tier.popular
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : tier.id === 'enterprise'
                      ? 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                      : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {t(tier.ctaKey)}
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
