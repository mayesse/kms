import { motion } from 'framer-motion'
import { formatCurrency } from '../../../utils/format'
import Badge from '../../../components/Badge'
import { useTranslation } from 'react-i18next'

export default function ProductCard({ product, index, onTap }) {
  const { t } = useTranslation()
  const stockColor = product.quantity < 0 ? 'text-red-600 font-bold' :
    product.quantity <= product.min_stock_threshold ? 'text-amber-600' : 'text-green-600'

  const hasCarInfo = product.car_make || product.car_model || product.car_oem

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={onTap}
      className={`card cursor-pointer active:scale-[0.98] transition-transform ${
        product.quantity < 0 ? 'border-red-200 dark:border-red-800' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-900 dark:text-gray-50 truncate">{product.name}</p>
            {product.categories?.name && (
              <Badge variant="info" className="shrink-0">{product.categories.name}</Badge>
            )}
          </div>
          {product.barcode && (
            <p className="text-xs text-gray-400 mt-0.5 font-mono" dir="ltr">{product.barcode}</p>
          )}
          {hasCarInfo && (
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5 truncate" dir="ltr">
              {[product.car_make, product.car_model, product.car_year].filter(Boolean).join(' / ')}
              {product.car_oem ? ` • OEM: ${product.car_oem}` : ''}
            </p>
          )}
        </div>
        <span className={`text-sm font-bold ${stockColor}`}>{product.quantity}</span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm text-green-600 font-semibold">
          {formatCurrency(product.selling_price)}
          {product.base_unit && <span className="text-[10px] text-gray-400 font-normal">/{product.base_unit}</span>}
        </span>
        <span className="text-xs text-gray-400">{formatCurrency(product.purchase_price)} {t('inventory.buyLabel')}</span>
      </div>
    </motion.div>
  )
}
