import { useMemo, useState } from 'react'
import Badge from '../../../components/Badge'
import BottomSheet from '../../../components/BottomSheet'
import EmptyState from '../../../components/EmptyState'
import SearchInput from '../../../components/SearchInput'
import { useLocalSalesStore } from '../../../stores/localSalesStore'
import { formatCurrency, formatDate, formatTime } from '../../../utils/format'
import { useTranslation } from 'react-i18next'

export default function SessionSalesSheet({ isOpen, onClose }) {
  const { t } = useTranslation()
  const paymentBadges = {
    cash: { variant: 'success', label: t('pos.cash') },
    ccp: { variant: 'info', label: t('pos.ccp') },
    credit: { variant: 'warning', label: t('pos.credit') },
  }
  const [search, setSearch] = useState('')
  const [selectedSale, setSelectedSale] = useState(null)
  const sales = useLocalSalesStore((s) => s.sales)

  const filteredSales = useMemo(
    () =>
      sales.filter((sale) => {
        const q = search.trim()
        if (!q) return true
        return (
          (sale.receipt_number || '').includes(q) ||
          (sale.customer_name || '').includes(q) ||
          (sale.items || []).some((item) => (item.product_name || '').includes(q))
        )
      }),
    [sales, search]
  )

  const closeList = () => {
    setSelectedSale(null)
    onClose()
  }

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={closeList} title={t('reports.salesHistory')} large>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
              <p className="text-[10px] text-blue-600 dark:text-blue-400">{t('reports.localSalesCount')}</p>
              <p className="text-xl font-bold text-blue-600">{sales.length}</p>
            </div>
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-center">
              <p className="text-[10px] text-green-600 dark:text-green-400">{t('pos.total')}</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0))}
              </p>
            </div>
          </div>

          <SearchInput value={search} onChange={setSearch} placeholder={t('reports.localSalesSearch')} />

          {filteredSales.length === 0 ? (
            <EmptyState icon="🧾" title={t('reports.localSalesEmpty')} />
          ) : (
            <div className="space-y-2">
              {filteredSales.map((sale) => {
                const payment = paymentBadges[sale.payment_method] || {
                  variant: 'neutral',
                  label: sale.payment_method,
                }

                return (
                  <button
                    key={sale.local_id}
                    onClick={() => setSelectedSale(sale)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-start active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-50">
                          {sale.receipt_number}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(sale.created_at)} • {formatTime(sale.created_at)}
                        </p>
                        {sale.customer_name && (
                          <p className="text-xs text-blue-500 mt-0.5 truncate">{sale.customer_name}</p>
                        )}
                      </div>
                      <div className="text-end shrink-0">
                        <p className="font-bold text-green-600">{formatCurrency(sale.total_amount)}</p>
                        <Badge variant={payment.variant}>{payment.label}</Badge>
                      </div>
                    </div>
                    {sale.items?.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1.5 truncate">
                        {sale.items.map((item) => item.product_name).join('، ')}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        title={selectedSale?.receipt_number || t('reports.localReceiptTitle')}
        large
      >
        {selectedSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">{t('reports.date')}:</span>{' '}
                {formatDate(selectedSale.created_at)}
              </div>
              <div>
                <span className="text-gray-500">{t('pos.paymentMethod')}:</span>{' '}
                <Badge variant={paymentBadges[selectedSale.payment_method]?.variant || 'neutral'}>
                  {paymentBadges[selectedSale.payment_method]?.label || selectedSale.payment_method}
                </Badge>
              </div>
              {selectedSale.customer_name && (
                <div>
                  <span className="text-gray-500">{t('pos.customerName')}:</span>{' '}
                  {selectedSale.customer_name}
                </div>
              )}
              {selectedSale.amount_paid !== null && selectedSale.amount_paid !== undefined && (
                <div>
                  <span className="text-gray-500">{t('pos.amountPaid')}:</span>{' '}
                  {formatCurrency(selectedSale.amount_paid)}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              {(selectedSale.items || []).map((item, idx) => (
                <div
                  key={`${item.product_id || item.product_name}-${idx}`}
                  className="py-2 border-b border-gray-100 dark:border-gray-700"
                >
                  <div className="flex justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="text-gray-900 dark:text-gray-50 truncate">{item.product_name}</p>
                      <p className="text-xs text-gray-400">
                        {item.quantity} × {item.unit_name || ''} • {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <span className="font-semibold shrink-0">
                      {formatCurrency(item.quantity * parseFloat(item.unit_price || 0))}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex justify-between font-bold text-lg">
                <span>{t('pos.total')}</span>
                <span className="text-green-600">{formatCurrency(selectedSale.total_amount)}</span>
              </div>
              {selectedSale.change_amount > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{t('pos.change')}</span>
                  <span>{formatCurrency(selectedSale.change_amount)}</span>
                </div>
              )}
            </div>

            {selectedSale.note && (
              <p className="text-sm text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded-lg">
                {selectedSale.note}
              </p>
            )}
          </div>
        )}
      </BottomSheet>
    </>
  )
}
