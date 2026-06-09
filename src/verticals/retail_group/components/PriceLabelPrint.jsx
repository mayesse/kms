import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../stores/authStore'
import { productRepository } from '../../../repositories/productRepository'
import SearchInput from '../../../components/SearchInput'
import LoadingSkeleton from '../../../components/LoadingSkeleton'
import FormInput from '../../../components/FormInput'
import { formatCurrency } from '../../../utils/format'
import { useTranslation } from 'react-i18next'

export default function PriceLabelPrint({ onClose }) {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [labelCount, setLabelCount] = useState(1)
  const [showPrice, setShowPrice] = useState(true)
  const [showBarcode, setShowBarcode] = useState(true)

  const { data: products, isLoading } = useQuery({
    queryKey: ['priceLabelProducts', storeId, search],
    queryFn: () => productRepository.getAll(storeId, { search }),
    enabled: !!storeId,
  })

  const toggleProduct = (product) => {
    setSelected(prev =>
      prev.find(p => p.id === product.id)
        ? prev.filter(p => p.id !== product.id)
        : [...prev, product]
    )
  }

  const handlePrint = () => {
    if (selected.length === 0) return
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    const labels = []
    selected.forEach(product => {
      for (let i = 0; i < labelCount; i++) {
        labels.push(`
          <div style="padding: 12px; border-bottom: 1px dashed #ccc; text-align: center; font-family: Arial, sans-serif; page-break-inside: avoid;">
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 4px;">${product.categories?.name || ''}</div>
            <div style="font-size: 14px; margin-bottom: 8px;">${product.name}</div>
            ${showPrice ? `<div style="font-size: 24px; font-weight: bold; margin-bottom: 4px;">${formatCurrency(product.selling_price)}</div>` : ''}
            ${showBarcode && product.barcode ? `<div style="font-size: 10px; color: #666; margin-top: 4px;">${product.barcode}</div>` : ''}
          </div>
        `)
      }
    })
    printWindow.document.write(`
      <html dir="rtl"><head><title>طباعة بطاقات الأسعار</title></head>
      <body style="margin:0;padding:0;">${labels.join('')}
      <script>window.onload=function(){window.print();window.close()}</script></body></html>
    `)
    printWindow.document.close()
    toast.success(`جاري طباعة ${labels.length} بطاقة`)
    onClose?.()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <SearchInput value={search} onChange={setSearch} placeholder="بحث عن منتج..." />
      <div className="flex items-center gap-4 flex-wrap">
        <FormInput label="عدد النسخ" type="number" value={String(labelCount)} onChange={v => setLabelCount(parseInt(v) || 1)} dir="ltr" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} className="rounded" />
          السعر
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showBarcode} onChange={e => setShowBarcode(e.target.checked)} className="rounded" />
          الباركود
        </label>
      </div>
      {isLoading ? <LoadingSkeleton count={4} /> : (
        <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          {(products || []).map(product => {
            const isSelected = selected.find(p => p.id === product.id)
            return (
              <button
                key={product.id}
                onClick={() => toggleProduct(product)}
                className={`w-full px-3 py-2.5 flex items-center justify-between text-start hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                  isSelected ? 'bg-green-50 dark:bg-green-900/20' : ''
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{product.name}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(product.selling_price)}</p>
                </div>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  isSelected ? 'bg-green-600 border-green-600' : 'border-gray-300'
                }`}>
                  {isSelected && <span className="text-white text-xs">✓</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}
      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-gray-500">{selected.length} منتج</p>
        <button onClick={handlePrint} disabled={selected.length === 0}
          className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform">
          طباعة {selected.length > 0 ? `(${selected.length * labelCount})` : ''}
        </button>
      </div>
    </motion.div>
  )
}
