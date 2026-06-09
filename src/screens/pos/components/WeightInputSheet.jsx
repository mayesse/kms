import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { formatCurrency } from '../../../utils/format'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

/* eslint-disable react-hooks/set-state-in-effect */

export default function WeightInputSheet({ isOpen, onClose, product, onConfirm }) {
  const { t } = useTranslation()
  const [weight, setWeight] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setWeight('')
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [isOpen])

  if (!product) return null

  const unitLabel = product.base_unit || t('pos.unitKg')
  const total = (parseFloat(weight) || 0) * parseFloat(product.selling_price)

  const handleConfirm = () => {
    const qty = parseFloat(weight)
    if (!qty || qty <= 0) return
    onConfirm(product, qty)
    onClose()
  }

  const presets = [0.5, 1, 1.5, 2, 2.5, 3, 5]

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      )}

      {/* Sheet */}
      <div className={`fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="px-6 pt-4 pb-8">
          {/* Handle */}
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-4" />

          {/* Close */}
          <button onClick={onClose} className="absolute top-4 start-4 p-1 text-gray-400">
            <XMarkIcon className="h-5 w-5" />
          </button>

          {/* Product name */}
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 text-center mb-1">
            {product.name}
          </h3>
          <p className="text-center text-sm text-gray-500 mb-6">
            {formatCurrency(product.selling_price)} / {unitLabel}
          </p>

          {/* Weight input */}
          <div className="relative mb-4">
            <input
              ref={inputRef}
              type="number"
              step="0.1"
              min="0"
              dir="ltr"
              data-scale-capture="true"
              className="w-full h-16 text-center text-3xl font-bold rounded-2xl border-2 border-green-500 bg-green-50 dark:bg-green-900/20 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
              placeholder="0.0"
            />
            <span className="absolute start-1/2 -translate-x-1/2 bottom-2 text-xs text-gray-400 font-medium">
              {unitLabel}
            </span>
          </div>

          {/* Preset weights */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {presets.map(p => (
              <button
                key={p}
                onClick={() => setWeight(String(p))}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                  parseFloat(weight) === p
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                {p} {unitLabel}
              </button>
            ))}
          </div>

          {/* Total + Confirm */}
          <motion.div
            animate={{ opacity: weight ? 1 : 0.4 }}
            className="text-center mb-4"
          >
            <p className="text-xs text-gray-500">{t('pos.total')}</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(total)}</p>
          </motion.div>

          <button
            onClick={handleConfirm}
            disabled={!weight || parseFloat(weight) <= 0}
            className="btn-primary"
          >
            {weight ? t('pos.addWeightToCart', { weight: `${weight} ${unitLabel}` }) : t('pos.addWeightToCart', { weight: '' })}
          </button>
        </div>
      </div>
    </>
  )
}
