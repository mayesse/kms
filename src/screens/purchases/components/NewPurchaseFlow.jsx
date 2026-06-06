import { useRef, useCallback, useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../stores/authStore'
import { usePurchaseStore } from '../../../stores/purchaseStore'
import { supabase } from '../../../lib/supabase'
import { supplierRepository } from '../../../repositories/supplierRepository'
import { productRepository } from '../../../repositories/productRepository'
import { purchaseRepository } from '../../../repositories/purchaseRepository'
import BottomSheet from '../../../components/BottomSheet'
import FormInput from '../../../components/FormInput'
import FormSelect from '../../../components/FormSelect'
import BarcodeScanner from '../../../components/BarcodeScanner'
import UnitSelectionSheet from '../../pos/components/UnitSelectionSheet'
import { formatCurrency } from '../../../utils/format'
import { parseReceiptText } from '../../../utils/receiptParser'
import { useTranslation } from 'react-i18next'
import {
  XMarkIcon, PlusIcon, TrashIcon,
  MagnifyingGlassIcon, QrCodeIcon, DocumentArrowUpIcon, CameraIcon,
} from '@heroicons/react/24/outline'

export default function NewPurchaseFlow({ isOpen, onClose }) {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const {
    supplierId,
    setSupplierId,
    items,
    setItems,
    note,
    setNote,
    paymentStatus,
    setPaymentStatus,
    amountPaid,
    setAmountPaid,
    clearDraft,
  } = usePurchaseStore()
  const queryClient = useQueryClient()
  const searchRef = useRef(null)

  // State
  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [newSupplierPhone, setNewSupplierPhone] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [unitSelectionProduct, setUnitSelectionProduct] = useState(null)
  const [discountType, setDiscountType] = useState('dzd') // dzd | percent
  const [discountValue, setDiscountValue] = useState('')
  const [manualSearchRowIdx, setManualSearchRowIdx] = useState(null)
  const [manualRowQuery, setManualRowQuery] = useState('')
  const [showReceiptUpload, setShowReceiptUpload] = useState(false)
  const [receiptPhoto, setReceiptPhoto] = useState(null)
  const [receiptPasteText, setReceiptPasteText] = useState('')
  const [showReceiptReview, setShowReceiptReview] = useState(false)
  const [parsedRows, setParsedRows] = useState([])
  const [receiptSearchQ, setReceiptSearchQ] = useState('')
  const [receiptSearchResults, setReceiptSearchResults] = useState([])
  const [receiptActiveRow, setReceiptActiveRow] = useState(null)
  const autoBarcodeRef = useRef({ value: '', at: 0 })
  const kbBufferRef = useRef('')
  const kbTimerRef = useRef(null)

  // Queries
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', storeId],
    queryFn: () => supplierRepository.getAll(storeId),
    enabled: !!storeId && isOpen,
  })

  const { data: searchResults } = useQuery({
    queryKey: ['purchaseSearch', storeId, searchQuery],
    queryFn: () => productRepository.getAll(storeId, { search: searchQuery }),
    enabled: !!storeId && searchQuery.length >= 1,
  })

  // Computed
  const subtotal = items.reduce((s, i) => s + (i.quantity * i.purchase_price), 0)
  const discountNumeric = parseFloat(discountValue || 0)
  const discountAmount = discountType === 'percent'
    ? Math.min(subtotal, subtotal * (Math.max(0, discountNumeric) / 100))
    : Math.min(subtotal, Math.max(0, discountNumeric))
  const total = Math.max(0, subtotal - discountAmount)

  // Add product to items list
  const addProduct = useCallback((product, unit = null) => {
    const unitName = unit ? unit.name : (product.base_unit || 'قطعة')
    const uniqueId = `${product.id}_${unitName}`

    const existingIdx = items.findIndex(i => i.unique_id === uniqueId)
    if (existingIdx >= 0) {
      setItems(prev => prev.map((item, idx) =>
        idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
      ))
    } else {
      setItems(prev => [...prev, {
        unique_id: uniqueId,
        product_id: product.id,
        product_name: product.name,
        unit_name: unitName,
        conversion_rate: unit ? parseFloat(unit.conversion_rate) : 1,
        barcode: product.barcode || '',
        quantity: 1,
        purchase_price: unit ? parseFloat(unit.purchase_price) : parseFloat(product.purchase_price || 0),
        selling_price: unit ? parseFloat(unit.selling_price) : parseFloat(product.selling_price || 0),
        current_stock: product.quantity || 0,
      }])
    }
    setSearchQuery('')
    setShowSearch(false)
  }, [items, setItems])

  const handleProductSelect = (product) => {
    if (product.product_units && product.product_units.length > 0) {
      setUnitSelectionProduct(product)
      setShowSearch(false)
    } else {
      addProduct(product)
    }
  }

  const handleUnitSelect = (unit) => {
    addProduct(unitSelectionProduct, unit)
    setUnitSelectionProduct(null)
  }

  // Add empty row for manual entry
  const addEmptyRow = () => {
    setItems(prev => [...prev, {
      product_id: null,
      product_name: '',
      barcode: '',
      quantity: 1,
      purchase_price: 0,
      selling_price: 0,
      current_stock: 0,
      isManual: true,
    }])
  }

  const selectManualRowProduct = (rowIdx, product) => {
    const replacement = {
      unique_id: `${product.id}_${product.base_unit || 'قطعة'}`,
      product_id: product.id,
      product_name: product.name,
      unit_name: product.base_unit || 'قطعة',
      conversion_rate: 1,
      barcode: product.barcode || '',
      quantity: 1,
      purchase_price: parseFloat(product.purchase_price || 0),
      selling_price: parseFloat(product.selling_price || 0),
      current_stock: product.quantity || 0,
      isManual: false,
    }
    setItems(prev => prev.map((item, idx) => (idx === rowIdx ? replacement : item)))
    setManualSearchRowIdx(null)
    setManualRowQuery('')
  }

  // Update item field
  const updateItem = (index, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, [field]: value }
      return updated
    }))
  }

  // Remove item
  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  // Barcode scan
  const handleBarcodeScan = useCallback(async (barcode) => {
    setShowScanner(false)
    const product = await productRepository.getByBarcode(storeId, barcode)
    if (product) {
      const matchedUnit = product.product_units?.find(u => u.barcode === barcode)
      addProduct(product, matchedUnit)
      toast.success(t('purchases.productAdded', { name: product.name, unit: matchedUnit ? `(${matchedUnit.name})` : '' }))
    } else {
      toast.error(t('purchases.barcodeNotFound'))
      // Add empty row with barcode
      setItems(prev => [...prev, {
        product_id: null,
        product_name: '',
        barcode: barcode,
        quantity: 1,
        purchase_price: 0,
        selling_price: 0,
        current_stock: 0,
        isManual: true,
      }])
    }
  }, [storeId, addProduct, setItems])

  useEffect(() => {
    if (!isOpen || !storeId || !searchQuery) return
    const code = searchQuery.trim().replace(/^\*+/, '').replace(/\*+$/, '')
    if (code.length < 4 || !/^[0-9A-Za-z]+$/.test(code)) return

    const t = setTimeout(async () => {
      const now = Date.now()
      if (autoBarcodeRef.current.value === code && now - autoBarcodeRef.current.at < 700) return

      const product = await productRepository.getByBarcode(storeId, code)
      if (!product) return
      autoBarcodeRef.current = { value: code, at: Date.now() }

      const matchedUnit = product.product_units?.find(u => u.barcode === code)
      addProduct(product, matchedUnit)
      toast.success(t('purchases.productAdded', { name: product.name, unit: matchedUnit ? `(${matchedUnit.name})` : '' }))
    }, 120)

    return () => clearTimeout(t)
  }, [addProduct, isOpen, searchQuery, storeId])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (e) => {
      if (showScanner || showNewSupplier) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const target = e.target
      const tag = target?.tagName?.toLowerCase?.()
      const isTypingField =
        tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable
      if (isTypingField) return

      if (e.key === 'Enter') {
        const raw = kbBufferRef.current
        kbBufferRef.current = ''
        if (kbTimerRef.current) window.clearTimeout(kbTimerRef.current)
        kbTimerRef.current = null
        const code = raw?.replace(/^\*+/, '').replace(/\*+$/, '')
        if (code && code.length >= 4) handleBarcodeScan(code)
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
  }, [handleBarcodeScan, isOpen, showNewSupplier, showScanner])

  // Receipt upload handlers
  const handleReceiptPhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setReceiptPhoto(ev.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleReceiptParse = async () => {
    if (!receiptPasteText.trim()) return
    const parsed = parseReceiptText(receiptPasteText)
    if (parsed.length === 0) {
      toast.error(t('purchases.receiptParseError'))
      return
    }

    // Match each parsed row against inventory
    const matchedRows = []
    for (const row of parsed) {
      const { data: products } = await supabase
        .from('products')
        .select('id, name, barcode, purchase_price, selling_price, quantity, base_unit, stock_type')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .or(`name.ilike.%${row.product_name}%,barcode.ilike.%${row.product_name}%`)
        .limit(5)

      matchedRows.push({
        ...row,
        matchedProducts: products || [],
        selectedProduct: products?.[0] || null,
        confirmed: false,
      })
    }

    setParsedRows(matchedRows)
    setShowReceiptUpload(false)
    setShowReceiptReview(true)
  }

  const handleConfirmParsedRows = () => {
    for (const row of parsedRows) {
      if (!row.selectedProduct) {
        toast.error(t('purchases.productNotLinked', { name: row.product_name }))
        return
      }
    }

    // Add all matched rows to purchase items
    for (const row of parsedRows) {
      const p = row.selectedProduct
      const uniqueId = `${p.id}_${p.base_unit || 'قطعة'}`
      const existingIdx = items.findIndex(i => i.unique_id === uniqueId)
      const qty = row.quantity
      const unitPrice = row.unit_price

      if (existingIdx >= 0) {
        setItems(prev => prev.map((item, idx) =>
          idx === existingIdx ? { ...item, quantity: item.quantity + qty, purchase_price: unitPrice } : item
        ))
      } else {
        setItems(prev => [...prev, {
          unique_id: uniqueId,
          product_id: p.id,
          product_name: p.name,
          unit_name: p.base_unit || 'قطعة',
          conversion_rate: 1,
          barcode: p.barcode || '',
          quantity: qty,
          purchase_price: unitPrice,
          selling_price: parseFloat(p.selling_price || 0),
          current_stock: p.quantity || 0,
          isManual: false,
        }])
      }
    }

    setShowReceiptReview(false)
    setParsedRows([])
    toast.success(t('purchases.receiptProductsAdded', { count: parsedRows.length }))
  }

  const handleSelectProductForRow = (rowIdx, product) => {
    setParsedRows(prev => prev.map((row, i) =>
      i === rowIdx ? { ...row, selectedProduct: product, matchedProducts: [product] } : row
    ))
  }

  const handleCreateProductForRow = async (rowIdx) => {
    const row = parsedRows[rowIdx]
    if (!row) return
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          store_id: storeId,
          name: row.product_name,
          barcode: null,
          purchase_price: row.unit_price,
          selling_price: row.unit_price * 1.2,
          quantity: 0,
          min_stock_threshold: 5,
          stock_type: 'ready',
          base_unit: 'قطعة',
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error
      handleSelectProductForRow(rowIdx, data)
      toast.success(t('purchases.productCreated', { name: row.product_name }))
    } catch {
      toast.error(t('toast.saveFailed'))
    }
  }

  const fetchReceiptSearch = async (q) => {
    if (!q || q.length < 1) { setReceiptSearchResults([]); return }
    const { data } = await supabase
      .from('products')
      .select('id, name, barcode, purchase_price, selling_price, quantity, base_unit')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .or(`name.ilike.%${q}%,barcode.ilike.%${q}%`)
      .limit(8)
    setReceiptSearchResults(data || [])
  }

  // Debounced search for receipt review
  const receiptSearchTimerRef = useRef(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!receiptSearchQ || receiptSearchQ.length < 1) { setReceiptSearchResults([]); return }
    if (receiptSearchTimerRef.current) clearTimeout(receiptSearchTimerRef.current)
    receiptSearchTimerRef.current = setTimeout(() => fetchReceiptSearch(receiptSearchQ), 200)
    return () => { if (receiptSearchTimerRef.current) clearTimeout(receiptSearchTimerRef.current) }
  }, [receiptSearchQ, storeId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Add supplier
  const handleAddSupplier = async () => {
    if (!newSupplierName.trim()) return
    try {
      const s = await supplierRepository.create(storeId, {
        name: newSupplierName.trim(),
        phone: newSupplierPhone || null,
      })
      queryClient.invalidateQueries(['suppliers'])
      setSupplierId(s.id)
      setShowNewSupplier(false)
      setNewSupplierName('')
      setNewSupplierPhone('')
      toast.success(t('purchases.supplierAdded'))
    } catch { toast.error(t('toast.saveFailed')) }
  }

  // Confirm purchase
  const handleConfirm = async () => {
    if (!supplierId) { toast.error(t('purchases.selectSupplierFirst')); return }
    if (items.length === 0) { toast.error(t('purchases.addProductsFirst')); return }
    const hasUnlinkedRows = items.some(i => !i.product_id)
    if (hasUnlinkedRows) {
      toast.error(t('purchases.unlinkedRowsError'))
      return
    }
    const validItems = items.filter(i => i.product_name && i.purchase_price > 0 && i.quantity > 0 && i.product_id)
    if (validItems.length === 0) { toast.error(t('purchases.checkProductData')); return }

    setLoading(true)
    try {
      const paidAmount = paymentStatus === 'paid' ? total
        : paymentStatus === 'partial' ? parseFloat(amountPaid || 0) : 0
      await purchaseRepository.create(
        storeId,
        supplierId,
        validItems,
        note,
        paidAmount,
        { type: discountType, value: discountNumeric || 0 }
      )
      queryClient.invalidateQueries(['purchases'])
      queryClient.invalidateQueries(['products'])
      queryClient.invalidateQueries(['stockValue'])
      queryClient.invalidateQueries(['supplierDebts'])
      toast.success(t('toast.purchaseConfirmed'))
      // Reset
      clearDraft()
      setDiscountType('dzd')
      setDiscountValue('')
      onClose()
    } catch (err) {
      toast.error(err?.message || t('toast.saveFailed'))
    } finally { setLoading(false) }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('purchases.newPurchase')}</h1>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Supplier selector */}
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <FormSelect value={supplierId} onChange={setSupplierId}
                options={(suppliers || []).map(s => ({ value: s.id, label: s.name }))}
                placeholder={t('purchases.selectSupplier')} />
            </div>
            <button onClick={() => setShowNewSupplier(true)}
              className="h-12 px-3 rounded-xl bg-green-600 text-white text-sm font-semibold active:scale-95 transition-transform shrink-0">
              + {t('purchases.supplier')}
            </button>
          </div>
        </div>
      </header>

        {/* Receipt upload button */}
        <div className="px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <button onClick={() => setShowReceiptUpload(true)}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700
                       bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm font-semibold
                       active:scale-[0.98] transition-transform">
            <DocumentArrowUpIcon className="h-5 w-5" />
            {t('purchases.receiptUploadPrompt')}
          </button>
        </div>

        {/* Product search bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              ref={searchRef}
              className="w-full h-10 pe-10 ps-4 rounded-xl border border-gray-300 dark:border-gray-600
                         bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-50
                         focus:outline-none focus:ring-2 focus:ring-green-500 placeholder:text-gray-400"
              placeholder={t('purchases.searchProductPlaceholder')}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowSearch(true) }}
              onFocus={() => searchQuery && setShowSearch(true)}
              dir="rtl"
            />
            <MagnifyingGlassIcon className="absolute end-3 top-2.5 h-5 w-5 text-gray-400" />
            
            <button onClick={() => setShowScanner(true)}
              className="absolute start-3 top-2.5 active:scale-95 transition-transform"
              title={t('purchases.scanBarcodeTitle')}>
              <QrCodeIcon className="h-5 w-5 text-gray-400 hover:text-green-600" />
            </button>

            {/* Search dropdown */}
            <AnimatePresence>
              {showSearch && searchResults?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-12 inset-x-0 z-20 bg-white dark:bg-gray-800
                             border border-gray-200 dark:border-gray-700 rounded-xl
                             shadow-lg max-h-48 overflow-y-auto"
                >
                  {searchResults.map(p => (
                    <button key={p.id} onClick={() => handleProductSelect(p)}
                      className="w-full text-start px-4 py-2.5 hover:bg-green-50 dark:hover:bg-green-900/20
                                 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-50">{p.name}</p>
                          {p.barcode && <p className="text-xs text-gray-400 font-mono" dir="ltr">{p.barcode}</p>}
                        </div>
                        <div className="text-end">
                          <p className="text-sm font-semibold text-green-600">{formatCurrency(p.purchase_price)}</p>
                          <p className="text-xs text-gray-400">{t('purchases.stockLabel', { qty: p.quantity })}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={addEmptyRow}
            className="h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center active:scale-95 transition-transform"
            title={t('purchases.addManualRow')}>
            <PlusIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Items table */}
      <div className="flex-1 overflow-y-auto" onClick={() => { setShowSearch(false); setManualSearchRowIdx(null) }}>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-5xl mb-4">📦</p>
            <p className="text-gray-500 text-sm">{t('purchases.emptyItemsHint')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {/* Column headers */}
            <div className="grid grid-cols-12 gap-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-500 sticky top-0">
              <div className="col-span-3">{t('purchases.product')}</div>
              <div className="col-span-2 text-center">{t('purchases.purchasePrice')}</div>
              <div className="col-span-2 text-center">{t('purchases.sellingPrice')}</div>
              <div className="col-span-2 text-center">{t('purchases.qty')}</div>
              <div className="col-span-2 text-center">{t('purchases.total')}</div>
              <div className="col-span-1"></div>
            </div>

            {/* Item rows */}
            {items.map((item, index) => {
              const subtotal = item.quantity * item.purchase_price

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="grid grid-cols-12 gap-1 px-4 py-2.5 items-center bg-white dark:bg-gray-900"
                >
                  {/* Product name */}
                  <div className="col-span-3 relative">
                    {item.isManual ? (
                      <>
                        <input
                          className="w-full h-8 px-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                                     bg-transparent text-gray-900 dark:text-gray-50 focus:ring-1 focus:ring-green-500 focus:outline-none"
                          value={item.product_name}
                          onChange={e => {
                            const v = e.target.value
                            updateItem(index, 'product_name', v)
                            setManualSearchRowIdx(index)
                            setManualRowQuery(v)
                            setSearchQuery(v)
                            setShowSearch(true)
                          }}
                          onFocus={() => {
                            setManualSearchRowIdx(index)
                            setManualRowQuery(item.product_name || '')
                            setSearchQuery(item.product_name || '')
                            setShowSearch(true)
                          }}
                          placeholder={t('purchases.productNamePlaceholder')}
                        />
                        {manualSearchRowIdx === index && manualRowQuery.trim().length >= 1 && (
                          <div className="absolute z-30 mt-1 w-full max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                            {(searchResults || []).slice(0, 8).map(p => (
                              <button
                                key={p.id}
                                onClick={() => selectManualRowProduct(index, p)}
                                className="w-full text-start px-2 py-1.5 text-xs hover:bg-green-50 dark:hover:bg-green-900/20 border-b border-gray-100 dark:border-gray-700 last:border-0"
                              >
                                <p className="font-semibold text-gray-900 dark:text-gray-50 truncate">{p.name}</p>
                                <p className="text-[10px] text-gray-400" dir="ltr">{p.barcode || '-'}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                          {item.product_name} {item.unit_name && item.unit_name !== 'قطعة' ? `(${item.unit_name})` : ''}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {t('purchases.stockLabel', { qty: item.current_stock })}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Purchase price */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="any"
                      onFocus={e => e.target.select()}
                      className="w-full h-8 px-1 text-sm text-center rounded-lg border border-gray-300 dark:border-gray-600
                                 bg-transparent text-gray-900 dark:text-gray-50 focus:ring-1 focus:ring-green-500 focus:outline-none"
                      value={item.purchase_price || ''}
                      onChange={e => updateItem(index, 'purchase_price', parseFloat(e.target.value) || 0)}
                      dir="ltr"
                      placeholder="0"
                    />
                  </div>

                  {/* Selling price */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="any"
                      onFocus={e => e.target.select()}
                      className="w-full h-8 px-1 text-sm text-center rounded-lg border border-gray-300 dark:border-gray-600
                                 bg-transparent text-gray-900 dark:text-gray-50 focus:ring-1 focus:ring-green-500 focus:outline-none"
                      value={item.selling_price || ''}
                      onChange={e => updateItem(index, 'selling_price', parseFloat(e.target.value) || 0)}
                      dir="ltr"
                      placeholder="0"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-2 flex items-center justify-center gap-0.5">
                    <button onClick={() => updateItem(index, 'quantity', Math.max(1, item.quantity - 1))}
                      className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs active:scale-90">
                      −
                    </button>
                    <input
                      type="number"
                      step="any"
                      onFocus={e => e.target.select()}
                      className="w-10 h-8 text-center text-sm rounded border border-gray-300 dark:border-gray-600
                                 bg-transparent text-gray-900 dark:text-gray-50 focus:ring-1 focus:ring-green-500 focus:outline-none"
                      value={item.quantity}
                      onChange={e => updateItem(index, 'quantity', Math.max(0, parseFloat(e.target.value) || 0))}
                      dir="ltr"
                    />
                    <button onClick={() => updateItem(index, 'quantity', item.quantity + 1)}
                      className="w-6 h-6 rounded bg-green-100 dark:bg-green-900 flex items-center justify-center text-xs text-green-700 active:scale-90">
                      +
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="col-span-2 text-center">
                    <p className="text-sm font-bold text-green-600">
                      {formatCurrency(subtotal)}
                    </p>
                  </div>

                  {/* Delete */}
                  <div className="col-span-1 flex justify-center">
                    <button onClick={() => removeItem(index)}
                      className="p-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-90">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer — Total + Payment + Confirm */}
      {items.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border-t-2 border-green-600 px-4 py-3 space-y-3 safe-area-bottom">
          {/* Subtotal + discount + total */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-gray-500 text-sm">{t('purchases.itemCount', { count: items.length })}</span>
            </div>
            <div className="text-end">
              <p className="text-xs text-gray-500">{t('purchases.beforeDiscount')}</p>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(subtotal)}</p>
              {discountAmount > 0 && (
                <p className="text-xs text-red-500">- {formatCurrency(discountAmount)}</p>
              )}
              <p className="text-xs text-gray-500 mt-0.5">{t('purchases.grandTotal')}</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(total)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <select
              value={discountType}
              onChange={e => setDiscountType(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm px-2"
            >
              <option value="dzd">{t('purchases.discountDzd')}</option>
              <option value="percent">{t('purchases.discountPercent')}</option>
            </select>
            <input
              type="number"
              step="any"
              onFocus={e => e.target.select()}
              className="col-span-2 h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600
                         bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder={discountType === 'percent' ? t('purchases.discountPercentPlaceholder') : t('purchases.discountValuePlaceholder')}
              value={discountValue}
              onChange={e => setDiscountValue(e.target.value)}
              dir="ltr"
            />
          </div>

          {/* Payment status */}
          <div className="flex gap-1.5">
            {[
              { value: 'unpaid', label: t('purchases.unpaid'), bg: 'bg-red-600' },
              { value: 'partial', label: t('purchases.partial'), bg: 'bg-amber-500' },
              { value: 'paid', label: t('purchases.paid'), bg: 'bg-green-600' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setPaymentStatus(opt.value)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                  paymentStatus === opt.value
                    ? `${opt.bg} text-white` : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>

          {paymentStatus === 'partial' && (
            <input
              type="number"
              step="any"
              onFocus={e => e.target.select()}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600
                         bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder={t('purchases.paidAmountPlaceholder', { total: formatCurrency(total) })}
              value={amountPaid}
              onChange={e => setAmountPaid(e.target.value)}
              dir="ltr"
            />
          )}

          {/* Note + Confirm */}
          <div className="flex gap-2">
            <input
              className="flex-1 h-11 px-3 rounded-xl border border-gray-300 dark:border-gray-600
                         bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none
                         placeholder:text-gray-400"
              placeholder={t('purchases.notePlaceholder')}
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <button onClick={handleConfirm} disabled={loading || !supplierId}
              className="h-11 px-6 bg-green-600 text-white font-bold rounded-xl active:scale-95
                         transition-all disabled:opacity-50 shrink-0">
              {loading ? '...' : '✓ ' + t('purchases.confirm')}
            </button>
          </div>
        </div>
      )}

      {/* New Supplier Sheet */}
      <BottomSheet isOpen={showNewSupplier} onClose={() => setShowNewSupplier(false)} title={t('purchases.newSupplier')}>
        <div className="space-y-4">
          <FormInput label={t('suppliers.name')} value={newSupplierName} onChange={setNewSupplierName} required autoFocus />
          <FormInput label={t('suppliers.phone')} value={newSupplierPhone} onChange={setNewSupplierPhone} type="tel" dir="ltr" />
          <button onClick={handleAddSupplier} className="btn-primary">{t('common.save')}</button>
        </div>
      </BottomSheet>

      <BarcodeScanner 
        isOpen={showScanner} 
        onClose={() => setShowScanner(false)} 
        onScan={handleBarcodeScan} 
      />

      {/* Receipt Upload Sheet */}
      <BottomSheet isOpen={showReceiptUpload} onClose={() => { setShowReceiptUpload(false); setReceiptPasteText(''); setReceiptPhoto(null) }}
        title={t('purchases.importReceipt')} large>
        <div className="space-y-4">
          {/* Photo upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('purchases.receiptPhotoLabel')}
            </label>
            <label className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600
                          bg-gray-50 dark:bg-gray-800 cursor-pointer active:scale-[0.98] transition-transform">
              <CameraIcon className="h-8 w-8 text-gray-400 mb-1" />
              <span className="text-sm text-gray-500">{t('purchases.receiptPhotoHint')}</span>
              <input type="file" accept="image/*" capture="environment" className="hidden"
                onChange={handleReceiptPhotoUpload} />
            </label>
            {receiptPhoto && (
              <div className="mt-2 relative">
                <img src={receiptPhoto} alt="الفاتورة" className="w-full rounded-xl max-h-48 object-contain" />
                <button onClick={() => setReceiptPhoto(null)}
                  className="absolute top-1 end-1 p-1 bg-red-500 text-white rounded-full">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Paste text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('purchases.receiptPasteLabel')}
            </label>
            <textarea
              className="w-full h-28 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-50
                         focus:ring-2 focus:ring-green-500 focus:outline-none placeholder:text-gray-400"
              placeholder={t('purchases.receiptPastePlaceholder')}
              value={receiptPasteText}
              onChange={e => setReceiptPasteText(e.target.value)}
              dir="rtl"
            />
          </div>

          <button onClick={handleReceiptParse} disabled={!receiptPasteText.trim() && !receiptPhoto}
            className="btn-primary">
            {t('purchases.receiptParseButton')}
          </button>
        </div>
      </BottomSheet>

      {/* Receipt Review Sheet */}
      <BottomSheet isOpen={showReceiptReview} onClose={() => { setShowReceiptReview(false); setParsedRows([]); setReceiptSearchQ(''); setReceiptSearchResults([]); setReceiptActiveRow(null) }}
        title={t('purchases.receiptReviewTitle')} large>
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {t('purchases.receiptReviewHint', { count: parsedRows.length })}
          </p>

          {parsedRows.map((row, i) => {
            const matched = !!row.selectedProduct
            const sellPrice = row.selectedProduct?.selling_price

            return (
              <div key={i} className={`p-3 rounded-xl border-2 ${
                matched ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                        : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
              }`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {matched ? (
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-50 truncate">
                        {row.selectedProduct.name}
                      </p>
                    ) : (
                      <div>
                        <p className="text-sm font-bold text-red-600 dark:text-red-400 truncate">
                          {row.product_name}
                        </p>
                        <p className="text-[10px] text-red-400">{t('purchases.notInStock')}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                      <span>{t('purchases.qtyLabel', { qty: row.quantity })}</span>
                      <span>{t('purchases.purchasePriceLabel', { price: formatCurrency(row.unit_price) })}</span>
                      {sellPrice > 0 && (
                        <span className="text-green-600 font-semibold">{t('purchases.sellingPriceLabel', { price: formatCurrency(sellPrice) })}</span>
                      )}
                    </div>

                    {/* Unmatched: inline search or create */}
                    {!matched && (
                      <div className="mt-2 space-y-2">
                        <div className="relative">
                          <input
                            className="w-full h-9 pe-3 ps-8 rounded-lg border border-gray-300 dark:border-gray-600
                                       bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-50
                                       focus:ring-1 focus:ring-green-500 focus:outline-none"
                            placeholder={t('purchases.searchStockPlaceholder')}
                            value={receiptActiveRow === i ? receiptSearchQ : ''}
                            onChange={e => { setReceiptActiveRow(i); setReceiptSearchQ(e.target.value) }}
                            onFocus={() => { setReceiptActiveRow(i); if (receiptActiveRow === i && receiptSearchQ) fetchReceiptSearch(receiptSearchQ) }}
                            dir="rtl"
                          />
                          <MagnifyingGlassIcon className="absolute start-2.5 top-2.5 h-4 w-4 text-gray-400" />

                          {receiptActiveRow === i && receiptSearchResults.length > 0 && (
                            <div className="absolute z-30 mt-1 w-full max-h-36 overflow-y-auto rounded-lg
                                            border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg">
                              {receiptSearchResults.map(p => (
                                <button key={p.id} onClick={() => { handleSelectProductForRow(i, p); setReceiptSearchQ(''); setReceiptSearchResults([]); setReceiptActiveRow(null) }}
                                  className="w-full text-start px-3 py-2 text-xs hover:bg-green-50 dark:hover:bg-green-900/20
                                             border-b border-gray-100 dark:border-gray-700 last:border-0">
                                  <div className="flex justify-between items-center">
                                    <span className="font-semibold text-gray-900 dark:text-gray-50">{p.name}</span>
                                    <span className="text-green-600">{formatCurrency(p.selling_price)}</span>
                                  </div>
                                  <span className="text-[10px] text-gray-400" dir="ltr">{p.barcode || ''} {t('purchases.stockLabel', { qty: p.quantity })}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button onClick={() => handleCreateProductForRow(i)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white font-semibold active:scale-95">
                          + {t('purchases.createProductAuto')}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    matched ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {matched ? (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <XMarkIcon className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          <button onClick={handleConfirmParsedRows}
            disabled={parsedRows.some(r => !r.selectedProduct)}
            className="btn-primary mt-2">
            {t('purchases.confirmAndAddProducts', { count: parsedRows.length })}
          </button>
        </div>
      </BottomSheet>

      <UnitSelectionSheet 
        isOpen={!!unitSelectionProduct} 
        onClose={() => setUnitSelectionProduct(null)} 
        product={unitSelectionProduct} 
        onSelect={handleUnitSelect} 
      />
    </div>
  )
}
