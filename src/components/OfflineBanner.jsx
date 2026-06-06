import { useTranslation } from 'react-i18next'
import { WifiIcon } from '@heroicons/react/24/outline'

export default function OfflineBanner() {
  const { t } = useTranslation()
  return (
    <div className="bg-amber-500 text-white text-sm text-center py-2 px-4 flex items-center justify-center gap-2">
      <WifiIcon className="h-4 w-4" />
      <span>{t('app.offline')}</span>
    </div>
  )
}
