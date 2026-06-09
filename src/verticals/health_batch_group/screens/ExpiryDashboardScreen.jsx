import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../../stores/authStore'
import { drugRepository } from '../repositories/drugRepository'
import ExpiryDashboard from '../components/ExpiryDashboard'
import LoadingSkeleton from '../../../components/LoadingSkeleton'
import { useTranslation } from 'react-i18next'
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

export default function ExpiryDashboardScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)

  const { data: stats, isLoading } = useQuery({
    queryKey: ['drugStats', storeId],
    queryFn: () => drugRepository.getDrugStats(storeId),
    enabled: !!storeId,
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">لوحة الصلاحية</h1>
      </header>

      {isLoading ? <LoadingSkeleton count={3} /> : (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-2xl font-black text-gray-900 dark:text-gray-50">{stats?.totalProducts || 0}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">إجمالي المنتجات</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-3 border border-amber-200 dark:border-amber-800 text-center">
              <p className="text-2xl font-black text-amber-600">{stats?.lowStockCount || 0}</p>
              <p className="text-[11px] text-amber-600 mt-0.5">مخزون منخفض</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-3 border border-green-200 dark:border-green-800 text-center">
              <p className="text-xl font-black text-green-600">{stats?.stockValue?.toLocaleString() || 0}</p>
              <p className="text-[11px] text-green-600 mt-0.5">قيمة المخزون</p>
            </div>
          </div>

          <ExpiryDashboard />
        </div>
      )}
    </motion.div>
  )
}
