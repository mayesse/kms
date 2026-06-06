import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import { usePurchaseStore } from '../../stores/purchaseStore'
import { purchaseRepository } from '../../repositories/purchaseRepository'
import { supplierRepository } from '../../repositories/supplierRepository'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import FilterChips from '../../components/FilterChips'
import Card from '../../components/Card'
import Badge from '../../components/Badge'
import { useTranslation } from 'react-i18next'
import { formatCurrency, formatDate } from '../../utils/format'
import NewPurchaseFlow from './components/NewPurchaseFlow'
import PurchaseDetailSheet from './components/PurchaseDetailSheet'
import SupplierDebts from './components/SupplierDebts'

function getPaymentStatus(purchase) {
  const paid = parseFloat(purchase.amount_paid || 0)
  const total = parseFloat(purchase.total_amount || 0)
  if (paid >= total) return 'paid'
  if (paid > 0) return 'partial'
  return 'unpaid'
}

function getPaymentBadge(status, t) {
  if (status === 'paid') return { variant: 'success', label: t('purchases.paid') }
  if (status === 'partial') return { variant: 'warning', label: t('purchases.partial') }
  return { variant: 'danger', label: t('purchases.unpaid') }
}

export default function PurchasesScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const { items: draftItems, supplierId: draftSupplierId } = usePurchaseStore()
  const [showNew, setShowNew] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const [showDebts, setShowDebts] = useState(false)
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [supplierFilter, setSupplierFilter] = useState('')

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['purchases', storeId, paymentFilter, supplierFilter],
    queryFn: () => purchaseRepository.getAll(storeId, {
      paymentStatus: paymentFilter === 'all' ? undefined : paymentFilter,
      supplierId: supplierFilter || undefined,
    }),
    enabled: !!storeId,
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', storeId],
    queryFn: () => supplierRepository.getAll(storeId),
    enabled: !!storeId,
  })

  // Totals summary
  const totalDebt = (purchases || []).reduce((s, p) => {
    const remaining = parseFloat(p.total_amount || 0) - parseFloat(p.amount_paid || 0)
    return s + Math.max(0, remaining)
  }, 0)

  const filterOptions = [
    { value: 'all', label: t('common.all') },
    { value: 'unpaid', label: t('purchases.unpaid') },
    { value: 'partial', label: t('purchases.partial') },
    { value: 'paid', label: t('purchases.paid') },
  ]
  const draftItemCount = draftItems.length
  const draftSupplierName = (suppliers || []).find(s => s.id === draftSupplierId)?.name

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('purchases.title')}</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowDebts(true)} className="btn-ghost text-sm text-amber-600">
              {t('purchases.supplierDebts')}
            </button>
            <button onClick={() => setShowNew(true)} className="btn-ghost text-green-600 font-semibold text-sm">
              + {t('purchases.new')}
            </button>
          </div>
        </div>

        {/* Supplier filter */}
        {suppliers?.length > 0 && (
          <select
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
            className="input-field text-sm h-10"
            dir="rtl"
          >
            <option value="">{t('purchases.allSuppliers')}</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        <FilterChips options={filterOptions} value={paymentFilter} onChange={setPaymentFilter} />
        {draftItemCount > 0 && (
          <button
            onClick={() => setShowNew(true)}
            className="w-full rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-start"
          >
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {t('purchases.draftSaved')}
            </p>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              {t('purchases.draftItemCount', { count: draftItemCount })}{draftSupplierName ? ` • ${draftSupplierName}` : ''}
            </p>
          </button>
        )}
      </header>

      {/* Debt summary banner */}
      {totalDebt > 0 && (
        <div className="mx-4 mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-center">
          <p className="text-xs text-red-600 dark:text-red-400">{t('purchases.totalDebt')}</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalDebt)}</p>
        </div>
      )}

      <main className="p-4 space-y-2">
        {isLoading ? <LoadingSkeleton count={5} /> :
         purchases?.length === 0 ? (
           <EmptyState icon="🛒" title={t('purchases.empty')}
             actionLabel={t('purchases.create')} onAction={() => setShowNew(true)} />
         ) :
         purchases.map((p, i) => {
           const status = getPaymentStatus(p)
            const badge = getPaymentBadge(status, t)
           const remaining = Math.max(0, parseFloat(p.total_amount) - parseFloat(p.amount_paid || 0))

           return (
             <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.03 }}>
               <Card onClick={() => setDetailId(p.id)}>
                 <div className="flex items-start justify-between">
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 mb-1">
                       <p className="font-semibold text-gray-900 dark:text-gray-50 truncate">
                          {p.suppliers?.name || t('purchases.unknownSupplier')}
                       </p>
                       <Badge variant={badge.variant}>{badge.label}</Badge>
                     </div>
                     <p className="text-xs text-gray-500">{formatDate(p.created_at)}</p>
                     {p.note && <p className="text-xs text-gray-400 mt-1 truncate">{p.note}</p>}
                   </div>
                   <div className="text-end shrink-0 ms-3">
                     <p className="font-bold text-green-600">{formatCurrency(p.total_amount)}</p>
                     {status !== 'paid' && (
                        <p className="text-xs text-red-500 mt-0.5">
                          {t('purchases.remaining')}: {formatCurrency(remaining)}
                        </p>
                      )}
                      {status === 'partial' && (
                        <p className="text-xs text-amber-500">
                          {t('purchases.paid')}: {formatCurrency(p.amount_paid || 0)}
                       </p>
                     )}
                   </div>
                 </div>

                 {/* Payment progress bar */}
                 {status !== 'paid' && (
                   <div className="mt-2">
                     <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                       <div
                         className={`h-full rounded-full transition-all ${status === 'partial' ? 'bg-amber-500' : 'bg-red-400'}`}
                         style={{ width: `${Math.min(100, (parseFloat(p.amount_paid || 0) / parseFloat(p.total_amount)) * 100)}%` }}
                       />
                     </div>
                   </div>
                 )}
               </Card>
             </motion.div>
           )
         })
        }
      </main>

      <NewPurchaseFlow isOpen={showNew} onClose={() => setShowNew(false)} />
      <PurchaseDetailSheet purchaseId={detailId} onClose={() => setDetailId(null)} />
      <SupplierDebts isOpen={showDebts} onClose={() => setShowDebts(false)} />
    </motion.div>
  )
}
