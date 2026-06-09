import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { PlusIcon, MinusIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { batchRepository } from '../../repositories/batchRepository'
import { productRepository } from '../../repositories/productRepository'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import ErrorState from '../../components/ErrorState'
import BottomSheet from '../../components/BottomSheet'
import FormInput from '../../components/FormInput'
import SearchInput from '../../components/SearchInput'
import Badge from '../../components/Badge'
import ConfirmDialog from '../../components/ConfirmDialog'
import { formatCurrency, formatDate } from '../../utils/format'
import { useTranslation } from 'react-i18next'

function getDaysUntilExpiry(dateStr) {
  const now = new Date()
  const expiry = new Date(dateStr)
  const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
  return diff
}

function ExpiryBadge({ days }) {
  const { t: t2 } = useTranslation()
  if (days < 0) {
    return <Badge variant="danger">{t2('batches.batchExpired', { days: Math.abs(days) })}</Badge>
  }
  if (days <= 7) {
    return <Badge variant="danger">{t2('batches.batchDays', { days })}</Badge>
  }
  if (days <= 15) {
    return <Badge variant="warning">{t2('batches.batchDays', { days })}</Badge>
  }
  return <Badge variant="info">{t2('batches.batchDays', { days })}</Badge>
}

export default function BatchesScreen() {
  const { t } = useTranslation()
  const location = useLocation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [tab, setTab] = useState(location.state?.tab || 'all')

  useEffect(() => {
    if (location.state?.tab) setTab(location.state.tab)
  }, [location.state?.tab])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [adjustId, setAdjustId] = useState(null)
  const [adjustDelta, setAdjustDelta] = useState(0)

  // New batch form state
  const [formProductId, setFormProductId] = useState('')
  const [formProductSearch, setFormProductSearch] = useState('')
  const [formLot, setFormLot] = useState('')
  const [formQty, setFormQty] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formExpiry, setFormExpiry] = useState('')
  const [formManufacture, setFormManufacture] = useState('')
  const [formError, setFormError] = useState('')

  const allQuery = useQuery({
    queryKey: ['batches', storeId, search],
    queryFn: () => batchRepository.getAll(storeId, search || undefined),
    enabled: !!storeId && tab === 'all',
  })

  const expiringQuery = useQuery({
    queryKey: ['batchesExpiring', storeId],
    queryFn: () => batchRepository.getExpiring(storeId, 30),
    enabled: !!storeId && tab === 'expiring',
  })

  const { data: productResults } = useQuery({
    queryKey: ['productSearch', storeId, formProductSearch],
    queryFn: () => productRepository.getAll(storeId, { search: formProductSearch }),
    enabled: !!storeId && formProductSearch.length > 0,
  })

  const createMutation = useMutation({
    mutationFn: (data) => batchRepository.create(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      queryClient.invalidateQueries({ queryKey: ['batchesExpiring'] })
      toast.success(t('batches.batchSaved'))
      resetForm()
      setShowForm(false)
    },
    onError: (err) => {
      toast.error(err.message || t('batches.batchSaveFailed'))
    },
  })

  const adjustMutation = useMutation({
    mutationFn: ({ id, delta }) => batchRepository.updateQty(storeId, id, delta),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      queryClient.invalidateQueries({ queryKey: ['batchesExpiring'] })
      toast.success(t('batches.batchQtyUpdated'))
    },
    onError: (err) => {
      toast.error(err.message || t('batches.batchQtyUpdateFailed'))
    },
  })

  function resetForm() {
    setFormProductId('')
    setFormProductSearch('')
    setFormLot('')
    setFormQty('')
    setFormPrice('')
    setFormExpiry('')
    setFormManufacture('')
    setFormError('')
  }

  function handleCreateBatch() {
    if (!formProductId || !formLot || !formQty || !formPrice || !formExpiry) {
      setFormError(t('batches.batchRequiredFields'))
      return
    }
    setFormError('')
    createMutation.mutate({
      product_id: formProductId,
      lot_number: formLot,
      quantity: parseFloat(formQty),
      purchase_price: parseFloat(formPrice),
      expiry_date: formExpiry,
      manufacture_date: formManufacture || null,
    })
  }

  function handleQuickAdjust(id) {
    if (adjustDelta === 0) return
    adjustMutation.mutate({ id, delta: adjustDelta })
    setAdjustId(null)
    setAdjustDelta(0)
  }

  const TABS = [
    { value: 'all', label: t('batches.allBatches') },
    { value: 'expiring', label: t('batches.expiringSoon') },
  ]

  const activeData = tab === 'all' ? allQuery : expiringQuery
  const batches = activeData.data || []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('batches.title')}</h1>
          <button onClick={() => setShowForm(true)} className="btn-ghost text-green-600 font-semibold">
            + {t('batches.addBatch')}
          </button>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder={t('batches.searchProductPlaceholder')} />
        {tab === 'all' && (
          <div className="flex gap-2 pb-1">
            {TABS.map(t => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  tab === t.value
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {t.label}
                {t.value === 'expiring' && expiringQuery.data?.length > 0 && (
                  <span className="me-1.5 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full">
                    {expiringQuery.data.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="px-4 pt-3 pb-4">
        {tab === 'all' && (
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 py-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            <span>{t('batches.batchProductLot')}</span>
            <span className="text-center w-16">{t('batches.batchQty')}</span>
            <span className="text-center w-20">{t('batches.purchasePriceLabel')}</span>
            <span className="text-center w-24">{t('batches.batchExpiry')}</span>
            <span className="text-center w-16" />
          </div>
        )}

        {activeData.isLoading ? (
          <LoadingSkeleton count={6} />
        ) : activeData.error ? (
          <ErrorState message={activeData.error.message} onRetry={activeData.refetch} />
        ) : batches.length === 0 ? (
          <EmptyState
            icon="📋"
            title={tab === 'all' ? t('batches.noBatches') : t('batches.noExpiringBatches')}
            subtitle={tab === 'all' ? t('batches.noBatchesHint') : t('batches.allExpiringFine')}
            actionLabel={tab === 'all' ? '+ ' + t('batches.addBatch') : undefined}
            onAction={tab === 'all' ? () => setShowForm(true) : undefined}
          />
        ) : tab === 'all' ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {batches.map((batch, i) => {
              const days = batch.expiry_date ? getDaysUntilExpiry(batch.expiry_date) : null
              return (
                <motion.div
                  key={batch.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-50 truncate">
                      {batch.products?.name || '—'}
                    </p>
                    <p className="text-[11px] text-gray-500 font-mono" dir="ltr">
                      {batch.lot_number}
                    </p>
                  </div>
                  <div className="text-center w-16">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-50">
                      {batch.quantity}
                    </p>
                  </div>
                  <div className="text-center w-20">
                    <p className="text-xs text-gray-600 dark:text-gray-300" dir="ltr">
                      {formatCurrency(batch.purchase_price)}
                    </p>
                  </div>
                  <div className="text-center w-24">
                    <p className="text-[11px] text-gray-500">{formatDate(batch.expiry_date)}</p>
                    {days !== null && days <= 30 && <ExpiryBadge days={days} />}
                  </div>
                  <div className="flex items-center gap-1 w-16 justify-end">
                    {adjustId === batch.id ? (
                      <>
                        <button
                          onClick={() => setAdjustDelta(prev => prev - 1)}
                          className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 flex items-center justify-center active:scale-90 transition-transform"
                        >
                          <MinusIcon className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-bold w-6 text-center">{adjustDelta}</span>
                        <button
                          onClick={() => setAdjustDelta(prev => prev + 1)}
                          className="h-7 w-7 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 flex items-center justify-center active:scale-90 transition-transform"
                        >
                          <PlusIcon className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleQuickAdjust(batch.id)}
                          className="text-[10px] px-1.5 py-0.5 bg-green-600 text-white rounded active:scale-90 transition-transform"
                        >
                          {t('batches.done')}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => { setAdjustId(batch.id); setAdjustDelta(0) }}
                        className="text-xs text-blue-600 font-semibold active:scale-90 transition-transform"
                      >
                        {t('batches.adjust')}
                      </button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {batches.map((batch, i) => {
              const days = batch.expiry_date ? getDaysUntilExpiry(batch.expiry_date) : null
              return (
                <motion.div
                  key={batch.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`p-4 rounded-xl border ${
                    days !== null && days <= 7
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ExclamationTriangleIcon className={`h-4 w-4 ${days !== null && days <= 7 ? 'text-red-500' : 'text-amber-500'}`} />
                      <span className="font-bold text-sm text-gray-900 dark:text-gray-50">
                        {batch.products?.name || '—'}
                      </span>
                    </div>
                    {days !== null && <ExpiryBadge days={days} />}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span dir="ltr">{batch.lot_number}</span>
                    <span>{t('batches.batchQtyLabel', { qty: batch.quantity })}</span>
                    <span dir="ltr">{formatCurrency(batch.purchase_price)}</span>
                    <span>{t('batches.batchExpiryLabel', { date: formatDate(batch.expiry_date) })}</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </main>

      <BottomSheet isOpen={showForm} onClose={() => { resetForm(); setShowForm(false) }} title={t('batches.newBatch')} large>
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600">
              {formError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('batches.productRequired')}
            </label>
            <SearchInput value={formProductSearch} onChange={setFormProductSearch} placeholder={t('batches.searchProductPlaceholder')} />
            {formProductSearch && productResults && (
              <div className="mt-1 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-xl divide-y divide-gray-100 dark:divide-gray-700">
                {productResults.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setFormProductId(p.id); setFormProductSearch(p.name) }}
                    className={`w-full px-3 py-2 text-start text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      formProductId === p.id ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold' : 'text-gray-900 dark:text-gray-50'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
                {productResults.length === 0 && (
                  <p className="px-3 py-2 text-sm text-gray-500">{t('batches.noResults')}</p>
                )}
              </div>
            )}
          </div>

          <FormInput label={t('batches.lotNumber')} value={formLot} onChange={setFormLot} required dir="ltr" placeholder={t('batches.lotPlaceholder')} />
          <FormInput label={t('batches.batchQty')} value={formQty} onChange={setFormQty} type="number" required dir="ltr" />
          <FormInput label={t('batches.purchasePriceLabel')} value={formPrice} onChange={setFormPrice} type="number" required dir="ltr" />
          <FormInput label={t('batches.expiryDate')} value={formExpiry} onChange={setFormExpiry} type="date" required dir="ltr" />
          <FormInput label={t('batches.manufactureDate')} value={formManufacture} onChange={setFormManufacture} type="date" dir="ltr" />

          <button
            onClick={handleCreateBatch}
            disabled={createMutation.isPending}
            className="btn-primary mt-4"
          >
            {createMutation.isPending ? t('common.loading') : t('batches.saveBatch')}
          </button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        isOpen={false}
        onClose={() => {}}
        onConfirm={() => {}}
        title=""
        message=""
      />
    </motion.div>
  )
}
