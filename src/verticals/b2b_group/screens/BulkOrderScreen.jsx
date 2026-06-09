import { useState } from 'react'
import { motion } from 'framer-motion'
import BulkOrderEntry from '../components/BulkOrderEntry'
import InvoiceTemplate from '../components/InvoiceTemplate'
import { useTranslation } from 'react-i18next'

export default function BulkOrderScreen() {
  const { t } = useTranslation()
  const [lastPurchase, setLastPurchase] = useState(null)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">أمر شراء بالجملة</h1>
            {lastPurchase && (
              <p className="text-xs text-green-600 mt-0.5">✓ تم إنشاء الأمر</p>
            )}
          </div>
          {lastPurchase && (
            <button onClick={() => setLastPurchase(null)}
              className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold">
              جديد
            </button>
          )}
        </div>
      </header>

      <main className="p-4">
        {lastPurchase ? (
          <InvoiceTemplate sale={lastPurchase} onPrint={() => {}} onClose={() => setLastPurchase(null)} />
        ) : (
          <div className="card">
            <BulkOrderEntry onComplete={(purchase) => setLastPurchase(purchase)} />
          </div>
        )}
      </main>
    </motion.div>
  )
}
