import { ExclamationTriangleIcon } from '@heroicons/react/24/solid'
import { useTranslation } from 'react-i18next'

export default function LowStockBanner({ count, onTap }) {
  const { t } = useTranslation()
  return (
    <button onClick={onTap}
      className="w-full bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5 flex items-center gap-2 text-start">
      <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 shrink-0" />
      <span className="text-sm text-amber-700 dark:text-amber-400 flex-1">
        ⚠️ {count} {t('inventory.lowStockAlert')} — {t('inventory.showLowStock')}
      </span>
    </button>
  )
}
