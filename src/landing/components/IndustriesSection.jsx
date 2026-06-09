import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'

const industries = [
  { key: 'supermarket', icon: '🏬' },
  { key: 'restaurant', icon: '🍽️' },
  { key: 'cafe', icon: '☕' },
  { key: 'fastfood', icon: '🍔' },
  { key: 'bakery', icon: '🥖' },
  { key: 'pharmacy', icon: '💊' },
  { key: 'clothing', icon: '👕' },
  { key: 'electronics', icon: '📱' },
  { key: 'car_parts', icon: '🚗' },
  { key: 'salon', icon: '💇' },
  { key: 'wholesale', icon: '📦' },
  { key: 'repair_shop', icon: '🔩' },
  { key: 'services', icon: '🔧' },
]

const chipVariants = {
  active: { scale: 1 },
  inactive: { scale: 1 },
}

export default function IndustriesSection() {
  const { t } = useTranslation()
  const [active, setActive] = useState('all')

  const filtered = active === 'all' ? industries : industries.filter((i) => i.key === active)

  return (
    <section id="industries" className="py-20 lg:py-28 bg-gray-50 dark:bg-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white"
          >
            {t('landing.industries.title')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-lg text-gray-600 dark:text-gray-400"
          >
            {t('landing.industries.subtitle')}
          </motion.p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {['all', ...industries.map((i) => i.key)].map((key) => (
            <motion.button
              key={key}
              variants={chipVariants}
              animate={active === key ? { scale: 1.05 } : { scale: 1 }}
              onClick={() => setActive(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                active === key
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600'
              }`}
            >
              {t(`landing.industries.${key}`)}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          >
            {filtered.map((ind) => (
              <motion.div
                key={ind.key}
                layout
                className="flex flex-col items-center p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-700 hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                <span className="text-3xl mb-3">{ind.icon}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 text-center">
                  {t(`landing.industries.${ind.key}`)}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
