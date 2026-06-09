import { useState } from 'react'
import { usePosStore } from '../../../stores/posStore'
import { formatCurrency } from '../../../utils/format'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { useTranslation } from 'react-i18next'

export default function CartFooter({ onCheckout, onHold, onClear, holdLabel, checkoutLabel }) {
  const { t } = useTranslation()
  const total = usePosStore(s => s.getTotal())
  const cartLen = usePosStore(s => s.cart.length)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  return (
    <>
      <div className="pb-4 pt-2 lg:pb-5 lg:pt-0">
        {/* Mobile total */}
        <div className="lg:hidden px-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">{t('pos.total')}</span>
            <span className="text-3xl font-extrabold text-green-600">{formatCurrency(total)}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={onHold} className="flex-1 h-11 rounded-xl border-2 border-amber-200 bg-gradient-to-b from-amber-50 to-amber-100/50 text-amber-700 font-bold text-sm active:scale-[0.97] transition-all">
              {t('pos.holdSale')}
            </button>
            <button onClick={onCheckout} disabled={cartLen === 0} className="flex-[2] h-11 rounded-xl bg-gradient-to-l from-green-600 to-emerald-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white font-bold text-sm active:scale-[0.97] transition-all shadow-sm">
              {t('pos.checkout')}
            </button>
          </div>
          <button onClick={() => setShowClearConfirm(true)} className="text-sm text-red-400 hover:text-red-500 w-full text-center transition-colors">
            {t('pos.clearAll')}
          </button>
        </div>

        {/* Desktop total — big, full-width, impossible to miss */}
        <div className="hidden lg:block border-t-2 border-green-200 dark:border-green-800">
          {/* Total amount block */}
          <div className="bg-gradient-to-b from-green-50 to-emerald-50/50 dark:from-gray-800 dark:to-gray-800 px-6 py-5 text-center">
            <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">{t('pos.total')}</p>
            <p className="text-6xl font-black text-green-700 dark:text-green-300 tracking-tight leading-none" dir="ltr">
              {formatCurrency(total)}
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs text-green-600/70 dark:text-green-400/60">{cartLen} {t('pos.items')}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-5 py-4 space-y-2.5 bg-white dark:bg-gray-800">
            <button onClick={onCheckout} disabled={cartLen === 0}
              className="w-full h-14 rounded-xl bg-gradient-to-l from-green-600 to-emerald-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white font-extrabold text-lg active:scale-[0.98] transition-all hover:shadow-lg hover:from-green-500 hover:to-emerald-500 shadow-md flex items-center justify-center gap-3">
              {t('pos.checkout')}
              <span className="text-sm font-mono bg-white/20 px-2 py-0.5 rounded">{checkoutLabel || ''}</span>
            </button>
            <div className="flex gap-2.5">
              <button onClick={onHold}
                className="flex-1 h-12 rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-b from-amber-50 to-amber-100/50 dark:from-gray-800 dark:to-gray-800 text-amber-700 dark:text-amber-300 font-bold text-sm active:scale-[0.97] transition-all hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md flex items-center justify-center gap-2">
                <span className="text-xs font-mono bg-amber-200/60 dark:bg-amber-800/60 px-1.5 py-0.5 rounded">{holdLabel || ''}</span>
                {t('pos.holdSale')}
              </button>
              <button onClick={() => setShowClearConfirm(true)}
                className="h-12 px-4 rounded-xl border border-red-200 dark:border-red-800 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium text-sm active:scale-[0.97] transition-all flex items-center justify-center">
                {t('pos.clearAll')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={onClear}
        message={t('pos.clearConfirm')}
      />
    </>
  )
}
