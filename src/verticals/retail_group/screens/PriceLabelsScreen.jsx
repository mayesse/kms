import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import PriceLabelPrint from '../components/PriceLabelPrint'
import BulkPriceEditor from '../components/BulkPriceEditor'

const TABS = [
  { value: 'print', label: 'طباعة بطاقات' },
  { value: 'bulk', label: 'تعديل أسعار' },
]

export default function PriceLabelsScreen() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('print')

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">بطاقات الأسعار</h1>
      </header>
      <div className="px-4 pt-3 pb-1 flex gap-2">
        {TABS.map(t => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.value
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>
      <main className="p-4">
        {tab === 'print' ? <PriceLabelPrint /> : <BulkPriceEditor />}
      </main>
    </motion.div>
  )
}
