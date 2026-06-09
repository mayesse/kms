import { useMemo, useState } from 'react'
import SearchInput from '../../../components/SearchInput'
import EmptyState from '../../../components/EmptyState'
import BottomSheet from '../../../components/BottomSheet'
import Badge from '../../../components/Badge'
import { useLocalSalesStore } from '../../../stores/localSalesStore'
import { formatCurrency, formatDate, formatTime } from '../../../utils/format'
import { useTranslation } from 'react-i18next'

export default function LocalSalesTab() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [selectedSale, setSelectedSale] = useState(null)
  const sales = useLocalSalesStore((s) => s.sales)

  const paymentBadges = {
    cash: { variant: 'success', label: t('pos.cash') },
    ccp: { variant: 'info', label: t('pos.ccp') },
    credit: { variant: 'warning', label: t('pos.credit') },
  }

  const filteredSales = useMemo(
    () =>
      sales.filter((sale) => {
        if (!search) return true
        const q = search.trim()
        return (
          (sale.receipt_number || '').includes(q) ||
          (sale.customer_name || '').includes(q) ||
          (sale.items || []).some((item) => (item.product_name || '').includes(q))
        )
      }),
    [sales, search]
  )

  return (
    <div className="space-y-3">
      <div className="card text-center bg-blue-50 dark:bg-blue-900/20">
        <p className="text-sm text-blue-600 dark:text-blue-400">{t('reports.localSalesCount')}</p>
        <p className="text-2xl font-bold text-blue-600">{sales.length}</p>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={t('reports.localSalesSearch')}
      />

      {filteredSales.length === 0 ? (
        <EmptyState icon="🧾" title={t('reports.localSalesEmpty')} />
      ) : (
        filteredSales.map((sale) => {
          const payment = paymentBadges[sale.payment_method] || {
            variant: 'neutral',
            label: sale.payment_method,
          }
          return (
            <button
              key={sale.local_id}
              onClick={() => setSelectedSale(sale)}
              className="card w-full text-start active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-50">
                    {sale.receipt_number}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(sale.created_at)} • {formatTime(sale.created_at)}
                  </p>
                </div>
                <div className="text-end shrink-0 ms-3">
                  <p className="font-bold text-green-600">{formatCurrency(sale.total_amount)}</p>
                  <Badge variant={payment.variant}>{payment.label}</Badge>
                </div>
              </div>
            </button>
          )
        })
      )}

      <BottomSheet
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        title={t('reports.localReceiptTitle')}
        large
      >
        {selectedSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">{t('reports.receiptNumber')}:</span>{' '}
                {selectedSale.receipt_number}
              </div>
              <div>
                <span className="text-gray-500">{t('reports.date')}:</span>{' '}
                {formatDate(selectedSale.created_at)}
              </div>
              <div>
                <span className="text-gray-500">{t('pos.paymentMethod')}:</span>{' '}
                {paymentBadges[selectedSale.payment_method]?.label || selectedSale.payment_method}
              </div>
              {selectedSale.customer_name && (
                <div>
                  <span className="text-gray-500">{t('pos.customerName')}:</span>{' '}
                  {selectedSale.customer_name}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              {(selectedSale.items || []).map((item, idx) => (
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

            <div className="flex justify-between font-bold text-lg pt-1">
              <span>{t('pos.total')}</span>
              <span className="text-green-600">{formatCurrency(selectedSale.total_amount)}</span>
            </div>

            {selectedSale.note && (
              <p className="text-sm text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded-lg">
                📝 {selectedSale.note}
              </p>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
