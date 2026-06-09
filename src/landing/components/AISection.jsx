import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

export default function AISection() {
  const { t } = useTranslation()

  const aiFeatures = [
    { icon: '📈', titleKey: 'landing.aiSection.feature1Title', descKey: 'landing.aiSection.feature1Desc' },
    { icon: '🔮', titleKey: 'landing.aiSection.feature2Title', descKey: 'landing.aiSection.feature2Desc' },
    { icon: '💡', titleKey: 'landing.aiSection.feature3Title', descKey: 'landing.aiSection.feature3Desc' },
    { icon: '📊', titleKey: 'landing.aiSection.feature4Title', descKey: 'landing.aiSection.feature4Desc' },
  ]

  return (
    <section id="ai" className="py-20 lg:py-28 bg-gradient-to-br from-emerald-50 to-white dark:from-gray-900 dark:to-gray-900 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
              {t('landing.features.ai')}
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('landing.aiSection.title')}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
              {t('landing.aiSection.subtitle')}
            </p>
            <div className="space-y-5">
              {aiFeatures.map((feat, i) => (
                <motion.div
                  key={feat.titleKey}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <span className="text-2xl shrink-0 mt-0.5">{feat.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t(feat.titleKey)}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t(feat.descKey)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 aspect-square">
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="w-full space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-xs text-gray-400 font-mono">{t('landing.aiSection.mockupLabel')}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-2xl font-bold text-emerald-400">+32%</div>
                      <div className="text-xs text-gray-400 mt-1">{t('landing.aiSection.revenueGrowth')}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-2xl font-bold text-emerald-400">95%</div>
                      <div className="text-xs text-gray-400 mt-1">{t('landing.aiSection.forecastAccuracy')}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                      <div key={i} className="flex-1 h-20 flex items-end">
                        <div
                          className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t"
                          style={{ height: `${h}%` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
