import { Link } from 'react-router-dom'
import { useTrialStore } from '../stores/trialStore'
import { useTranslation } from 'react-i18next'

export default function TrialBanner() {
  const { t } = useTranslation()
  const trial = useTrialStore(s => s.trial)
  const hasSubscription = useTrialStore(s => s.hasSubscription)
  const usage = useTrialStore(s => s.usage)
  const limits = useTrialStore(s => s.limits)
  const remainingDays = useTrialStore(s => s.remainingDays)
  const isExpired = useTrialStore(s => s.isExpired)

  if (!trial || hasSubscription) return null

  const days = remainingDays()
  const expired = isExpired()

  const barColor = expired ? 'bg-red-500' : days <= 1 ? 'bg-amber-500' : 'bg-emerald-500'
  const bgColor = expired ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    : days <= 1 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
  const textColor = expired ? 'text-red-700 dark:text-red-300'
    : days <= 1 ? 'text-amber-700 dark:text-amber-300'
    : 'text-emerald-700 dark:text-emerald-300'

  return (
    <div className={`${bgColor} border-b px-4 py-2`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className={`font-semibold ${textColor}`}>
          {expired
            ? t('trial.expired')
            : t('trial.remainingDays', { days })
          }
        </div>
        <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
          <span>{usage.products}/{limits.products} {t('inventory.title')}</span>
          <span>{usage.sales}/{limits.sales} {t('reports.salesHistory')}</span>
          <span>{usage.suppliers}/{limits.suppliers} {t('suppliers.title')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${barColor} transition-all`}
              style={{ width: `${Math.min(100, ((limits.products ? usage.products / limits.products : 0) + (limits.sales ? usage.sales / limits.sales : 0) + (limits.suppliers ? usage.suppliers / limits.suppliers : 0)) / 3 * 100)}%` }}
            />
          </div>
          <span className="text-gray-400 dark:text-gray-500">•</span>
          <Link to="/register/pricing" className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
            {t('onboarding.pricing.upgrade')}
          </Link>
        </div>
      </div>
    </div>
  )
}
