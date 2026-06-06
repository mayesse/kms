import { useState } from 'react'
import { usePosStore } from '../../../stores/posStore'
import { TrashIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline'
import { formatCurrency } from '../../../utils/format'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { useTranslation } from 'react-i18next'

export default function CartItem({ item }) {
  const { t } = useTranslation()
  const { updateQty, removeFromCart } = usePosStore()
  const [showDelete, setShowDelete] = useState(false)

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">{item.product_name}</p>
          <p className="text-xs text-gray-500">
            {formatCurrency(item.unit_price)} × {item.qty}
            {item.tier_name && (
              <span className="ms-1 text-indigo-600 font-medium">({item.tier_name})</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => updateQty(item.id, item.qty - 1)}
            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center active:scale-90">
            <MinusIcon className="h-4 w-4" />
          </button>
          <input 
            type="number"
            step="any"
            onFocus={e => e.target.select()}
            className="w-12 h-8 text-center font-bold text-sm bg-transparent border border-gray-200 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-green-500 focus:outline-none"
            value={item.qty}
            onChange={e => updateQty(item.id, parseFloat(e.target.value) || 0)}
            dir="ltr"
          />
          <button onClick={() => updateQty(item.id, item.qty + 1)}
            className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center active:scale-90">
            <PlusIcon className="h-4 w-4 text-green-700" />
          </button>
        </div>

        <p className="text-sm font-bold text-green-600 w-20 text-end">
          {formatCurrency(item.unit_price * item.qty)}
        </p>

        <button onClick={() => setShowDelete(true)}
          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 active:scale-90">
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => removeFromCart(item.id)}
        message={t('pos.deleteItemConfirm', { name: item.product_name })}
      />
    </>
  )
}
