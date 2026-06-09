import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { tourismRepository } from '../../repositories/tourismRepository'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import { useTranslation } from 'react-i18next'

export default function TourismReportsScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)

  const { data: stats, isLoading } = useQuery({
    queryKey: ['tourism_dashboard', storeId],
    queryFn: () => tourismRepository.getDashboardStats(storeId),
    enabled: !!storeId,
  })

  if (isLoading) return <LoadingSkeleton count={4} height="h-16" />

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-4">{t('tourism.reports')}</h2>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500">{t('tourism.dossiers')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{stats?.total_dossiers || 0}</p>
          <p className="text-xs text-green-600 mt-1">{stats?.active_dossiers || 0} {t('common.active')}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500">{t('tourism.packages')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{stats?.total_packages || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500">{t('common.revenue')}</p>
          <p className="text-2xl font-bold text-green-600">{(stats?.total_revenue || 0).toLocaleString()} DZD</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500">{t('common.pending')}</p>
          <p className="text-2xl font-bold text-yellow-600">{(stats?.pending_payments || 0).toLocaleString()} DZD</p>
        </div>
      </div>
      {stats?.dossiers_by_status && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('tourism.dossiers')}</h3>
          <div className="space-y-2">
            {Object.entries(stats.dossiers_by_status).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t(`tourism.status${status.charAt(0).toUpperCase() + status.slice(1)}`)}</span>
                <span className="font-semibold text-gray-900 dark:text-gray-50">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
