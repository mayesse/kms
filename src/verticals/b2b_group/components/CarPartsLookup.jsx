import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../../stores/authStore'
import { productRepository } from '../../../repositories/productRepository'
import SearchInput from '../../../components/SearchInput'
import LoadingSkeleton from '../../../components/LoadingSkeleton'
import EmptyState from '../../../components/EmptyState'
import FormInput from '../../../components/FormInput'
import { formatCurrency } from '../../../utils/format'
import { useTranslation } from 'react-i18next'

const CAR_MAKES = [
  'Renault', 'Peugeot', 'Citroën', 'Volkswagen', 'Toyota', 'Hyundai',
  'Kia', 'Mercedes', 'BMW', 'Audi', 'Fiat', 'Ford', 'Nissan', 'Dacia',
  'Seat', 'Skoda', 'Suzuki', 'Mitsubishi', 'Honda', 'Mazda',
]

export default function CarPartsLookup() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const [search, setSearch] = useState('')
  const [carMake, setCarMake] = useState('')
  const [carModel, setCarModel] = useState('')
  const [carYear, setCarYear] = useState('')
  const [carOem, setCarOem] = useState('')

  const filters = useMemo(() => ({
    search: search || undefined,
    carMake: carMake || undefined,
    carModel: carModel || undefined,
    carYear: carYear || undefined,
    carOem: carOem || undefined,
  }), [search, carMake, carModel, carYear, carOem])

  const { data: products, isLoading } = useQuery({
    queryKey: ['carPartsLookup', storeId, filters],
    queryFn: () => productRepository.getAll(storeId, filters),
    enabled: !!storeId && (!!search || !!carMake || !!carModel || !!carYear || !!carOem),
  })

  const clearFilters = () => {
    setSearch('')
    setCarMake('')
    setCarModel('')
    setCarYear('')
    setCarOem('')
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-gray-500 mb-1 block">الماركة</label>
          <select value={carMake} onChange={e => setCarMake(e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm">
            <option value="">الكل</option>
            {CAR_MAKES.map(make => <option key={make} value={make}>{make}</option>)}
          </select>
        </div>
        <FormInput label="الموديل" value={carModel} onChange={setCarModel} placeholder="مثال: Clio" />
        <FormInput label="السنة" value={carYear} onChange={setCarYear} placeholder="مثال: 2020" dir="ltr" />
        <FormInput label="رقم OEM" value={carOem} onChange={setCarOem} placeholder="OEM..." dir="ltr" />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <SearchInput value={search} onChange={setSearch} placeholder="بحث باسم القطعة..." />
        </div>
        <button onClick={clearFilters}
          className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold">
          مسح
        </button>
      </div>

      {isLoading ? <LoadingSkeleton count={5} /> : (
        <div className="space-y-2">
          {!products ? (
            <EmptyState icon="🚗" title="ابحث عن قطع غيار" subtitle="استخدم الفلتر أعلاه للبحث" />
          ) : products.length === 0 ? (
            <EmptyState icon="🔍" title="لا توجد نتائج" subtitle="جرب تغيير معايير البحث" />
          ) : (
            products.map((product, i) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-50 truncate">{product.name}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {product.car_make && <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">{product.car_make}</span>}
                      {product.car_model && <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">{product.car_model}</span>}
                      {product.car_year && <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">{product.car_year}</span>}
                      {product.car_oem && <span className="text-[10px] font-mono bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">OEM: {product.car_oem}</span>}
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="text-base font-black text-green-600">{formatCurrency(product.selling_price)}</p>
                    <p className={`text-[11px] ${product.quantity <= product.min_stock_threshold ? 'text-red-500' : 'text-gray-500'}`}>
                      {product.quantity} في المخزون
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </motion.div>
  )
}
