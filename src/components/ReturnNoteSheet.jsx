import { useState, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import { saleRepository } from '../repositories/saleRepository'
import BottomSheet from './BottomSheet'
import FormInput from './FormInput'
import { formatCurrency } from '../utils/format'
import { useTranslation } from 'react-i18next'

export default function ReturnNoteSheet({ isOpen, onClose, sale }) {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [selectedItems, setSelectedItems] = useState({})
  const [reason, setReason] = useState('')
  const [restoreInventory, setRestoreInventory] = useState(true)

  const items = useMemo(() => (sale?.sale_items || []).filter(i => i.product_id), [sale])

  const toggleItem = (itemId) => {
    setSelectedItems(prev => {
      if (prev[itemId]) {
        const { [itemId]: _, ...rest } = prev
        return rest
      }
      const item = items.find(i => i.id === itemId)
      return { ...prev, [itemId]: { quantity: parseFloat(item?.quantity || 1) } }
    })
  }

  const setReturnQty = (itemId, qty) => {
    setSelectedItems(prev => {
      const item = items.find(i => i.id === itemId)
      const maxQty = parseFloat(item?.quantity || 1)
      return { ...prev, [itemId]: { quantity: Math.min(Math.max(0, parseFloat(qty) || 0), maxQty) } }
    })
  }

  const selectedTotal = useMemo(() => {
    let total = 0
    for (const itemId of Object.keys(selectedItems)) {
      const item = items.find(i => i.id === itemId)
      if (item && selectedItems[itemId]?.quantity > 0) {
        total += parseFloat(item.unit_price) * selectedItems[itemId].quantity
      }
    }
    return total
  }, [selectedItems, items])

  const returnMutation = useMutation({
    mutationFn: async () => {
      const returnItems = Object.entries(selectedItems)
        .filter(([_, v]) => v.quantity > 0)
        .map(([itemId, v]) => {
          const item = items.find(i => i.id === itemId)
          return {
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: v.quantity,
            unit_price: parseFloat(item.unit_price),
          }
        })

      return saleRepository.createReturnNote(
        storeId,
        sale.id,
        returnItems,
        reason || t('returnNote.defaultReason'),
        restoreInventory
      )
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['salesHistory'])
      queryClient.invalidateQueries(['products'])
      queryClient.invalidateQueries(['dailySummary'])
      toast.success(t('returnNote.created', { receipt: result.receipt_number }))
      setSelectedItems({})
      setReason('')
      onClose()
    },
    onError: (err) => toast.error(err?.message || t('toast.saveFailed')),
  })

  const hasSelection = Object.values(selectedItems).some(v => v.quantity > 0)

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('returnNote.title')} large>
      <div className="space-y-4">
        <p className="text-xs text-gray-500">{t('returnNote.hint')}</p>

        {items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">{t('returnNote.noItems')}</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {items.map((item) => {
              const isSelected = !!selectedItems[item.id]
              const sel = selectedItems[item.id]
              return (
                <div key={item.id}
                  className={`rounded-xl border p-3 transition-all ${
                    isSelected
                      ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <button onClick={() => toggleItem(item.id)}
                    className="flex items-center justify-between w-full text-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.quantity} × {formatCurrency(parseFloat(item.unit_price))}
                      </p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ms-2 ${
                      isSelected
                        ? 'bg-red-500 border-red-500 text-white'
                        : 'border-gray-300 dark:border-gray-500'
                    }`}>
                      {isSelected && <span className="text-xs font-bold">✓</span>}
                    </div>
                  </button>
                  {isSelected && (
                    <div className="mt-2 flex items-center gap-2 pt-2 border-t border-red-200 dark:border-red-700">
                      <span className="text-xs text-gray-500 shrink-0">{t('returnNote.qtyToReturn')}:</span>
                      <input
                        type="number"
                        value={sel.quantity}
                        onChange={(e) => setReturnQty(item.id, e.target.value)}
                        min="0"
                        max={item.quantity}
                        step="0.01"
                        className="w-20 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-center"
                        dir="ltr"
                      />
                      <span className="text-xs text-gray-400">{t('returnNote.maxQty')}: {item.quantity}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {hasSelection && (
          <div className="text-center py-2">
            <p className="text-sm text-gray-500">{t('returnNote.refundAmount')}</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(selectedTotal)}</p>
          </div>
        )}

        <FormInput label={t('returnNote.reason')} value={reason} onChange={setReason}
          placeholder={t('returnNote.reasonPlaceholder')} />

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={restoreInventory}
            onChange={() => setRestoreInventory(!restoreInventory)}
            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">{t('returnNote.restoreInventory')}</span>
        </label>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1">{t('common.cancel')}</button>
          <button onClick={() => returnMutation.mutate()}
            disabled={!hasSelection || returnMutation.isPending}
            className="flex-1 h-11 rounded-xl bg-red-600 text-white font-bold text-sm active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed shadow-md">
            {returnMutation.isPending ? t('common.loading') : t('returnNote.confirm')}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
