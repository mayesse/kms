import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../../stores/authStore'
import { saleRepository } from '../../../repositories/saleRepository'
import SearchInput from '../../../components/SearchInput'
import EmptyState from '../../../components/EmptyState'
import LoadingSkeleton from '../../../components/LoadingSkeleton'
import Badge from '../../../components/Badge'
import ConfirmDialog from '../../../components/ConfirmDialog'
import BottomSheet from '../../../components/BottomSheet'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { formatCurrency, formatDate, formatTime } from '../../../utils/format'
import { useTranslation } from 'react-i18next'

const NOW_MS = Date.now()

export default function CreditTab() {
  const storeId = useAuthStore(s => s.storeId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showMarkPaid, setShowMarkPaid] = useState(null)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const { t } = useTranslation()

  const { data: credits, isLoading } = useQuery({
    queryKey: ['creditSales', storeId],
    queryFn: () => saleRepository.getCreditSales(storeId),
    enabled: !!storeId,
  })
  const { data: collectedCredits } = useQuery({
    queryKey: ['collectedCreditSales', storeId],
    queryFn: () => saleRepository.getCollectedCreditSales(storeId),
    enabled: !!storeId,
  })
  const { data: receiptDetail } = useQuery({
    queryKey: ['creditReceiptDetail', storeId, selectedPayment?.sale_id],
    queryFn: () => saleRepository.getSaleDetail(storeId, selectedPayment.sale_id),
    enabled: !!storeId && !!selectedPayment?.sale_id,
  })

  const unpaidCredits = credits || []
  const totalCredit = unpaidCredits.reduce((s, c) => s + parseFloat(c.total_amount), 0)

  const filteredCredits = unpaidCredits.filter(s =>
    !search || (s.customer_name || '').includes(search) || (s.receipt_number || '').includes(search)
  )
  const filteredCollected = (collectedCredits || []).filter(p =>
    !search || (p.customer_name || '').includes(search) || (p.receipt_number || '').includes(search)
  )

  const handleMarkPaid = async (saleId) => {
    const sale = unpaidCredits.find(s => s.id === saleId)
    if (!sale) {
      setShowMarkPaid(null)
      return
    }
    await saleRepository.markCreditPaid(storeId, sale.id)
    queryClient.invalidateQueries(['creditSales'])
    queryClient.invalidateQueries(['debtsByCustomer'])
    queryClient.invalidateQueries(['collectedCreditSales'])
    queryClient.invalidateQueries(['summary'])
    setShowMarkPaid(null)
  }

  return (
    <div className="space-y-3">
      {/* Total debt banner */}
      <div className="card text-center bg-red-50 dark:bg-red-900/20">
        <p className="text-sm text-red-600 dark:text-red-400">{t('reports.totalClientDebts')}</p>
        <p className="text-2xl font-bold text-red-600">{formatCurrency(totalCredit)}</p>
      </div>

      {/* Link to full debts management page */}
      <button
        onClick={() => navigate('/debts')}
        className="w-full py-2.5 rounded-xl text-sm font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 active:scale-95 transition-transform"
      >
        📋 {t('debts.goToDebts')}
      </button>

      <SearchInput value={search} onChange={setSearch} placeholder={t('reports.searchByNameOrReceipt')} />

      {isLoading ? <LoadingSkeleton count={5} /> : (
        filteredCredits.length === 0 ? (
          <EmptyState icon="✅" title={t('reports.noDebts')} />
        ) : (
          filteredCredits.map(sale => {
            const daysOverdue = Math.floor((NOW_MS - new Date(sale.created_at)) / 86400000)
            const urgency = daysOverdue > 30 ? 'danger' : daysOverdue > 7 ? 'warning' : 'info'

            return (
              <div key={sale.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-900 dark:text-gray-50">
                        {sale.customer_name || t('reports.unknownCustomer')}
                      </p>
                      <Badge variant={urgency}>
                        {daysOverdue === 0 ? t('reports.today') : t('reports.daysFormat', { days: daysOverdue })}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">{formatDate(sale.created_at)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{sale.receipt_number}</p>
                  </div>
                  <p className="font-bold text-lg text-amber-600 shrink-0 ms-3">
                    {formatCurrency(sale.total_amount)}
                  </p>
                </div>

                {/* Days overdue progress bar */}
                <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      daysOverdue > 30 ? 'bg-red-500' : daysOverdue > 7 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, daysOverdue / 30 * 100)}%` }}
                  />
                </div>

                <div className="mt-3">
                  <button onClick={() => setShowMarkPaid(sale.id)}
                    className="w-full py-2 rounded-xl text-sm font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 active:scale-95 transition-transform">
                    ✅ {t('reports.markPaid')}
                  </button>
                </div>
              </div>
            )
          })
        )
      )}

      {/* Collected debts history */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {t('reports.collectedCreditHistory')}
        </h3>
        {filteredCollected.length === 0 ? (
          <p className="text-xs text-gray-400">{t('reports.noCollectedCredit')}</p>
        ) : (
          <div className="space-y-2">
            {filteredCollected.map((payment) => (
              <div key={payment.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-50 truncate">
                      {payment.customer_name || t('reports.unknownCustomer')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {payment.receipt_number || '-'} • {formatDate(payment.paid_at)}
                    </p>
                  </div>
                  <div className="text-end shrink-0 ms-3 flex items-center gap-2">
                    <button
                      onClick={() => setSelectedPayment(payment)}
                      className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-blue-600"
                      title={t('reports.viewReceipt')}
                    >
                      <InformationCircleIcon className="h-5 w-5" />
                    </button>
                    <p className="font-bold text-emerald-600">{formatCurrency(payment.amount)}</p>
                    <Badge variant="success">{t('reports.markPaid')}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!showMarkPaid}
        onClose={() => setShowMarkPaid(null)}
        onConfirm={() => handleMarkPaid(showMarkPaid)}
        title={t('reports.markPaidConfirmTitle')}
        message={t('reports.markPaidConfirmMessage')}
        danger={false}
      />

      <BottomSheet
        isOpen={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        title={t('reports.localReceiptTitle')}
        large
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">{t('reports.receiptNumber')}:</span>{' '}
                {selectedPayment.receipt_number || '-'}
              </div>
              <div>
                <span className="text-gray-500">{t('reports.date')}:</span>{' '}
                {formatDate(receiptDetail?.created_at || selectedPayment.sale_created_at || selectedPayment.paid_at)}
              </div>
              <div>
                <span className="text-gray-500">{t('reports.collectedAt')}:</span>{' '}
                {formatDate(selectedPayment.paid_at)} • {formatTime(selectedPayment.paid_at)}
              </div>
              <div>
                <span className="text-gray-500">{t('pos.customerName')}:</span>{' '}
                {selectedPayment.customer_name || '—'}
              </div>
            </div>

            {(receiptDetail?.sale_items?.length || 0) > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                {receiptDetail.sale_items.map((item, idx) => (
                  <div
                    key={`${item.product_id || item.product_name}-${idx}`}
                    className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-700"
                  >
                    <div>
                      <span className="text-gray-900 dark:text-gray-50">{item.product_name}</span>
                      <span className="text-gray-400 ms-2">×{item.quantity}</span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(item.quantity * parseFloat(item.unit_price || 0))}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between font-bold text-lg pt-1">
              <span>{t('pos.total')}</span>
              <span className="text-green-600">
                {formatCurrency(receiptDetail?.total_amount || selectedPayment.amount)}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2">
              <span className="text-sm text-green-700 dark:text-green-300">{t('reports.markPaid')}</span>
              <span className="font-bold text-green-700 dark:text-green-300">
                {formatCurrency(selectedPayment.amount)}
              </span>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
