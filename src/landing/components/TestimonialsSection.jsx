import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

export default function TestimonialsSection() {
  const { t } = useTranslation()
  const items = t('landing.testimonials.items', { returnObjects: true })
  const [index, setIndex] = useState(0)

  if (!items || items.length === 0) return null

  const prev = () => setIndex((i) => (i === 0 ? items.length - 1 : i - 1))
  const next = () => setIndex((i) => (i === items.length - 1 ? 0 : i + 1))

  const current = items[index]

  return (
    <section className="py-20 lg:py-28 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white"
          >
            {t('landing.testimonials.title')}
          </motion.h2>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="text-center px-4"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-5">
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {current.name?.charAt(0) || 'G'}
                  </span>
                </div>
                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed italic mb-6">
                  &ldquo;{current.quote}&rdquo;
                </p>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{current.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{current.role}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={prev}
                className="p-2 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <div className="flex gap-2">
                {items.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === index ? 'bg-emerald-500 w-6' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={next}
                className="p-2 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
