import BottomSheet from '../../../components/BottomSheet'
import { formatCurrency } from '../../../utils/format'
import { useTranslation } from 'react-i18next'

export default function UnitSelectionSheet({ isOpen, onClose, product, onSelect }) {
  const { t } = useTranslation()
  if (!product) return null

  const units = [
    {
      isBase: true,
      name: product.base_unit || t('pos.unitPc'),
      conversion_rate: 1,
      selling_price: product.selling_price
    },
    ...(product.product_units || [])
  ]

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('pos.selectUnit')}>
      <div className="space-y-2">
        <p className="text-center font-bold text-gray-800 dark:text-gray-200 mb-4">{product.name}</p>
        
        {units.map((u, i) => (
          <button key={i} onClick={() => onSelect(u.isBase ? null : u)}
            className="w-full card flex items-center justify-between active:scale-95 transition-transform hover:bg-gray-100 dark:hover:bg-gray-800">
            <div className="text-start">
              <p className="font-bold text-gray-900 dark:text-gray-50">{u.name}</p>
              {!u.isBase && <p className="text-xs text-gray-500">{t('pos.containsUnit', { rate: u.conversion_rate, unit: product.base_unit || t('pos.unitPc') })}</p>}
            </div>
            <p className="font-bold text-green-600">{formatCurrency(u.selling_price)}</p>
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}
