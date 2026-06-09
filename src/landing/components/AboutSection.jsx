import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

const highlights = [
  { icon: '🎓', key: 'about.academic' },
  { icon: '🇩🇿', key: 'about.local' },
  { icon: '💼', key: 'about.affordable' },
  { icon: '🛡️', key: 'about.secure' },
]

export default function AboutSection() {
  const { t } = useTranslation()

  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-emerald-50 to-white dark:from-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            {t('landing.about.title')}
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            {t('landing.about.subtitle')}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((item, i) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <div className="text-4xl mb-3">{item.icon}</div>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {t(`landing.${item.key}`)}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 max-w-2xl mx-auto text-center"
        >
          <p className="text-lg text-gray-600 dark:text-gray-300 italic leading-relaxed">
            &ldquo;{t('landing.about.quote')}&rdquo;
          </p>
        </motion.div>
      </div>
    </section>
  )
}
