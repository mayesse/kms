import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import { activityLogRepository } from '../../../repositories/activityLogRepository'
import EmptyState from '../../../components/EmptyState'
import LoadingSkeleton from '../../../components/LoadingSkeleton'
import { formatTime } from '../../../utils/format'
import { useTranslation } from 'react-i18next'

const typeColors = {
  sale_created: 'bg-green-500',
  sale_voided: 'bg-red-500',
  sale_expired_batch: 'bg-amber-500',
  repair_job_created: 'bg-stone-500',
  repair_job_status: 'bg-stone-400',
  repair_job_completed: 'bg-green-600',
  product_created: 'bg-blue-500',
  product_updated: 'bg-blue-400',
  product_deleted: 'bg-red-400',
  stock_adjusted: 'bg-amber-500',
  purchase_created: 'bg-purple-500',
  batch_created: 'bg-teal-500',
  promotion_created: 'bg-pink-500',
  stock_transfer_created: 'bg-indigo-500',
}

function formatDetails(log, t) {
  if (log.action_type !== 'sale_expired_batch' || !log.details) return null
  try {
    const items = JSON.parse(log.details)
    if (!Array.isArray(items)) return null
    return items.map(i => `${i.product} (${i.lot})`).join(' · ')
  } catch {
    return null
  }
}

export default function ActivityLogTab() {
  const storeId = useAuthStore(s => s.storeId)
  const { t } = useTranslation()

  const { data: logs, isLoading } = useQuery({
    queryKey: ['activityLog', storeId],
    queryFn: () => activityLogRepository.getAll(storeId),
    enabled: !!storeId,
  })

  if (isLoading) return <LoadingSkeleton count={8} height="h-12" />
  if (!logs?.length) return <EmptyState icon="📋" title={t('reports.noActivity')} />

  return (
    <div className="space-y-1">
      {logs.map(log => {
        const labelKey = `reports.activityTypes.${log.action_type}`
        const label = t(labelKey, { defaultValue: log.action_type })
        const detailLine = formatDetails(log, t)

        return (
          <div key={log.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${typeColors[log.action_type] || 'bg-gray-400'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 dark:text-gray-50 truncate">
                {label}
                {log.entity_name && ` — ${log.entity_name}`}
              </p>
              {detailLine && (
                <p className="text-xs text-amber-600 dark:text-amber-400 truncate">{detailLine}</p>
              )}
              <p className="text-xs text-gray-400">{formatTime(log.created_at)}</p>
            </div>
            {log.amount != null && (
              <span className="text-sm font-semibold text-green-600">{parseFloat(log.amount).toFixed(2)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
