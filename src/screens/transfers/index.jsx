import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { stockTransferRepository } from '../../repositories/stockTransferRepository'
import { branchRepository } from '../../repositories/branchRepository'
import { productRepository } from '../../repositories/productRepository'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import BottomSheet from '../../components/BottomSheet'
import FormInput from '../../components/FormInput'
import FormSelect from '../../components/FormSelect'
import SearchInput from '../../components/SearchInput'
import ConfirmDialog from '../../components/ConfirmDialog'
import Card from '../../components/Card'
import Badge from '../../components/Badge'
import { PlusIcon, ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/outline'

const STATUS_BADGE = {
  pending: 'warning',
  in_transit: 'info',
  received: 'success',
  cancelled: 'danger',
}

export default function TransfersScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [formFrom, setFormFrom] = useState('')
  const [formTo, setFormTo] = useState('')
  const [formNote, setFormNote] = useState('')
  const [formItems, setFormItems] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [showConfirm, setShowConfirm] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)

  const statusLabel = {
    pending: t('transfers.pending'),
    in_transit: t('transfers.inTransit'),
    received: t('transfers.received'),
    cancelled: t('transfers.cancelled'),
  }

  const { data: transfers, isLoading: loadingTransfers } = useQuery({
    queryKey: ['stock_transfers', storeId],
    queryFn: () => stockTransferRepository.getAll(storeId),
    enabled: !!storeId,
    refetchInterval: 10000,
  })

  const { data: branches } = useQuery({
    queryKey: ['branches', storeId],
    queryFn: () => branchRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const { data: products } = useQuery({
    queryKey: ['products', storeId],
    queryFn: () => productRepository.getAll(storeId),
    enabled: !!showForm,
  })

  const branchMap = useMemo(() => {
    const m = {}
    ;(branches || []).forEach(b => { m[b.id] = b.name })
    return m
  }, [branches])

  const filtered = useMemo(() =>
    (transfers || []).filter(tr => filter === 'all' || tr.status === filter),
    [transfers, filter]
  )

  const statusCounts = useMemo(() => ({
    pending: (transfers || []).filter(tr => tr.status === 'pending').length,
    in_transit: (transfers || []).filter(tr => tr.status === 'in_transit').length,
    received: (transfers || []).filter(tr => tr.status === 'received').length,
    cancelled: (transfers || []).filter(tr => tr.status === 'cancelled').length,
  }), [transfers])

  const productResults = useMemo(() => {
    if (!productSearch || !products) return []
    return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
  }, [productSearch, products])

  const createMutation = useMutation({
    mutationFn: (data) => stockTransferRepository.create(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['stock_transfers'])
      toast.success(t('transfers.created'))
      closeForm()
    },
    onError: () => toast.error(t('transfers.createFailed')),
  })

  const advanceMutation = useMutation({
    mutationFn: ({ id, status }) => stockTransferRepository.advanceStatus(storeId, id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['stock_transfers'])
      queryClient.invalidateQueries(['branch_inventory'])
      toast.success(t('transfers.statusUpdated'))
      setShowConfirm(null)
    },
    onError: (err) => toast.error(err.message || t('transfers.statusFailed')),
  })

  const closeForm = () => {
    setShowForm(false); setFormFrom(''); setFormTo(''); setFormNote(''); setFormItems([]); setProductSearch('')
  }

  const addItem = (product) => {
    const existing = formItems.find(i => i.product_id === product.id)
    if (existing) {
      setFormItems(formItems.map(i => i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i))
    } else {
      setFormItems([...formItems, { product_id: product.id, name: product.name, qty: 1 }])
    }
    setProductSearch('')
  }

  const updateItemQty = (productId, qty) => {
    if (qty <= 0) { setFormItems(formItems.filter(i => i.product_id !== productId)); return }
    setFormItems(formItems.map(i => i.product_id === productId ? { ...i, qty } : i))
  }

  const handleCreate = () => {
    if (!formFrom) { toast.error(t('transfers.selectSource')); return }
    if (!formTo) { toast.error(t('transfers.selectDest')); return }
    if (formFrom === formTo) { toast.error(t('transfers.sameBranch')); return }
    if (formItems.length === 0) { toast.error(t('transfers.addProducts')); return }
    createMutation.mutate({
      from_branch_id: formFrom,
      to_branch_id: formTo,
      note: formNote.trim(),
      items: formItems.map(i => ({ product_id: i.product_id, quantity: i.qty })),
    })
  }

  const confirmStatus = (id, status) => {
    setShowConfirm(id)
    setConfirmAction(status)
  }

  const confirmMessages = {
    in_transit: t('transfers.confirmShip'),
    received: t('transfers.confirmReceive'),
    cancelled: t('transfers.confirmCancel'),
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('transfers.title')}</h1>
          <button onClick={() => setShowForm(true)} className="h-10 w-10 grid place-items-center rounded-xl bg-green-600 text-white active:scale-95 transition-transform">
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {[
            { key: 'all', label: t('common.all'), count: transfers?.length },
            { key: 'pending', label: statusLabel.pending, count: statusCounts.pending },
            { key: 'in_transit', label: statusLabel.in_transit, count: statusCounts.in_transit },
            { key: 'received', label: statusLabel.received, count: statusCounts.received },
          ].map(s => (
            <button key={s.key} onClick={() => setFilter(s.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === s.key
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {s.label} ({s.count || 0})
            </button>
          ))}
        </div>
      </header>

      {loadingTransfers ? <LoadingSkeleton count={4} /> : (
        <main className="p-4 space-y-2">
          {filtered.length === 0 ? (
            <EmptyState icon="📦" title={t('transfers.empty')} subtitle={t('transfers.emptyHint')} />
          ) : (
            filtered.map((tr, i) => (
              <motion.div key={tr.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-50">
                        <span>{branchMap[tr.from_branch_id] || '—'}</span>
                        <ArrowLeftIcon className="h-3.5 w-3.5 text-gray-400" />
                        <span>{branchMap[tr.to_branch_id] || '—'}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(tr.created_at).toLocaleString('ar-DZ')} — {tr.stock_transfer_items?.length || 0} {t('transfers.products')}
                      </p>
                      {tr.note && <p className="text-xs text-gray-400 mt-0.5">{tr.note}</p>}
                      {tr.stock_transfer_items?.length > 0 && (
                        <ul className="mt-2 text-xs text-gray-500 space-y-0.5">
                          {tr.stock_transfer_items.slice(0, 3).map(item => (
                            <li key={item.id}>{item.products?.name || '—'} × {item.quantity}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <Badge variant={STATUS_BADGE[tr.status] || 'neutral'}>{statusLabel[tr.status] || tr.status}</Badge>
                  </div>
                  {tr.status === 'pending' && (
                    <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <button onClick={() => confirmStatus(tr.id, 'in_transit')}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white active:scale-95 transition-transform">
                        {t('transfers.ship')}
                      </button>
                      <button onClick={() => confirmStatus(tr.id, 'cancelled')}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white active:scale-95 transition-transform">
                        {t('transfers.cancel')}
                      </button>
                    </div>
                  )}
                  {tr.status === 'in_transit' && (
                    <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <button onClick={() => confirmStatus(tr.id, 'received')}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white active:scale-95 transition-transform">
                        {t('transfers.receive')}
                      </button>
                      <button onClick={() => confirmStatus(tr.id, 'cancelled')}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white active:scale-95 transition-transform">
                        {t('transfers.cancel')}
                      </button>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))
          )}
        </main>
      )}

      <BottomSheet isOpen={showForm} onClose={closeForm} title={t('transfers.new')} large>
        <div className="space-y-4">
          <FormSelect label={t('transfers.fromBranch')} value={formFrom} onChange={setFormFrom} placeholder={t('transfers.selectBranch')}
            options={(branches || []).map(b => ({ value: b.id, label: b.name }))} />
          <FormSelect label={t('transfers.toBranch')} value={formTo} onChange={setFormTo} placeholder={t('transfers.selectBranch')}
            options={(branches || []).map(b => ({ value: b.id, label: b.name }))} />
          <FormInput label={t('common.note')} value={formNote} onChange={setFormNote} />

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">{t('transfers.products')}</label>
            <SearchInput value={productSearch} onChange={setProductSearch} placeholder={t('inventory.searchProduct')} />
            {productSearch && productResults.length > 0 && (
              <div className="mt-1 max-h-32 overflow-y-auto bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                {productResults.map(p => (
                  <button key={p.id} onClick={() => addItem(p)}
                    className="w-full text-start px-3 py-2 text-sm text-gray-900 dark:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-600">
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {formItems.length > 0 && (
            <div className="space-y-1">
              {formItems.map((item) => (
                <div key={item.product_id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                  <span className="flex-1 text-sm text-gray-900 dark:text-gray-50 min-w-0 truncate">{item.name}</span>
                  <input type="number" min="1" value={item.qty} onChange={(e) => updateItemQty(item.product_id, parseInt(e.target.value) || 1)}
                    className="w-16 h-8 text-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" dir="ltr" />
                  <button onClick={() => updateItemQty(item.product_id, 0)} className="p-1 text-gray-400 hover:text-red-500">
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button onClick={handleCreate} className="btn-primary">{t('transfers.create')}</button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        isOpen={!!showConfirm}
        onClose={() => setShowConfirm(null)}
        onConfirm={() => advanceMutation.mutate({ id: showConfirm, status: confirmAction })}
        title={statusLabel[confirmAction] || t('transfers.confirmTitle')}
        message={confirmMessages[confirmAction] || t('transfers.confirmTitle')}
        danger={confirmAction === 'cancelled'}
      />
    </motion.div>
  )
}
