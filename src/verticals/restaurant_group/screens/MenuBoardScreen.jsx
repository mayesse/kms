import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../../stores/authStore'
import { categoryRepository } from '../../../repositories/categoryRepository'
import { productRepository } from '../../../repositories/productRepository'
import { formatCurrency } from '../../../utils/format'
import { useTranslation } from 'react-i18next'

export default function MenuBoardScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const [activeCategory, setActiveCategory] = useState(null)

  const { data: categories } = useQuery({
    queryKey: ['menuCategories', storeId],
    queryFn: () => categoryRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const { data: products } = useQuery({
    queryKey: ['menuProducts', storeId, activeCategory],
    queryFn: () => productRepository.getAll(storeId, { categoryId: activeCategory || undefined }),
    enabled: !!storeId,
  })

  const grouped = {}
  ;(products || []).forEach(p => {
    const catName = p.categories?.name || 'أخرى'
    if (!grouped[catName]) grouped[catName] = []
    grouped[catName].push(p)
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 text-white">
      <header className="sticky top-0 z-10 bg-gradient-to-r from-green-700 to-green-600 px-4 py-4 shadow-lg">
        <h1 className="text-2xl font-black text-center tracking-wide">قائمة الطعام</h1>
      </header>

      <div className="sticky top-[72px] z-10 bg-gray-900/95 backdrop-blur px-2 py-2 overflow-x-auto flex gap-1">
        <button onClick={() => setActiveCategory(null)}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
            !activeCategory ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300'
          }`}>
          الكل
        </button>
        {(categories || []).map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              activeCategory === cat.id ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300'
            }`}>
            {cat.name}
          </button>
        ))}
      </div>

      <main className="p-4 space-y-6">
        {Object.entries(grouped).map(([catName, catProducts]) => (
          <div key={catName}>
            <h2 className="text-lg font-bold text-green-400 mb-3 border-b border-green-800 pb-1">{catName}</h2>
            <div className="grid grid-cols-2 gap-3">
              {catProducts.map((product, i) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="bg-gray-800/80 rounded-2xl p-3 border border-gray-700/50">
                  <div className="w-full aspect-video rounded-xl bg-gradient-to-br from-gray-700 to-gray-600 mb-2 flex items-center justify-center">
                    <span className="text-4xl">🍽️</span>
                  </div>
                  <p className="font-bold text-sm text-gray-100">{product.name}</p>
                  <p className="text-lg font-black text-green-400 mt-1">{formatCurrency(product.selling_price)}</p>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
        {products?.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">📋</p>
            <p>لا توجد منتجات متاحة حالياً</p>
          </div>
        )}
      </main>
    </motion.div>
  )
}
