import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../stores/authStore'
import { productRepository } from '../../../repositories/productRepository'
import { purchaseRepository } from '../../../repositories/purchaseRepository'
import { supplierRepository } from '../../../repositories/supplierRepository'
import SearchInput from '../../../components/SearchInput'
import FormInput from '../../../components/FormInput'
import FormSelect from '../../../components/FormSelect'
import { formatCurrency } from '../../../utils/format'
import { useTranslation } from 'react-i18next'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

export default function BulkOrderEntry({ onComplete, initialSupplier = '' }) {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [supplierId, setSupplierId] = useState(initialSupplier)
  const [items, setItems] = useState([])
  const [notes, setNotes] = useState('')

  const { data: suppliers } = useQuery({
    queryKey: ['bulkSuppliers', storeId],
    queryFn: () => supplierRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const { data: productResults } = useQuery({
    queryKey: ['bulkProducts', storeId, search],
    queryFn: () => productRepository.getAll(storeId, { search }),
    enabled: !!storeId && search.length > 0,
  })

  const createPurchase = useMutation({
    mutationFn: async () => {
      const total = items.reduce((sum, i) => sum + (i.qty * i.price), 0)
      const purchase = await purchaseRepository.create(storeId, {
        supplier_id: supplierId || null,
        total,
        notes,
        status: 'pending',
        payment_status: 'unpaid',
      })
      for (const item of items) {
        await purchaseRepository.addItem(storeId, purchase.id, {
          product_id: item.id,
          product_name: item.name,
          qty: item.qty,
          unit_cost: item.price,
          total: item.qty * item.price,
        })
      }
      return purchase
    },
    onSuccess: (purchase) => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      toast.success('تم إنشاء أمر الشراء')
      onComplete?.(purchase)
      setItems([])
      setNotes('')
    },
    onError: () => toast.error('فشل إنشاء أمر الشراء'),
  })

  const addItem = (product) => {
    if (items.find(i => i.id === product.id)) {
      toast.error('المنتج مضاف مسبقاً')
      return
    }
    setItems(prev => [...prev, {
      id: product.id,
      name: product.name,
      qty: 1,
      price: parseFloat(product.purchase_price || product.selling_price || 0),
    }])
    setSearch('')
  }

  const updateItem = (id, field, value) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id))

  const total = useMemo(() =>
    items.reduce((sum, i) => sum + (parseFloat(i.qty) || 0) * (parseFloat(i.price) || 0), 0),
  [items])

  const supplierOptions = useMemo(() => [
    { value: '', label: 'بدون مورد' },
    ...(suppliers || []).map(s => ({ value: s.id, label: s.name })),
  ], [suppliers])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <FormSelect value={supplierId} onChange={setSupplierId} options={supplierOptions} label="المورد" />

      <div className="space-y-2">
        <SearchInput value={search} onChange={setSearch} placeholder="ابحث عن منتج..." />
        {search && productResults && (
          <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-xl divide-y divide-gray-100 dark:divide-gray-700">
            {productResults.map(p => (
              <button key={p.id} onClick={() => addItem(p)}
                className="w-full px-3 py-2 text-start text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between">
                <span className="font-semibold text-gray-900 dark:text-gray-50">{p.name}</span>
                <span className="text-gray-500 text-xs">{formatCurrency(p.purchase_price || p.selling_price)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map(item => (
              <div key={item.id} className="py-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">{item.name}</p>
                </div>
                <input type="number" value={item.qty} onChange={e => updateItem(item.id, 'qty', parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-center" dir="ltr" />
                <input type="number" value={item.price} onChange={e => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-center" dir="ltr" />
                <span className="text-xs text-gray-500 w-20 text-end">{formatCurrency(item.qty * item.price)}</span>
                <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 p-1">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
            <span className="font-bold text-gray-900 dark:text-gray-50">المجموع</span>
            <span className="text-lg font-black text-green-600">{formatCurrency(total)}</span>
          </div>

          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="ملاحظات (اختياري)"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm resize-none h-20"
            dir="rtl" />

          <button onClick={() => createPurchase.mutate()} disabled={createPurchase.isPending || items.length === 0}
            className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-transform">
            {createPurchase.isPending ? 'جاري الإنشاء...' : `إنشاء أمر شراء (${formatCurrency(total)})`}
          </button>
        </>
      )}

      {items.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-4xl mb-2">📦</p>
          <p className="text-sm">ابحث عن منتجات وأضفها للأمر</p>
        </div>
      )}
    </motion.div>
  )
}
