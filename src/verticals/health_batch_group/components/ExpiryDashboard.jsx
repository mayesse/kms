import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../stores/authStore'
import { batchRepository } from '../../../repositories/batchRepository'
import LoadingSkeleton from '../../../components/LoadingSkeleton'
import EmptyState from '../../../components/EmptyState'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { formatCurrency, formatDate } from '../../../utils/format'
import { useTranslation } from 'react-i18next'
import { ExclamationTriangleIcon, CheckCircleIcon, TrashIcon } from '@heroicons/react/24/outline'

export default function ExpiryDashboard() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [confirmDiscard, setConfirmDiscard] = useState(null)
  const [filter, setFilter] = useState('all')

  const { data: batches, isLoading } = useQuery({
    queryKey: ['expiryDashboard', storeId, filter],
    queryFn: () => {
      const days = filter === 'critical' ? 7 : filter === 'warning' ? 30 : 90
      return batchRepository.getExpiring(storeId, days)
    },
    enabled: !!storeId,
  })

  const discardMutation = useMutation({
    mutationFn: async (batchId) => {
      await batchRepository.updateQty(storeId, batchId, 0)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expiryDashboard'] })
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      toast.success('تم التخلص من الدفعة')
      setConfirmDiscard(null)
    },
    onError: () => toast.error('فشل التحديث'),
  })

  const getDaysUntilExpiry = (dateStr) => {
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const critical = (batches || []).filter(b => getDaysUntilExpiry(b.expiry_date) <= 7)
  const warning = (batches || []).filter(b => {
    const days = getDaysUntilExpiry(b.expiry_date)
    return days > 7 && days <= 30
  })
  const safe = (batches || []).filter(b => getDaysUntilExpiry(b.expiry_date) > 30)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-lg font-semibold ${filter === 'all' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
          الكل ({batches?.length || 0})
        </button>
        <button onClick={() => setFilter('critical')}
          className={`px-3 py-1 rounded-lg font-semibold ${filter === 'critical' ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
          خطير ({critical.length})
        </button>
        <button onClick={() => setFilter('warning')}
          className={`px-3 py-1 rounded-lg font-semibold ${filter === 'warning' ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
          تحذير ({warning.length})
        </button>
      </div>

      {isLoading ? <LoadingSkeleton count={5} /> : (
        <div className="space-y-2">
          {batches?.length === 0 ? (
            <EmptyState icon="✅" title="لا توجد دفعات منتهية" subtitle="جميع الدفعات ضمن تاريخ الصلاحية" />
          ) : (
            batches?.map((batch, i) => {
              const days = getDaysUntilExpiry(batch.expiry_date)
              const isExpired = days < 0
              return (
                <motion.div key={batch.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`p-3 rounded-xl border ${
                    isExpired || days <= 7
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : days <= 30
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-50">{batch.products?.name || '—'}</p>
                      <p className="text-xs text-gray-500" dir="ltr">{batch.lot_number}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{batch.quantity}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isExpired || days <= 7 ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                          : days <= 30 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                          : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                      }`}>
                        {isExpired ? `منذ ${Math.abs(days)} يوم` : `${days} يوم`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-gray-400">صلاحية: {formatDate(batch.expiry_date)}</span>
                    {isExpired && (
                      <button onClick={() => setConfirmDiscard(batch.id)}
                        className="flex items-center gap-1 text-[11px] text-red-600 font-semibold active:scale-90 transition-transform">
                        <TrashIcon className="h-3 w-3" /> التخلص
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDiscard}
        onClose={() => setConfirmDiscard(null)}
        onConfirm={() => discardMutation.mutate(confirmDiscard)}
        title="التخلص من الدفعة"
        message="هل أنت متأكد؟ سيتم تصفير الكمية."
      />
    </motion.div>
  )
}
