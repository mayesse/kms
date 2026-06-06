import BottomSheet from '../../../components/BottomSheet'
import { formatCurrency, formatDate } from '../../../utils/format'
import { useTranslation } from 'react-i18next'

export default function DebtReceiptSheet({ isOpen, onClose, group, onMarkSalePaid }) {
  const { t } = useTranslation()
  if (!group) return null

  const totalDebt = group.total
  const salesCount = group.sales.length

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('debts.clientStatement')} large>
      <div className="space-y-4">
        {/* Client header */}
        <div className="text-center pb-3 border-b border-gray-200 dark:border-gray-700">
          <p className="text-lg font-bold text-gray-900 dark:text-gray-50">
            👤 {group.customer_name || t('debts.unknownClient')}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {salesCount} {t('debts.unpaidSales')}
          </p>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {formatCurrency(totalDebt)}
          </p>
        </div>

        {/* Individual sales */}
        {group.sales.map((sale, idx) => (
          <div key={sale.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            {/* Sale header */}
            <div className="bg-gray-50 dark:bg-gray-700/50 px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{formatDate(sale.created_at)}</p>
                <p className="text-[11px] text-gray-400">{sale.receipt_number || `#${idx + 1}`}</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-red-600">{formatCurrency(sale.total_amount)}</p>
                <button
                  onClick={() => onMarkSalePaid(sale)}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 active:scale-95 transition-transform"
                >
                  ✅
                </button>
              </div>
            </div>

            {/* Sale items */}
            {sale.sale_items?.length > 0 && (
              <div className="px-3 py-1">
                {sale.sale_items.map((item, i) => (
                  <div
                    key={`${item.product_id || item.product_name}-${i}`}
                    className="flex justify-between text-sm py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-900 dark:text-gray-50">{item.product_name}</span>
                      <span className="text-gray-400 ms-2 text-xs">×{item.quantity}</span>
                    </div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300 shrink-0">
                      {formatCurrency(item.quantity * parseFloat(item.unit_price || 0))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Grand total */}
        <div className="flex justify-between items-center font-bold text-lg pt-2 border-t border-gray-200 dark:border-gray-700">
          <span>{t('pos.total')}</span>
          <span className="text-red-600">{formatCurrency(totalDebt)}</span>
        </div>
      </div>
    </BottomSheet>
  )
}

