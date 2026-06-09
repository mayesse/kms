import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

export default function ErrorState({ message, onRetry }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <ExclamationCircleIcon className="h-16 w-16 text-red-400" />
      <p className="text-red-600 font-medium">{message || t('common.error')}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost">
          {t('common.retry')}
        </button>
      )}
    </div>
  )
}

