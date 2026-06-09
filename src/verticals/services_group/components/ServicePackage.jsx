import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../stores/authStore'
import { productRepository } from '../../../repositories/productRepository'
import SearchInput from '../../../components/SearchInput'
import FormInput from '../../../components/FormInput'
import { formatCurrency } from '../../../utils/format'
import { useTranslation } from 'react-i18next'
import { PlusIcon, TrashIcon, GiftIcon } from '@heroicons/react/24/outline'

export default function ServicePackage({ onSave, initialItems = [], initialDiscount = 0 }) {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const [items, setItems] = useState(initialItems)
  const [packageDiscount, setPackageDiscount] = useState(initialDiscount)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const { data: products } = useQuery({
    queryKey: ['servicePackageProducts', storeId, search],
    queryFn: () => productRepository.getAll(storeId, { search }),
    enabled: !!storeId && search.length > 0,
  })

  const addItem = (product) => {
    if (items.find(i => i.id === product.id)) {
      toast.error('المنتج مضاف مسبقاً')
      return
    }
    setItems(prev => [...prev, { ...product, qty: 1 }])
    setShowSearch(false)
    setSearch('')
  }

  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id))
  const updateQty = (id, qty) => setItems(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, qty) } : i))

  const subtotal = items.reduce((sum, i) => sum + parseFloat(i.selling_price || 0) * i.qty, 0)
  const discountAmount = subtotal * (packageDiscount / 100)
  const total = subtotal - discountAmount

  const handleSave = () => {
    if (items.length === 0) { toast.error('أضف منتجات للحزمة'); return }
    onSave?.({ items: items.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.selling_price })), packageDiscount, subtotal, total })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-50 flex items-center gap-1">
          <GiftIcon className="h-4 w-4 text-green-600" /> حزمة خدمات
        </h3>
        <button onClick={() => setShowSearch(!showSearch)}
          className="h-8 w-8 rounded-full bg-green-600 text-white flex items-center justify-center active:scale-90 transition-transform">
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
            <SearchInput value={search} onChange={setSearch} placeholder="ابحث عن منتج..." />
            {search && products && (
              <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-xl divide-y divide-gray-100 dark:divide-gray-700">
                {products.map(p => (
                  <button key={p.id} onClick={() => addItem(p)}
                    className="w-full px-3 py-2 text-start text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <span className="text-gray-900 dark:text-gray-50 font-semibold">{p.name}</span>
                    <span className="text-gray-500 me-2">{formatCurrency(p.selling_price)}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">{item.name}</p>
              <p className="text-xs text-gray-500">{formatCurrency(item.selling_price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => updateQty(item.id, item.qty - 1)}
                className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center active:scale-90">-</button>
              <span className="text-sm font-bold w-6 text-center">{item.qty}</span>
              <button onClick={() => updateQty(item.id, item.qty + 1)}
                className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center active:scale-90">+</button>
              <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 p-1">
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">المجموع الفرعي</span>
          <span className="font-semibold text-gray-900 dark:text-gray-50">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">الخصم</span>
          <div className="flex items-center gap-2">
            <input type="number" value={packageDiscount} onChange={e => setPackageDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              className="w-16 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-center" dir="ltr" />
            <span className="text-gray-500">%</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
          <span className="text-gray-900 dark:text-gray-50">المجموع</span>
          <span className="text-green-600">{formatCurrency(total)}</span>
        </div>
      </div>

      <button onClick={handleSave} disabled={items.length === 0}
        className="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform">
        حفظ الحزمة
      </button>
    </motion.div>
  )
}
