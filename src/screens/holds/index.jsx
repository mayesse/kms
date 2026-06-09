import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { usePosStore } from '../../stores/posStore'
import { holdRepository } from '../../repositories/holdRepository'
import SearchInput from '../../components/SearchInput'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import ConfirmDialog from '../../components/ConfirmDialog'
import { formatCurrency, timeAgo, formatDate } from '../../utils/format'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

export default function HoldsScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const { restoreCart } = usePosStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showCancel, setShowCancel] = useState(null)

  const { data: holds, isLoading } = useQuery({
    queryKey: ['holds', storeId],
    queryFn: () => holdRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const filtered = (holds || []).filter(h =>
    !search || (h.customer_name || '').includes(search) || (h.note || '').includes(search)
  )

  const totalHeld = filtered.reduce((s, h) => s + parseFloat(h.total_amount || 0), 0)

  const handleRestore = async (hold) => {
    restoreCart(hold.items_snapshot)
    await holdRepository.cancel(storeId, hold.id)
    queryClient.invalidateQueries(['holds'])
    toast.success(t('holds.holdRestored'))
    navigate('/')
  }

  const handleCancel = async (holdId) => {
    await holdRepository.cancel(storeId, holdId)
    queryClient.invalidateQueries(['holds'])
    toast.success(t('holds.holdDeleted'))
    setShowCancel(null)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 space-y-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('holds.title')}</h1>
        <SearchInput value={search} onChange={setSearch} placeholder={t('holds.searchByCustomerOrNote')} />
      </header>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="mx-4 mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
          <p className="text-xs text-blue-600">{t('holds.totalHeld', { count: filtered.length })}</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(totalHeld)}</p>
        </div>
      )}

      <main className="p-4 space-y-2">
        {isLoading ? <LoadingSkeleton count={4} /> :
         filtered.length === 0 ? <EmptyState icon="📋" title={t('holds.empty')} /> :
         filtered.map((hold, i) => (
           <motion.div key={hold.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
             transition={{ delay: i * 0.03 }}>
             <div className="card">
               <div className="flex items-start justify-between mb-2">
                 <div className="flex-1 min-w-0">
                   <p className="font-bold text-gray-900 dark:text-gray-50">{hold.customer_name}</p>
                   <p className="text-xs text-gray-500">{formatDate(hold.created_at)} • {timeAgo(hold.created_at)}</p>
                   {hold.note && <p className="text-xs text-gray-400 mt-0.5">📝 {hold.note}</p>}
                 </div>
                 <div className="text-end shrink-0 ms-3">
                   <p className="font-bold text-blue-600">{formatCurrency(hold.total_amount)}</p>
                    <p className="text-xs text-gray-400">{t('holds.itemsCount', { count: hold.items_snapshot?.length || 0 })}</p>
                 </div>
               </div>

               {/* Items preview */}
               {hold.items_snapshot?.length > 0 && (
                 <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2 mb-3 space-y-0.5">
                   {hold.items_snapshot.slice(0, 4).map((item, j) => (
                     <div key={j} className="flex justify-between text-xs text-gray-500">
                       <span className="truncate">{item.product_name} × {item.qty}</span>
                       <span className="shrink-0 ms-2">{formatCurrency(item.unit_price * item.qty)}</span>
                     </div>
                   ))}
                   {hold.items_snapshot.length > 4 && (
                      <p className="text-xs text-gray-400 text-center">{t('holds.moreItems', { count: hold.items_snapshot.length - 4 })}</p>
                   )}
                 </div>
               )}

               {/* Actions */}
               <div className="flex gap-2">
                 <button onClick={() => handleRestore(hold)}
                   className="flex-1 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white active:scale-95 transition-transform">
                   🛒 {t('holds.restore')}
                 </button>
                 <button onClick={() => setShowCancel(hold.id)}
                   className="py-2 px-3 rounded-lg text-sm bg-red-100 dark:bg-red-900/30 text-red-600 active:scale-95 transition-transform">
                   ✕
                 </button>
               </div>
             </div>
           </motion.div>
         ))
        }
      </main>

      <ConfirmDialog
        isOpen={!!showCancel}
        onClose={() => setShowCancel(null)}
        onConfirm={() => handleCancel(showCancel)}
        message={t('holds.cancelHold')}
      />
    </motion.div>
  )
}

