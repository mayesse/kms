import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { batchRepository } from '../repositories/batchRepository'

export default function PharmacyExpiryBanner({ storeId, compact = false }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const { data: summary } = useQuery({
    queryKey: ['expiry_alert_summary', storeId],
    queryFn: () => batchRepository.getExpiryAlertSummary(storeId, 30),
    enabled: !!storeId,
    refetchInterval: 60000,
  })

  if (!summary?.total) return null

  const { expiredCount, expiringCount } = summary

  return (
    <button
      type="button"
      onClick={() => navigate('/batches', { state: { tab: 'expiring' } })}
      className={`w-full text-start rounded-xl border active:scale-[0.99] transition-transform ${
        expiredCount > 0
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      } ${compact ? 'px-3 py-2 mb-2' : 'px-4 py-3 mb-3'}`}
    >
      <p className={`font-bold ${expiredCount > 0 ? 'text-red-700 dark:text-red-300' : 'text-amber-800 dark:text-amber-200'} ${compact ? 'text-xs' : 'text-sm'}`}>
        {expiredCount > 0 ? '⚠️ ' : '⏳ '}
        {t('pharmacy.expiryAlertTitle')}
      </p>
      <p className={`text-gray-600 dark:text-gray-400 mt-0.5 ${compact ? 'text-[10px]' : 'text-xs'}`}>
        {expiredCount > 0 && t('pharmacy.expiredBatches', { count: expiredCount })}
        {expiredCount > 0 && expiringCount > 0 && ' · '}
        {expiringCount > 0 && t('pharmacy.expiringBatches', { count: expiringCount })}
      </p>
    </button>
  )
}
