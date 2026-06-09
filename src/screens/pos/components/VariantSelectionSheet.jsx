import BottomSheet from '../../../components/BottomSheet'
import { formatCurrency } from '../../../utils/format'
import { useTranslation } from 'react-i18next'
import Badge from '../../../components/Badge'

export default function VariantSelectionSheet({ isOpen, onClose, product, onSelect }) {
  const { t } = useTranslation()
  if (!product) return null

  const variants = (product.product_variants || []).filter(v => v.is_active !== false)

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('pos.selectVariant')}>
      <div className="space-y-2">
        <p className="text-center font-bold text-gray-800 dark:text-gray-200 mb-4">{product.name}</p>

        {variants.length === 0 ? (
          <p className="text-center text-sm text-amber-600 py-4">{t('pos.noVariants')}</p>
        ) : (
          variants.map((v) => {
            const stock = parseFloat(v.quantity || 0)
            const outOfStock = stock <= 0
            return (
              <button
                key={v.id}
                type="button"
                disabled={outOfStock}
                onClick={() => onSelect(v)}
                className={`w-full card flex items-center justify-between active:scale-95 transition-transform ${
                  outOfStock ? 'opacity-50' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="text-start">
                  <p className="font-bold text-gray-900 dark:text-gray-50">
                    {[v.size, v.color].filter(Boolean).join(' · ') || t('pos.defaultVariant')}
                  </p>
                  {v.barcode && (
                    <p className="text-xs text-gray-400 font-mono" dir="ltr">{v.barcode}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t('inventory.quantity')}: {stock}
                  </p>
                </div>
                <div className="text-end flex flex-col items-end gap-1">
                  <p className="font-bold text-green-600">
                    {formatCurrency(v.selling_price ?? product.selling_price)}
                  </p>
                  {outOfStock && <Badge variant="danger">{t('pos.outOfStock')}</Badge>}
                </div>
              </button>
            )
          })
        )}
      </div>
    </BottomSheet>
  )
}
