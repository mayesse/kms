import { motion } from 'framer-motion'
import { formatCurrency } from '../../../utils/format'
import { PlusIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

export default function ServiceGrid({ services, onServiceTap }) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-2.5">
      {services.map((service, i) => (
        <motion.button
          key={service.id}
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.02 }}
          onClick={() => onServiceTap(service)}
          className="relative bg-gradient-to-br from-violet-50 to-white dark:from-gray-800 dark:to-gray-800
                     rounded-xl border border-violet-200 dark:border-violet-900/40 shadow-sm overflow-hidden
                     p-2.5 lg:p-2 text-start active:scale-[0.97] hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <div className="absolute top-1.5 start-1.5">
            <WrenchScrewdriverIcon className="h-4 w-4 text-violet-500" />
          </div>
          <p className="font-bold text-sm lg:text-xs text-gray-900 dark:text-gray-50 truncate text-end mt-4">
            {service.name}
          </p>
          {service.duration_minutes && (
            <p className="text-[10px] text-violet-500 text-end mt-0.5">
              {service.duration_minutes} {t('pos.minutes')}
            </p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-green-600 dark:text-green-400 font-extrabold text-base lg:text-sm" dir="ltr">
              {formatCurrency(service.price)}
            </span>
            <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600">
              <PlusIcon className="h-4 w-4" />
            </span>
          </div>
        </motion.button>
      ))}
    </div>
  )
}
