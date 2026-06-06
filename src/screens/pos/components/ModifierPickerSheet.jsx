import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import BottomSheet from '../../../components/BottomSheet'
import { formatCurrency } from '../../../utils/format'

export default function ModifierPickerSheet({
  isOpen,
  onClose,
  product,
  groups,
  onConfirm,
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState({})

  const modifierTotal = useMemo(() => {
    return Object.values(selected).reduce((sum, item) => sum + parseFloat(item.price || 0), 0)
  }, [selected])

  const basePrice = parseFloat(product?.selling_price || 0)

  const toggleItem = (group, item) => {
    setSelected(prev => {
      const next = { ...prev }
      const key = group.id
      if (next[key]?.id === item.id) {
        delete next[key]
        return next
      }
      if (group.max_selections === 1) {
        next[key] = item
        return next
      }
      next[`${key}_${item.id}`] = item
      return next
    })
  }

  const isSelected = (group, item) => {
    if (group.max_selections === 1) return selected[group.id]?.id === item.id
    return !!selected[`${group.id}_${item.id}`]
  }

  const handleConfirm = () => {
    const picks = Object.values(selected)
    const labels = picks.map(p => p.name).join(', ')
    onConfirm(product, picks, modifierTotal, labels)
    setSelected({})
    onClose()
  }

  const handleClose = () => {
    setSelected({})
    onClose()
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title={product?.name || ''} large>
      <div className="space-y-4">
        {(groups || []).map(group => (
          <div key={group.id}>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">{group.name}</p>
            <div className="flex flex-wrap gap-2">
              {(group.modifier_items || []).map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleItem(group, item)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    isSelected(group, item)
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {item.name}
                  {parseFloat(item.price) > 0 && (
                    <span className="text-xs opacity-80 ms-1">+{formatCurrency(item.price)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-4 text-center">
          <p className="text-xs text-gray-500">{t('modifiers.lineTotal')}</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(basePrice + modifierTotal)}
          </p>
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          className="w-full h-12 rounded-2xl bg-green-600 text-white font-bold active:scale-95"
        >
          {t('modifiers.addToCart')}
        </button>
      </div>
    </BottomSheet>
  )
}
