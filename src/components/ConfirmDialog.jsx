import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel, danger = true }) {
  const { t } = useTranslation()
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl" dir="rtl">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">
                {title || t('common.areYouSure')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {message || t('common.cannotUndo')}
              </p>
              <div className="flex gap-3 mt-6">
                <button onClick={onClose} className="btn-ghost flex-1">
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => { onConfirm(); onClose(); }}
                  className={`flex-1 h-10 rounded-lg font-semibold text-white active:scale-95 transition-all ${
                    danger ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {confirmLabel || t('common.confirm')}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

