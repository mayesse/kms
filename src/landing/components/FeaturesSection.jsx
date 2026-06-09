import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

const features = [
  { key: 'pos', icon: '🛒' },
  { key: 'inventory', icon: '📦' },
  { key: 'reports', icon: '📊' },
  { key: 'branches', icon: '🏢' },
  { key: 'staff', icon: '👥' },
  { key: 'customers', icon: '🤝' },
  { key: 'batches', icon: '🏷️' },
  { key: 'promotions', icon: '🎯' },
  { key: 'appointments', icon: '📅' },
  { key: 'delivery', icon: '🚚' },
  { key: 'tables', icon: '🪑' },
  { key: 'kitchen', icon: '🔥' },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

export default function FeaturesSection() {
  const { t } = useTranslation()
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="features" className="py-20 lg:py-28 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white"
          >
            {t('landing.features.title')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-lg text-gray-600 dark:text-gray-400"
          >
            {t('landing.features.subtitle')}
          </motion.p>
        </div>

        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feat) => (
            <motion.div
              key={feat.key}
              variants={cardVariants}
              className="group relative p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 hover:border-emerald-200 dark:hover:border-emerald-700 hover:shadow-lg hover:shadow-emerald-500/5 dark:hover:shadow-emerald-500/10 transition-all duration-300 hover:-translate-y-1"
            >
              <span className="text-3xl block mb-4">{feat.icon}</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t(`landing.features.${feat.key}`)}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {t(`landing.features.${feat.key}Desc`)}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
