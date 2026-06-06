import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../stores/authStore'
import { productRepository } from '../../../repositories/productRepository'
import { categoryRepository } from '../../../repositories/categoryRepository'
import SearchInput from '../../../components/SearchInput'
import LoadingSkeleton from '../../../components/LoadingSkeleton'
import FormInput from '../../../components/FormInput'
import FormSelect from '../../../components/FormSelect'
import { formatCurrency } from '../../../utils/format'
import { useTranslation } from 'react-i18next'

export default function BulkPriceEditor({ onClose }) {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [adjustMode, setAdjustMode] = useState('percentage')
  const [adjustValue, setAdjustValue] = useState('')

  const { data: categories } = useQuery({
    queryKey: ['categories', storeId],
    queryFn: () => categoryRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const { data: products, isLoading } = useQuery({
    queryKey: ['bulkPriceProducts', storeId, search, categoryFilter],
    queryFn: () => productRepository.getAll(storeId, { search, categoryId: categoryFilter || undefined }),
    enabled: !!storeId,
  })

  const updateMutation = useMutation({
    mutationFn: async ({ ids, multiplier, fixedAmount, mode }) => {
      const results = []
      for (const id of ids) {
        const product = products.find(p => p.id === id)
        if (!product) continue
        let newPrice
        if (mode === 'percentage') {
          newPrice = parseFloat(product.selling_price) * (1 + multiplier / 100)
        } else {
          newPrice = parseFloat(product.selling_price) + fixedAmount
        }
        newPrice = Math.max(0, Math.round(newPrice * 100) / 100)
        await productRepository.update(storeId, id, { selling_price: newPrice })
        results.push({ id, name: product.name, oldPrice: product.selling_price, newPrice })
      }
      return results
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['bulkPriceProducts'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success(`تم تحديث ${results.length} منتج`)
      onClose?.()
    },
    onError: () => toast.error('فشل تحديث الأسعار'),
  })

  const toggleAll = () => {
    if (!products) return
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(products.map(p => p.id)))
    }
  }

  const toggleProduct = (id) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const handleApply = () => {
    if (selectedIds.size === 0) { toast.error('اختر منتجات أولاً'); return }
    const val = parseFloat(adjustValue)
    if (isNaN(val) || val === 0) { toast.error('أدخل قيمة صالحة'); return }
    updateMutation.mutate({
      ids: [...selectedIds],
      multiplier: val,
      fixedAmount: val,
      mode: adjustMode,
    })
  }

  const categoryOptions = useMemo(() => [
    { value: '', label: 'كل الفئات' },
    ...(categories || []).map(c => ({ value: c.id, label: c.name })),
  ], [categories])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[120px]">
          <SearchInput value={search} onChange={setSearch} placeholder="بحث..." />
        </div>
        <div className="w-40">
          <FormSelect value={categoryFilter} onChange={setCategoryFilter} options={categoryOptions} />
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
        <FormSelect
          value={adjustMode}
          onChange={setAdjustMode}
          options={[
            { value: 'percentage', label: 'نسبة مئوية %' },
            { value: 'fixed', label: 'قيمة ثابتة' },
          ]}
        />
        <FormInput
          label={adjustMode === 'percentage' ? 'نسبة التغيير (%)' : 'القيمة (د.ج)'}
          type="number"
          value={adjustValue}
          onChange={setAdjustValue}
          dir="ltr"
        />
        <button onClick={handleApply} disabled={updateMutation.isPending || selectedIds.size === 0}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform">
          {updateMutation.isPending ? '...' : `تطبيق على ${selectedIds.size} منتج`}
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <button onClick={toggleAll} className="text-blue-600 font-semibold">
          {selectedIds.size === (products || []).length ? 'إلغاء الكل' : 'تحديد الكل'}
        </button>
        <span>({products?.length || 0} منتج)</span>
      </div>

      {isLoading ? <LoadingSkeleton count={6} /> : (
        <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          {(products || []).map(product => (
            <button key={product.id} onClick={() => toggleProduct(product.id)}
              className={`w-full px-3 py-2.5 flex items-center justify-between text-start hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                selectedIds.has(product.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">{product.name}</p>
                <p className="text-xs text-gray-500">{product.categories?.name || 'بدون فئة'}</p>
              </div>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mx-3">{formatCurrency(product.selling_price)}</p>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                selectedIds.has(product.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
              }`}>
                {selectedIds.has(product.id) && <span className="text-white text-xs">✓</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}
