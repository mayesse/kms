import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { hasFeature, F } from '../../utils/businessTypes'
import { productRepository } from '../../repositories/productRepository'
import PharmacyExpiryBanner from '../../components/PharmacyExpiryBanner'
import SearchInput from '../../components/SearchInput'
import FilterChips from '../../components/FilterChips'
import CategoryFilter from '../../components/CategoryFilter'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import ErrorState from '../../components/ErrorState'
import Badge from '../../components/Badge'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../../utils/format'
import ProductForm from './components/ProductForm'
import ProductDetailSheet from './components/ProductDetailSheet'
import LowStockBanner from './components/LowStockBanner'
import CategoryManager from './components/CategoryManager'
import ExcelImportSheet from './components/ExcelImportSheet'

export default function InventoryScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const businessType = useAuthStore(s => s.businessType)
  const showExpiryAlerts = hasFeature(businessType, F.EXPIRY_ALERTS)
  const searchRef = useRef(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [categoryId, setCategoryId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [detailProduct, setDetailProduct] = useState(null)
  const [showCategories, setShowCategories] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const kbBufferRef = useRef('')
  const kbTimerRef = useRef(null)

  const filters = {}
  if (search) filters.search = search
  if (filter === 'low') filters.lowStockOnly = true
  if (filter === 'noBarcode') filters.noBarcode = true
  if (categoryId) filters.categoryId = categoryId

  const { data: products, isLoading, error, refetch } = useQuery({
    queryKey: ['products', storeId, search, filter, categoryId],
    queryFn: () => productRepository.getAll(storeId, filters),
    enabled: !!storeId,
  })

  const { data: lowStockProducts } = useQuery({
    queryKey: ['lowStock', storeId],
    queryFn: () => productRepository.getLowStock(storeId),
    enabled: !!storeId,
  })

  const filterOptions = [
    { value: 'all', label: t('inventory.all') },
    { value: 'low', label: t('inventory.lowStock') },
    { value: 'noBarcode', label: t('inventory.noBarcode') },
  ]

  useEffect(() => {
    const onKeyDown = async (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target
      const tag = target?.tagName?.toLowerCase?.()
      const isTypingField =
        tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable
      if (isTypingField) return

      if (e.key === 'Escape') {
        if (searchRef.current) { searchRef.current.focus(); return }
        return
      }

      if (e.key === 'Enter') {
        const raw = kbBufferRef.current
        kbBufferRef.current = ''
        if (kbTimerRef.current) window.clearTimeout(kbTimerRef.current)
        kbTimerRef.current = null
        const code = raw?.replace(/^\*+/, '').replace(/\*+$/, '')
        if (!code || code.length < 4 || !storeId) return

        setSearch(code)
        try {
          const product = await productRepository.getByBarcode(storeId, code)
          if (product) {
            setDetailProduct(product)
          } else {
            toast.error(t('pos.barcodeNotFound'))
          }
        } catch {
          toast.error(t('common.error'))
        }
        return
      }

      if (e.key.length === 1 && /[0-9A-Za-z*]/.test(e.key)) {
        kbBufferRef.current += e.key
        if (kbTimerRef.current) window.clearTimeout(kbTimerRef.current)
        kbTimerRef.current = window.setTimeout(() => {
          kbBufferRef.current = ''
          kbTimerRef.current = null
        }, 120)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (kbTimerRef.current) window.clearTimeout(kbTimerRef.current)
    }
  }, [storeId])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('inventory.title')}</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowImport(true)} className="btn-ghost text-sm text-amber-600 font-semibold">
              📥 {t('inventory.importBtn')}
            </button>
            <button onClick={() => setShowCategories(true)} className="btn-ghost text-sm text-blue-600">
              🏷️ {t('inventory.categories')}
            </button>
            <button onClick={() => { setEditProduct(null); setShowForm(true) }} className="btn-ghost text-green-600 font-semibold">
              {t('inventory.add')}
            </button>
          </div>
        </div>
        <SearchInput ref={searchRef} value={search} onChange={setSearch} placeholder={t('inventory.search')} />
        <FilterChips options={filterOptions} value={filter} onChange={setFilter} />

        {/* Category filter */}
        <CategoryFilter value={categoryId} onChange={setCategoryId} />
      </header>

      {showExpiryAlerts && (
        <div className="px-4 pt-2">
          <PharmacyExpiryBanner storeId={storeId} />
        </div>
      )}

      {/* Low stock banner */}
      {lowStockProducts?.length > 0 && (
        <LowStockBanner count={lowStockProducts.length} onTap={() => setFilter('low')} />
      )}

      {/* Product table */}
      <main className="px-4 pt-3 pb-4">
        {isLoading ? <LoadingSkeleton count={6} /> :
         error ? <ErrorState message={error.message} onRetry={refetch} /> :
         products?.length === 0 ? (
           <EmptyState icon="📦" title={t('inventory.empty')} subtitle={t('inventory.emptySubtitle')}
             actionLabel={t('inventory.add')} onAction={() => setShowForm(true)} />
         ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <span>{t('inventory.product')}</span>
              <span className="text-center w-16">{t('inventory.quantity')}</span>
              <span className="text-center w-20">{t('inventory.purchasePrice')}</span>
              <span className="text-center w-20">{t('inventory.sellingPrice')}</span>
            </div>

            {/* Product rows */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {products.map((p, i) => {
                const isLow = p.quantity <= p.min_stock_threshold
                const isNegative = p.quantity < 0

                return (
                  <motion.button
                    key={p.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => setDetailProduct(p)}
                    className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-3 py-3 text-start
                               hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-700/50
                               transition-colors"
                  >
                    {/* Product name + badges */}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-50 truncate">
                        {p.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {p.categories?.name && (
                          <span
                            className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded text-white truncate max-w-[80px]"
                            style={{ backgroundColor: p.categories?.color || '#6b7280' }}
                          >
                            {p.categories.name}
                          </span>
                        )}
                        {isNegative && (
                          <Badge variant="danger">{t('inventory.negative')}</Badge>
                        )}
                        {!isNegative && isLow && (
                          <Badge variant="warning">{t('inventory.expiring')}</Badge>
                        )}
                        {p.barcode && (
                          <span className="text-[10px] text-gray-400 font-mono" dir="ltr">
                            {p.barcode}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stock */}
                    <div className="text-center w-16">
                      <p className={`text-sm font-bold ${
                        isNegative ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-900 dark:text-gray-50'
                      }`}>
                        {p.quantity}
                      </p>
                      <p className="text-[10px] text-gray-400">{t('inventory.inStock')}</p>
                    </div>

                    {/* Purchase price */}
                    <div className="text-center w-20">
                      <p className="text-xs text-gray-600 dark:text-gray-300 font-medium" dir="ltr">
                        {formatCurrency(p.purchase_price)}
                      </p>
                    </div>

                    {/* Selling price */}
                    <div className="text-center w-20">
                      <p className="text-xs text-green-600 font-bold" dir="ltr">
                        {formatCurrency(p.selling_price)}
                      </p>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </>
         )
        }
      </main>

      <ProductForm isOpen={showForm} onClose={() => setShowForm(false)} product={editProduct} />
      <CategoryManager isOpen={showCategories} onClose={() => setShowCategories(false)} />
      <ExcelImportSheet isOpen={showImport} onClose={() => setShowImport(false)} />
      <ProductDetailSheet product={detailProduct} onClose={() => setDetailProduct(null)}
        onEdit={(p) => { setDetailProduct(null); setEditProduct(p); setShowForm(true) }} />
    </motion.div>
  )
}
