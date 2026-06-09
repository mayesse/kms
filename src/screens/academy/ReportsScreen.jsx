import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { academyRepository } from '../../repositories/academyRepository'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import { useTranslation } from 'react-i18next'

export default function AcademyReportsScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)

  const { data: stats, isLoading } = useQuery({
    queryKey: ['academy_dashboard', storeId],
    queryFn: () => academyRepository.getDashboardStats(storeId),
    enabled: !!storeId,
  })

  if (isLoading) return <LoadingSkeleton count={4} height="h-16" />

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-4">{t('academy.reports')}</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500">{t('academy.students')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{stats?.total_students || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500">{t('academy.teachers')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{stats?.total_teachers || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500">{t('academy.courses')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{stats?.total_courses || 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-xs text-gray-500">{t('academy.schedule')}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{stats?.total_sessions || 0}</p>
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
    </div>
  )
}
