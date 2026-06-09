import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import Badge from '../../../components/Badge'
import { formatCurrency, formatDate } from '../../../utils/format'
import { useTranslation } from 'react-i18next'

export default function CustomerDebtCard({ group, onMarkSalePaid, onMarkAllPaid, onViewStatement }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [now] = useState(() => Date.now())

  const oldest = group?.oldest_date ? new Date(group.oldest_date) : null
  const daysOld = oldest ? Math.max(0, Math.floor((now - oldest.getTime()) / 86400000)) : 0
  const urgency = daysOld > 30 ? 'danger' : daysOld > 7 ? 'warning' : 'info'

  return (
    <div className="card overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between active:bg-gray-50 dark:active:bg-gray-700/50 transition-colors -m-4 p-4"
      >
        <div className="flex-1 min-w-0 text-start">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">👤</span>
            <p className="font-bold text-gray-900 dark:text-gray-50 truncate">
              {group.customer_name || t('debts.unknownClient')}
            </p>
            <Badge variant={urgency}>
              {daysOld === 0 ? t('reports.today') : `${daysOld} ${t('debts.days')}`}
            </Badge>
          </div>
          <p className="text-xs text-gray-500">
            {group.sales.length} {t('debts.unpaidSales')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ms-3">
          <p className="text-xl font-bold text-red-600">
            {formatCurrency(group.total)}
          </p>
          {expanded
            ? <ChevronUpIcon className="h-5 w-5 text-gray-400" />
            : <ChevronDownIcon className="h-5 w-5 text-gray-400" />
          }
        </div>
      </button>

      {/* Urgency bar */}
      <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            daysOld > 30 ? 'bg-red-500' : daysOld > 7 ? 'bg-amber-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min(100, daysOld / 30 * 100)}%` }}
        />
      </div>

      {/* Expanded: individual sales */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {group.sales.map(sale => {
            const saleDate = sale?.created_at ? new Date(sale.created_at) : null
            const saleDays = saleDate ? Math.max(0, Math.floor((now - saleDate.getTime()) / 86400000)) : 0
            return (
              <div key={sale.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                      {formatCurrency(sale.total_amount)}
                    </p>
                    <span className="text-[10px] text-gray-400">
                      {saleDays === 0 ? t('reports.today') : `${saleDays} ${t('debts.days')}`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{formatDate(sale.created_at)}</p>
                  {sale.sale_items?.length > 0 && (
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">
                      {sale.sale_items.map(i => i.product_name).join('، ')}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onMarkSalePaid(sale) }}
                  className="shrink-0 ms-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 active:scale-95 transition-transform"
                >
                  ✅ {t('debts.markPaid')}
                </button>
              </div>
            )
          })}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onViewStatement}
              className="flex-1 py-2 rounded-xl text-sm font-semibold bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 active:scale-95 transition-transform"
            >
              📄 {t('debts.viewStatement')}
            </button>
            {group.sales.length > 1 && (
              <button
                onClick={onMarkAllPaid}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 active:scale-95 transition-transform"
              >
                ✅ {t('debts.markAllPaid')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

