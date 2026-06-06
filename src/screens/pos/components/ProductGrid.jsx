import { motion } from 'framer-motion'
import { formatCurrency } from '../../../utils/format'
import { PlusIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { usePosStore } from '../../../stores/posStore'

export default function ProductGrid({ products, onProductTap }) {
  const { t } = useTranslation()
  const cart = usePosStore(s => s.cart)
  const getCartQty = (productId) => {
    const items = cart.filter(i => i.product_id === productId)
    return items.reduce((sum, i) => sum + i.qty, 0)
  }
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 lg:gap-2.5">
      {products.map((product, i) => {
        const isLow = product.quantity <= product.min_stock_threshold
        const isNegative = product.quantity < 0
        const stockColor = isNegative ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-500'
        const catName = product.categories?.name || ''
        const catColors = {
          [t('categories.food')]: { bg: 'from-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700' },
          [t('categories.drinks')]: { bg: 'from-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
          [t('categories.electronics')]: { bg: 'from-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
          [t('categories.clothing')]: { bg: 'from-pink-50', border: 'border-pink-200', badge: 'bg-pink-100 text-pink-700' },
        }
        const catStyle = Object.entries(catColors).find(([k]) => catName.includes(k))?.[1]

        const cartQty = getCartQty(product.id)
        const isInCart = cartQty > 0
        return (
          <motion.button
            key={product.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            onClick={() => onProductTap(product)}
            className={`relative bg-white dark:bg-gray-800 rounded-xl border transition-all active:scale-[0.97] text-start ${
              isNegative
                ? 'border-red-200 dark:border-red-800'
                : isInCart
                  ? 'border-green-300 dark:border-green-600'
                  : catStyle?.border || 'border-gray-200 dark:border-gray-700'
            } shadow-sm overflow-hidden p-2.5 lg:p-2 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
              catStyle
                ? `bg-gradient-to-br ${catStyle.bg} to-white dark:from-gray-800 dark:to-gray-800 hover:border-green-300 dark:hover:border-green-700`
                : 'hover:border-green-300 dark:hover:border-green-700 lg:hover:bg-gradient-to-br lg:hover:from-green-50 lg:hover:to-white dark:hover:from-gray-800'
            }`}
          >
            {/* Stock badge */}
            <div className="absolute top-1.5 start-1.5 z-[1]">
              <span className={`inline-flex items-center px-1 py-0.5 rounded text-[10px] font-bold ${
                isNegative
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                  : isLow
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                    : catStyle?.badge || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {product.quantity}
              </span>
              {isNegative && <span className="inline-block w-1 h-1 rounded-full bg-red-500 ms-1 align-middle" />}
            </div>

            {/* Cart quantity badge */}
            {isInCart && (
              <div className="absolute top-1.5 end-1.5 z-[1] bg-green-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                {cartQty}
              </div>
            )}

            {/* Product name */}
            <p className="font-bold text-sm lg:text-xs text-gray-900 dark:text-gray-50 truncate text-end mt-4 lg:mt-3">
              {product.name}
            </p>

            {/* Category */}
            {catName && (
              <p className={`text-[10px] mt-0.5 text-end truncate ${catStyle?.badge ? catStyle.badge.replace('bg-', 'text-').replace('100', '400').replace('700', '600') : 'text-gray-400'}`}>
                {catName}
              </p>
            )}

            {/* Price */}
            <p className="lg:bg-gradient-to-r lg:from-transparent lg:to-green-50 dark:lg:to-transparent lg:-mx-2 lg:px-2 lg:pb-1 lg:pt-2 mt-1 lg:mt-2">
              <span className="text-green-600 dark:text-green-400 font-extrabold text-base lg:text-sm text-end block" dir="ltr">
                {formatCurrency(product.selling_price)}
              </span>
            </p>

            {/* Stock indicator */}
            <div className="flex items-center justify-between mt-1">
              <span className={`text-[10px] font-medium ${stockColor}`}>
                {product.quantity}
              </span>
              <span className={`w-6 h-6 flex items-center justify-center rounded-lg transition-all lg:shadow-sm ${
                isInCart
                  ? 'bg-green-500 text-white'
                  : 'bg-green-100 dark:bg-gray-700 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-800'
              }`}>
                {isInCart ? <CheckIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
              </span>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
