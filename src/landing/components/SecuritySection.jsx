import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

const items = [
  { key: 'encryption', icon: '🔒' },
  { key: 'rls', icon: '🛡️' },
  { key: 'backups', icon: '💾' },
  { key: 'monitoring', icon: '👁️' },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
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

export default function SecuritySection() {
  const { t } = useTranslation()

  return (
    <section id="security" className="py-20 lg:py-28 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white"
          >
            {t('landing.security.title')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-lg text-gray-600 dark:text-gray-400"
          >
            {t('landing.security.subtitle')}
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {items.map((item) => (
            <motion.div
              key={item.key}
              variants={cardVariants}
              className="p-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 hover:border-emerald-200 dark:hover:border-emerald-700 hover:shadow-md transition-all duration-300"
            >
              <span className="text-3xl block mb-4">{item.icon}</span>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                {t(`landing.security.${item.key}`)}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {t(`landing.security.${item.key}Desc`)}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
