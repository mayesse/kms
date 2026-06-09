import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../stores/authStore'
import { saleRepository } from '../../../repositories/saleRepository'
import { tableRepository } from '../../../repositories/tableRepository'
import SearchInput from '../../../components/SearchInput'
import FilterChips from '../../../components/FilterChips'
import EmptyState from '../../../components/EmptyState'
import LoadingSkeleton from '../../../components/LoadingSkeleton'
import BottomSheet from '../../../components/BottomSheet'
import Badge from '../../../components/Badge'
import FormInput from '../../../components/FormInput'
import { formatCurrency, formatDate, formatTime } from '../../../utils/format'
import { useTranslation } from 'react-i18next'
import InvoiceView from '../../../components/InvoiceView'
import ReturnNoteSheet from '../../../components/ReturnNoteSheet'
import { settingsRepository } from '../../../repositories/settingsRepository'

function getDateRange(filter) {
  const now = new Date()
  const pad = (d) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const today = pad(now)

  if (filter === 'today') {
    return { from: `${today}T00:00:00`, to: `${today}T23:59:59` }
  }
  if (filter === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 7)
    return { from: `${pad(d)}T00:00:00`, to: `${today}T23:59:59` }
  }
  if (filter === 'month') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: `${pad(d)}T00:00:00`, to: `${today}T23:59:59` }
  }
  // all
  return { from: '2020-01-01T00:00:00', to: `${today}T23:59:59` }
}

export default function SalesHistoryTab() {
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedSale, setSelectedSale] = useState(null)
  const [showVoid, setShowVoid] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [dateFilter, setDateFilter] = useState('today')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [tableFilter, setTableFilter] = useState('')
  const [showReprint, setShowReprint] = useState(false)
  const [reprintProfile, setReprintProfile] = useState(null)
  const [showReturnNote, setShowReturnNote] = useState(false)
  const { t } = useTranslation()

  const { from, to } = getDateRange(dateFilter)

  const { data: sales, isLoading, error } = useQuery({
    queryKey: ['salesHistory', storeId, from, to, search, paymentFilter, tableFilter],
    queryFn: () => saleRepository.getByDateRange(storeId, from, to, {
      search: search || undefined,
      paymentMethod: paymentFilter || undefined,
      tableId: tableFilter || undefined,
    }),
    enabled: !!storeId,
  })

  const voidMutation = useMutation({
    mutationFn: () => saleRepository.voidSale(storeId, selectedSale?.id, voidReason || t('reports.defaultVoidReason')),
    onSuccess: () => {
      queryClient.invalidateQueries(['salesHistory'])
      queryClient.invalidateQueries(['products'])
      queryClient.invalidateQueries(['dailySummary'])
      toast.success(t('reports.saleVoided'))
      setSelectedSale(null); setShowVoid(false); setVoidReason('')
    },
    onError: (err) => toast.error(err?.message || t('toast.saveFailed')),
  })

  const methods = { cash: t('pos.cash'), ccp: 'CCP', credit: t('pos.credit') }

  const { data: tables } = useQuery({
    queryKey: ['tables', storeId],
    queryFn: () => tableRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const dateOptions = [
    { value: 'today', label: t('reports.today') },
    { value: 'week', label: t('reports.thisWeek') },
    { value: 'month', label: t('reports.thisMonth') },
    { value: 'all', label: t('reports.tabAll') },
  ]

  // Summary — exclude credit from actual revenue
  const activeSales = (sales || []).filter(s => s.status !== 'voided')
  const paidSales = activeSales.filter(s => s.payment_method !== 'credit')
  const creditSales = activeSales.filter(s => s.payment_method === 'credit')
  const paidRevenue = paidSales.reduce((s, sale) => s + parseFloat(sale.total_amount || 0), 0)
  const creditTotal = creditSales.reduce((s, sale) => s + parseFloat(sale.total_amount || 0), 0)
  const saleCount = paidSales.length

  return (
    <div className="space-y-3">
      <FilterChips options={dateOptions} value={dateFilter} onChange={setDateFilter} />

      {/* Quick summary */}
      <div className={`grid gap-2 ${creditTotal > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <div className="card text-center">
          <p className="text-[10px] text-gray-500">{t('reports.salesCount')}</p>
          <p className="text-lg font-bold text-purple-600">{saleCount}</p>
        </div>
        <div className="card text-center">
          <p className="text-[10px] text-gray-500">{t('reports.actualRevenue')}</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(paidRevenue)}</p>
        </div>
        {creditTotal > 0 && (
          <div className="card text-center bg-amber-50 dark:bg-amber-900/20">
            <p className="text-[10px] text-amber-600">{t('reports.debtsFilter')}</p>
            <p className="text-lg font-bold text-amber-600">{formatCurrency(creditTotal)}</p>
          </div>
        )}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder={t('reports.searchByReceiptOrCustomer')} />

      {/* Payment method filter */}
      <div className="flex gap-1">
        {[
          { value: '', label: t('reports.tabAll') },
          { value: 'cash', label: t('reports.payCash') },
          { value: 'ccp', label: '📱 CCP' },
          { value: 'credit', label: t('reports.payCredit') },
        ].map(f => (
          <button key={f.value} onClick={() => setPaymentFilter(f.value)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              paymentFilter === f.value ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Table filter */}
      {tables?.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          <button onClick={() => setTableFilter('')}
            className={`shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              !tableFilter ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
            🍽️ {t('common.all')}
          </button>
          {tables.map(tbl => (
            <button key={tbl.id} onClick={() => setTableFilter(tbl.id)}
              className={`shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                tableFilter === tbl.id ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
              {tbl.name}
            </button>
          ))}
        </div>
      )}

      {/* Sales list */}
      {isLoading ? <LoadingSkeleton count={5} /> :
       error ? <div className="text-center text-red-500 py-8">{error.message}</div> :
       sales?.length === 0 ? <EmptyState icon="🧾" title={t('reports.noSalesToday')} /> :
       sales.map(sale => (
         <button key={sale.id} onClick={() => setSelectedSale(sale)}
           className={`card w-full text-start active:scale-[0.98] transition-transform ${sale.status === 'voided' ? 'opacity-50' : ''}`}>
           <div className="flex items-center justify-between">
             <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2">
                 <p className={`font-semibold text-sm ${sale.status === 'voided' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-50'}`}>
                   {sale.receipt_number || `#${sale.id?.slice(0, 6)}`}
                 </p>
                 {sale.status === 'voided' && <Badge variant="danger">{t('reports.voided')}</Badge>}
               </div>
                <p className="text-xs text-gray-500">{formatDate(sale.created_at)} • {formatTime(sale.created_at)}</p>
                {sale.customer_name && (
                  <p className="text-xs text-blue-500 mt-0.5">👤 {sale.customer_name}</p>
                )}
                {sale.tables?.name && (
                  <p className="text-xs text-amber-600 mt-0.5">🍽️ {sale.tables.name}</p>
                )}
             </div>
             <div className="text-end shrink-0 ms-3">
               <p className={`font-bold ${sale.status === 'voided' ? 'text-gray-400 line-through' : 'text-green-600'}`}>
                 {formatCurrency(sale.total_amount)}
               </p>
               <Badge variant={sale.payment_method === 'credit' ? 'warning' : sale.payment_method === 'ccp' ? 'info' : 'success'}>
                 {methods[sale.payment_method] || sale.payment_method}
               </Badge>
             </div>
           </div>
           {/* Items preview */}
           {sale.sale_items?.length > 0 && (
             <p className="text-xs text-gray-400 mt-1.5 truncate">
               {sale.sale_items.map(i => i.product_name).join('، ')}
             </p>
           )}
         </button>
       ))
      }

      {/* Sale detail */}
      <BottomSheet isOpen={!!selectedSale} onClose={() => setSelectedSale(null)}
        title={selectedSale?.receipt_number || t('reports.saleDetail')} large>
        {selectedSale && (
          <div className="space-y-4">
            {/* Sale info */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-gray-500">{t('reports.date')}:</span> {formatDate(selectedSale.created_at)}</div>
              <div><span className="text-gray-500">{t('reports.time')}:</span> {formatTime(selectedSale.created_at)}</div>
              <div>
                <span className="text-gray-500">{t('reports.payment')}:</span>{' '}
                <Badge variant={selectedSale.payment_method === 'credit' ? 'warning' : 'success'}>
                  {methods[selectedSale.payment_method]}
                </Badge>
              </div>
              {selectedSale.customer_name && (
                <div><span className="text-gray-500">{t('reports.customerLabel')}:</span> {selectedSale.customer_name}</div>
              )}
              {selectedSale.tables?.name && (
                <div><span className="text-gray-500">{t('reports.tableLabel')}:</span> 🍽️ {selectedSale.tables.name}</div>
              )}
            </div>

            {/* Items */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              {selectedSale.sale_items?.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-700">
                  <div>
                    <span className="text-gray-900 dark:text-gray-50">{item.product_name}</span>
                    <span className="text-gray-400 ms-2">×{item.quantity}</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(item.quantity * parseFloat(item.unit_price))}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between font-bold text-lg pt-1">
              <span>{t('pos.total')}</span>
              <span className="text-green-600">{formatCurrency(selectedSale.total_amount)}</span>
            </div>

            {selectedSale.note && (
              <p className="text-sm text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded-lg">📝 {selectedSale.note}</p>
            )}

            {selectedSale.status !== 'voided' && (
              <div className="pt-2 flex gap-2">
                <button onClick={() => setShowVoid(true)} className="btn-danger flex-1">
                  ❌ {t('reports.voidSale')}
                </button>
                <button onClick={() => setShowReturnNote(true)}
                  className="flex-1 h-10 rounded-lg font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 active:scale-95 transition-all flex items-center justify-center gap-1">
                  ↩️ {t('returnNote.title')}
                </button>
                <button
                  onClick={async () => {
                    try {
                      const profile = await settingsRepository.get(storeId)
                      setReprintProfile(profile)
                      setShowReprint(true)
                    } catch { /* ignore */ }
                  }}
                  className="flex-1 h-10 rounded-lg font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 active:scale-95 transition-all flex items-center justify-center gap-1"
                >
                  🖨️ {t('reports.reprint')}
                </button>
              </div>
            )}

            {selectedSale.status === 'voided' && (
              <div className="text-center py-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                <p className="text-red-600 font-semibold">{t('reports.saleVoidedLabel')}</p>
                {selectedSale.void_reason && (
                  <p className="text-xs text-red-400 mt-1">{t('reports.voidReasonLabel', { reason: selectedSale.void_reason })}</p>
                )}
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Void confirmation */}
      <BottomSheet isOpen={showVoid} onClose={() => setShowVoid(false)} title={t('reports.voidSale')}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{t('reports.voidSaleConfirm')}</p>
          <FormInput label={t('reports.voidReason')} value={voidReason} onChange={setVoidReason} placeholder={t('reports.voidReasonPlaceholder')} />
          <div className="flex gap-2">
            <button onClick={() => setShowVoid(false)} className="btn-ghost flex-1">{t('common.cancel')}</button>
            <button onClick={() => voidMutation.mutate()} disabled={voidMutation.isPending}
              className="flex-1 h-10 rounded-lg font-semibold text-white bg-red-600 active:scale-95 transition-all">
              {voidMutation.isPending ? t('common.loading') : t('reports.confirmVoid')}
            </button>
          </div>
        </div>
      </BottomSheet>

      <InvoiceView
        isOpen={showReprint}
        onClose={() => { setShowReprint(false); setReprintProfile(null) }}
        saleData={showReprint ? selectedSale : null}
        storeProfile={reprintProfile}
      />
      <ReturnNoteSheet
        isOpen={showReturnNote}
        onClose={() => setShowReturnNote(false)}
        sale={showReturnNote ? selectedSale : null}
      />
    </div>
  )
}
