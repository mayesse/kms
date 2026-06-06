import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { usePosStore } from '../../stores/posStore'
import { hasFeature, F, getBusinessType, getPosMode, POS_MODE } from '../../utils/businessTypes'
import { productNeedsWeight } from '../../utils/productWeight'
import { modifierRepository } from '../../repositories/modifierRepository'
import { productRepository } from '../../repositories/productRepository'
import { serviceRepository } from '../../repositories/serviceRepository'
import { holdRepository } from '../../repositories/holdRepository'
import { priceTierRepository } from '../../repositories/priceTierRepository'
import { branchRepository } from '../../repositories/branchRepository'
import { tableRepository } from '../../repositories/tableRepository'
import { groupTiersByProduct } from '../../utils/priceTier'
import SearchInput from '../../components/SearchInput'
import CategoryFilter from '../../components/CategoryFilter'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import { useTranslation } from 'react-i18next'
import ProductGrid from './components/ProductGrid'
import ServiceGrid from './components/ServiceGrid'
import CartList from './components/CartList'
import CartFooter from './components/CartFooter'
import CheckoutSheet from './components/CheckoutSheet'
import HoldSheet from './components/HoldSheet'
import RestoreHoldsSheet from './components/RestoreHoldsSheet'
import BottomSheet from '../../components/BottomSheet'
import BarcodeScanner from '../../components/BarcodeScanner'
import ProductForm from '../inventory/components/ProductForm'
import UnitSelectionSheet from './components/UnitSelectionSheet'
import VariantSelectionSheet from './components/VariantSelectionSheet'
import WeightInputSheet from './components/WeightInputSheet'
import ModifierPickerSheet from './components/ModifierPickerSheet'
import SessionSalesSheet from './components/SessionSalesSheet'
import CarPartsSearchPanel from './components/CarPartsSearchPanel'
import InvoiceView from '../../components/InvoiceView'
import { saleRepository } from '../../repositories/saleRepository'
import { settingsRepository } from '../../repositories/settingsRepository'
import PharmacyExpiryBanner from '../../components/PharmacyExpiryBanner'
import WeightScaleToggle from '../../components/WeightScaleToggle'
import { getScaleListeningEnabled, useWeightScaleStub } from '../../hooks/useWeightScaleStub'
import {
  connectSerialScalePort,
  disconnectSerialScalePort,
  getSerialScaleEnabled,
  setSerialScaleEnabled,
  useWeightScaleSerial,
} from '../../hooks/useWeightScaleSerial'
import { ClipboardDocumentListIcon, QrCodeIcon } from '@heroicons/react/24/outline'
import { useLocalSalesStore } from '../../stores/localSalesStore'

const SHORTCUT_KEYS = {
  search: 'Ctrl+F',
  checkout: 'F5',
  hold: 'F6',
  scanner: 'F8',
  addProduct: 'F2',
  qtyUp: '+',
  qtyDown: '-',
}

export default function POSScreen() {
  const { t } = useTranslation()
  const location = useLocation()
  const storeId = useAuthStore(s => s.storeId)
  const { cart, addToCart, addProductWithModifiers, addServiceToCart, clearCart, setPriceTierMap, activeBranchId, setActiveBranch } = usePosStore()
  const sessionSalesCount = useLocalSalesStore(s => s.sales.length)
  const searchRef = useRef(null)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState(null)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showHold, setShowHold] = useState(false)
  const [showRestoreHolds, setShowRestoreHolds] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showSessionSales, setShowSessionSales] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState('')
  const [unitSelectionProduct, setUnitSelectionProduct] = useState(null)
  const [weightInputProduct, setWeightInputProduct] = useState(null)
  const [scaleTargetProduct, setScaleTargetProduct] = useState(null)
  const [scaleListening, setScaleListening] = useState(() => getScaleListeningEnabled())
  const [serialPort, setSerialPort] = useState(null)
  const [serialConnected, setSerialConnected] = useState(() => getSerialScaleEnabled())
  const [variantSelectionProduct, setVariantSelectionProduct] = useState(null)
  const businessType = useAuthStore(s => s.businessType)
  const posMode = getPosMode(businessType)
  const [posView, setPosView] = useState(() => (
    getPosMode(useAuthStore.getState().businessType) === POS_MODE.SERVICE ? 'services' : 'products'
  ))
  const [modifierPickerProduct, setModifierPickerProduct] = useState(null)
  const [modifierGroups, setModifierGroups] = useState([])
  const [invoiceSaleData, setInvoiceSaleData] = useState(null)
  const businessLabel = getBusinessType(businessType)?.label || t('businessTypes.general')
  const showModifiers = hasFeature(businessType, F.MODIFIERS)
  const isVariantsEnabled = hasFeature(businessType, F.VARIANTS)
  const showServicesPos = hasFeature(businessType, F.SERVICES_POS)
  const isPriceTiers = hasFeature(businessType, F.PRICE_TIERS)
  const showBranchSelector = hasFeature(businessType, F.BRANCH_SELECTOR)
  const showPartsLookup = hasFeature(businessType, F.OEM_SEARCH) || hasFeature(businessType, F.PARTS_LOOKUP)
  const showExpiryAlerts = hasFeature(businessType, F.EXPIRY_ALERTS)
  const showWeightScale = hasFeature(businessType, F.WEIGHT_SCALE)
  const showTableService = hasFeature(businessType, F.TABLE_SERVICE)
  const { activeTableId, activeTableName, setActiveTable, clearActiveTable } = usePosStore()

  const [showTableSelector, setShowTableSelector] = useState(false)
  const [searchMode, setSearchMode] = useState('normal')
  const [carOem, setCarOem] = useState('')
  const [carMake, setCarMake] = useState('')
  const [carModel, setCarModel] = useState('')

  const kbBufferRef = useRef('')
  const kbTimerRef = useRef(null)
  const lastTappedRef = useRef(null)

  const productFilters = useMemo(() => {
    const f = { categoryId: categoryId || undefined }
    if (showPartsLookup && searchMode === 'oem') {
      if (carOem.trim()) f.carOem = carOem.trim()
      if (carMake.trim()) f.carMake = carMake.trim()
      if (carModel.trim()) f.carModel = carModel.trim()
    } else if (search) {
      f.search = search
    }
    return f
  }, [categoryId, showPartsLookup, searchMode, carOem, carMake, carModel, search])

  const { data: products, isLoading, isError } = useQuery({
    queryKey: ['products', storeId, productFilters],
    queryFn: () => productRepository.getAll(storeId, productFilters),
    enabled: !!storeId && (!showServicesPos || posView === 'products'),
  })

  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['services', storeId, search],
    queryFn: () => serviceRepository.getAll(storeId),
    enabled: !!storeId && showServicesPos && posView === 'services',
  })

  const filteredServices = (services || []).filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  )

  useQuery({
    queryKey: ['price_tiers_all', storeId],
    queryFn: async () => {
      const tiers = await priceTierRepository.getAllForStore(storeId)
      setPriceTierMap(groupTiersByProduct(tiers))
      return tiers
    },
    enabled: !!storeId && isPriceTiers,
  })

  const { data: branches } = useQuery({
    queryKey: ['branches', storeId],
    queryFn: () => branchRepository.getAll(storeId),
    enabled: !!storeId && showBranchSelector,
  })

  const { data: tables } = useQuery({
    queryKey: ['tables', storeId],
    queryFn: () => tableRepository.getAll(storeId),
    enabled: !!storeId && showTableService,
  })

  const activeBranches = (branches || []).filter(b => b.is_active !== false)

  useEffect(() => {
    if (!showBranchSelector || !activeBranches.length) return
    if (!activeBranchId || !activeBranches.find(b => b.id === activeBranchId)) {
      setActiveBranch(activeBranches[0].id)
    }
  }, [showBranchSelector, activeBranches, activeBranchId, setActiveBranch])

  const { data: holds } = useQuery({
    queryKey: ['holds', storeId],
    queryFn: () => holdRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const holdsCount = holds?.length || 0

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (location.state?.openCheckout) {
      setShowCheckout(true)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleBarcodeScan = useCallback(async (barcodeOrArray) => {
    const barcodes = Array.isArray(barcodeOrArray) ? barcodeOrArray : [barcodeOrArray]
    setShowScanner(false)

    let notFoundBarcode = null
    let addedCount = 0

    for (const barcode of barcodes) {
      const product = await productRepository.getByBarcode(storeId, barcode)
      if (product) {
        if (product.scanned_variant) {
          addToCart(product, null, product.scanned_variant)
          lastTappedRef.current = `${product.id}_v_${product.scanned_variant.id}`
          addedCount++
          const stock = parseFloat(product.scanned_variant.quantity || 0)
          if (stock - 1 < 0) {
            toast(t('toast.negativeStock', { name: product.name }), { icon: '⚠️', className: 'bg-amber-500 text-white' })
          }
        } else {
        const matchedUnit = product.product_units?.find(u => u.barcode === barcode)
        addToCart(product, matchedUnit)
        const unitName = matchedUnit ? matchedUnit.name : (product.base_unit || t('pos.unitPc'))
        lastTappedRef.current = `${product.id}_${unitName}`
        addedCount++

        const qtyMultiplier = matchedUnit ? parseFloat(matchedUnit.conversion_rate) : 1
        if (product.quantity - qtyMultiplier < 0) {
          toast(t('toast.negativeStock', { name: product.name }), { icon: '⚠️', style: { background: '#f59e0b', color: '#fff' } })
        }
        }
      } else {
        notFoundBarcode = barcode
      }
    }

    if (addedCount > 0) {
      toast.success(`${addedCount} ← ${t('pos.cart')}`, { icon: '✅' })
    }

    if (notFoundBarcode) {
      setScannedBarcode(notFoundBarcode)
      setShowAddProduct(true)
    }
  }, [storeId, addToCart, t])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (showScanner || showCheckout || showHold || showRestoreHolds || showAddProduct || showSessionSales || variantSelectionProduct) return

      const target = e.target
      const tag = target?.tagName?.toLowerCase?.()
      const isTypingField = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable

      // Ctrl+F — focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        if (searchRef.current) searchRef.current.focus()
        return
      }

      // F5 — checkout
      if (e.key === 'F5') {
        e.preventDefault()
        if (cart.length > 0) setShowCheckout(true)
        return
      }

      // F6 — hold
      if (e.key === 'F6') {
        e.preventDefault()
        if (cart.length > 0) setShowHold(true)
        return
      }

      // F8 — scanner
      if (e.key === 'F8') {
        e.preventDefault()
        setShowScanner(true)
        return
      }

      // F2 — add product
      if (e.key === 'F2') {
        e.preventDefault()
        setShowAddProduct(true)
        return
      }

      // Escape — close any open sheet
      if (e.key === 'Escape') {
        if (showCheckout) { setShowCheckout(false); return }
        if (showHold) { setShowHold(false); return }
        if (showScanner) { setShowScanner(false); return }
        if (showAddProduct) { setShowAddProduct(false); return }
        if (showSessionSales) { setShowSessionSales(false); return }
        if (showRestoreHolds) { setShowRestoreHolds(false); return }
        return
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (isTypingField) return

      // + / = — increase qty of last tapped item
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        const currentCart = usePosStore.getState().cart
        if (lastTappedRef.current && currentCart.length > 0) {
          const item = currentCart.find(i => i.id === lastTappedRef.current)
          if (item) usePosStore.getState().updateQty(item.id, item.qty + 1)
        }
        return
      }

      // - — decrease qty of last tapped item
      if (e.key === '-') {
        e.preventDefault()
        const currentCart = usePosStore.getState().cart
        if (lastTappedRef.current && currentCart.length > 0) {
          const item = currentCart.find(i => i.id === lastTappedRef.current)
          if (item) usePosStore.getState().updateQty(item.id, item.qty - 1)
        }
        return
      }

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
  }, [handleBarcodeScan, showCheckout, showHold, showAddProduct, showRestoreHolds, showScanner, showSessionSales, cart.length, variantSelectionProduct])

  const handleWeightConfirm = useCallback((product, weight, { fromScale = false } = {}) => {
    addToCart(product)
    const unitName = product.base_unit || t('pos.unitKg')
    const cartItemId = `${product.id}_${unitName}`
    lastTappedRef.current = cartItemId
    usePosStore.getState().updateQty(cartItemId, weight)
    setScaleTargetProduct(null)
    if (fromScale) {
      toast.success(`${product.name} — ${weight} ${unitName}`, { icon: '⚖️' })
    }
  }, [addToCart])

  const handleScaleReading = useCallback((weight) => {
    if (scaleTargetProduct) {
      handleWeightConfirm(scaleTargetProduct, weight, { fromScale: true })
    }
  }, [scaleTargetProduct, handleWeightConfirm])

  const scaleStubActive = showWeightScale && scaleListening && !serialConnected
    && !showCheckout && !showScanner && !showAddProduct && !variantSelectionProduct

  const scaleSerialActive = showWeightScale && serialConnected && serialPort
    && !showCheckout && !showScanner && !showAddProduct && !variantSelectionProduct

  useWeightScaleStub({
    enabled: showWeightScale,
    active: scaleStubActive,
    onWeight: handleScaleReading,
  })

  useWeightScaleSerial({
    enabled: showWeightScale,
    active: scaleSerialActive,
    port: serialPort,
    onWeight: handleScaleReading,
  })

  const handleSerialConnect = useCallback(async () => {
    try {
      const port = await connectSerialScalePort()
      setSerialPort(port)
      setSerialConnected(true)
      setSerialScaleEnabled(true)
      setScaleListening(true)
      toast.success(t('weightScale.serialConnected'), { icon: '🔌' })
    } catch (err) {
      if (err?.name !== 'NotFoundError') {
        toast.error(t('weightScale.serialFailed'))
      }
    }
  }, [t])

  const handleSerialDisconnect = useCallback(async () => {
    await disconnectSerialScalePort(serialPort)
    setSerialPort(null)
    setSerialConnected(false)
    setSerialScaleEnabled(false)
    toast(t('weightScale.serialDisconnected'), { icon: '🔌' })
  }, [serialPort, t])

  const partsLookupVariant = businessType === 'repair_shop' ? 'repair' : 'car'

  const handleServiceTap = useCallback((service) => {
    addServiceToCart(service)
    lastTappedRef.current = `svc_${service.id}`
    toast.success(`${service.name} ← ${t('pos.cart')}`, { icon: '✂️' })
  }, [addServiceToCart, t])

  const addProductToCart = useCallback((product) => {
    if (productNeedsWeight(product, businessType)) {
      if (showWeightScale && (scaleListening || serialConnected)) {
        setScaleTargetProduct(product)
        toast(t('weightScale.placeOnScale'), { icon: '⚖️', duration: 4000 })
        return
      }
      setWeightInputProduct(product)
      return
    }
    if (product.product_units?.length > 0) {
      setUnitSelectionProduct(product)
      return
    }
    addToCart(product)
    const unitName = product.base_unit || t('pos.unitPc')
    lastTappedRef.current = `${product.id}_${unitName}`
    const currentInCart = cart.find(i => i.id === `${product.id}_${unitName}`)
    const newQty = (currentInCart?.qty || 0) + 1
    if (product.quantity - newQty < 0) {
      toast(t('toast.negativeStock', { name: product.name }), { icon: '⚠️', style: { background: '#f59e0b', color: '#fff' } })
    }
  }, [addToCart, businessType, cart, showWeightScale, scaleListening, serialConnected, t])

  const handleProductTap = useCallback(async (product) => {
    if (isVariantsEnabled && product.product_variants?.length > 0) {
      setVariantSelectionProduct(product)
      return
    }
    if (showModifiers && storeId) {
      try {
        const groups = await modifierRepository.getGroupsForProduct(storeId, product.id)
        if (groups?.length) {
          setModifierGroups(groups)
          setModifierPickerProduct(product)
          return
        }
      } catch { /* add without modifiers */ }
    }
    addProductToCart(product)
  }, [addProductToCart, isVariantsEnabled, showModifiers, storeId])

  const handleModifierConfirm = useCallback((product, picks, modifierTotal, modifierLabel) => {
    addProductWithModifiers(product, null, null, picks, modifierTotal, modifierLabel)
    toast.success(`${product.name} ← ${t('pos.cart')}`, { icon: '✅' })
  }, [addProductWithModifiers, t])

  const handleVariantSelect = (variant) => {
    addToCart(variantSelectionProduct, null, variant)
    lastTappedRef.current = `${variantSelectionProduct.id}_v_${variant.id}`
    const stock = parseFloat(variant.quantity || 0)
    if (stock - 1 < 0) {
      toast(t('toast.negativeStock', { name: variantSelectionProduct.name }), { icon: '⚠️', style: { background: '#f59e0b', color: '#fff' } })
    }
    setVariantSelectionProduct(null)
  }

  const handleUnitSelect = (unit) => {
    addToCart(unitSelectionProduct, unit)
    const unitName = unit ? unit.name : (unitSelectionProduct.base_unit || t('pos.unitPc'))
    const cartItemId = `${unitSelectionProduct.id}_${unitName}`
    lastTappedRef.current = cartItemId
    const currentInCart = cart.find(i => i.id === cartItemId)
    const newQty = (currentInCart?.qty || 0) + 1
    const qtyMultiplier = unit ? parseFloat(unit.conversion_rate) : 1

    if (unitSelectionProduct.quantity - (newQty * qtyMultiplier) < 0) {
      toast(t('toast.negativeStock', { name: unitSelectionProduct.name }), { icon: '⚠️', style: { background: '#f59e0b', color: '#fff' } })
    }

    setUnitSelectionProduct(null)
  }

  const handleSaleComplete = useCallback(async (result) => {
    if (!result?.sale_id) return
    if (result.printed) {
      try {
        const saleData = await saleRepository.getSaleDetail(storeId, result.sale_id)
        setInvoiceSaleData({ sale: saleData, profile: result.profile || null, wasPrinted: true })
      } catch {
        toast.success(t('toast.saleCreated'))
      }
      return
    }
    try {
      const [saleData, profile] = await Promise.all([
        saleRepository.getSaleDetail(storeId, result.sale_id),
        settingsRepository.get(storeId),
      ])
      setInvoiceSaleData({ sale: saleData, profile })
    } catch {
      toast.success(t('toast.saleCreated'))
    }
  }, [storeId, t])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gradient-to-br from-green-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* ===== DESKTOP: Side-by-side layout ===== */}
      <div className="flex flex-col lg:flex-row h-dvh lg:h-screen overflow-hidden">
        {/* ─── Left panel: search + products ─── */}
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
          {/* Header */}
          <header className="bg-gradient-to-l from-green-700 via-green-600 to-emerald-600 dark:from-green-900 dark:via-green-800 dark:to-emerald-800 px-4 pt-3 pb-2 shadow-md lg:shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 text-white text-lg shadow-inner">
                  👑
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    {t('pos.title')}
                    <span className="hidden lg:inline text-[10px] bg-amber-400/30 text-amber-200 px-2 py-0.5 rounded-full">{t('pos.badgeTitle')}</span>
                  </h1>
                  <p className="hidden lg:block text-[11px] text-green-200/80 mt-0.5">
                    <span className="inline-flex gap-2">
                      <span className="bg-green-800/40 px-1.5 py-0.5 rounded text-[10px]">{SHORTCUT_KEYS.search}</span> {t('pos.shortcutSearch')}
                      <span className="bg-green-800/40 px-1.5 py-0.5 rounded text-[10px]">{SHORTCUT_KEYS.checkout}</span> {t('pos.shortcutCheckout')}
                      <span className="bg-green-800/40 px-1.5 py-0.5 rounded text-[10px]">{SHORTCUT_KEYS.hold}</span> {t('pos.shortcutHold')}
                      <span className="bg-green-800/40 px-1.5 py-0.5 rounded text-[10px]">{SHORTCUT_KEYS.scanner}</span> {t('pos.shortcutScan')}
                    </span>
                  </p>
                  <p className="lg:hidden text-xs text-green-200 mt-0.5">{businessLabel}</p>
                </div>
              </div>
              {showBranchSelector && activeBranches.length > 0 && (
                <select
                  value={activeBranchId || ''}
                  onChange={(e) => setActiveBranch(e.target.value || null)}
                  className="h-9 max-w-[140px] rounded-lg bg-white/20 text-white text-xs font-semibold px-2 border border-white/30"
                  aria-label={t('pos.selectBranch')}
                >
                  {activeBranches.map(b => (
                    <option key={b.id} value={b.id} className="text-gray-900">{b.name}</option>
                  ))}
                </select>
              )}
              <div className="flex items-center gap-2">
                {showWeightScale && (
                  <WeightScaleToggle
                    listening={scaleListening}
                    onToggle={setScaleListening}
                    serialConnected={serialConnected}
                    onSerialConnect={handleSerialConnect}
                    onSerialDisconnect={handleSerialDisconnect}
                    compact
                  />
                )}
                <button
                  onClick={() => setShowSessionSales(true)}
                  className="relative h-10 w-10 flex items-center justify-center rounded-xl bg-white/15 text-white active:scale-95 transition-transform hover:bg-white/25"
                  aria-label={t('reports.salesHistory')}
                >
                  <ClipboardDocumentListIcon className="h-5 w-5" />
                  {sessionSalesCount > 0 && (
                    <span className="absolute -top-1 -end-1 min-w-5 h-5 px-1 bg-amber-400 text-amber-900 text-[10px] rounded-full flex items-center justify-center font-bold shadow-sm">
                      {sessionSalesCount}
                    </span>
                  )}
                </button>
                {holdsCount > 0 && (
                  <button onClick={() => setShowRestoreHolds(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 backdrop-blur rounded-full text-sm font-semibold text-white active:scale-95 transition-transform hover:bg-white/25">
                    🛒 {t('pos.restoreHold')}
                    <span className="w-5 h-5 bg-amber-400 text-amber-900 text-[10px] rounded-full flex items-center justify-center font-bold">
                      {holdsCount}
                    </span>
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2 items-start">
              <div className="flex-1 min-w-0">
                {showPartsLookup ? (
                  <CarPartsSearchPanel
                    variant={partsLookupVariant}
                    searchMode={searchMode}
                    onSearchModeChange={setSearchMode}
                    search={search}
                    onSearchChange={setSearch}
                    carOem={carOem}
                    onCarOemChange={setCarOem}
                    carMake={carMake}
                    onCarMakeChange={setCarMake}
                    carModel={carModel}
                    onCarModelChange={setCarModel}
                    searchInputRef={searchRef}
                  />
                ) : (
                  <SearchInput ref={searchRef} value={search} onChange={setSearch} placeholder={t('pos.search')} autoFocus />
                )}
              </div>
              <button onClick={() => setShowScanner(true)}
                className="h-11 w-11 flex items-center justify-center rounded-xl bg-white/20 text-white active:scale-95 transition-transform relative group hover:bg-white/25">
                <QrCodeIcon className="h-5 w-5" />
                <span className="hidden lg:block absolute -bottom-6 text-[10px] text-green-200/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">{SHORTCUT_KEYS.scanner}</span>
              </button>
              <button onClick={() => setShowAddProduct(true)}
                className="hidden lg:flex h-11 px-3 items-center gap-1.5 rounded-xl bg-amber-400/20 text-amber-200 text-xs font-semibold active:scale-95 transition-transform relative group hover:bg-amber-400/30 border border-amber-400/20">
                <span className="text-base leading-none">+</span> {t('pos.shortcutProduct')}
                <span className="absolute -bottom-6 text-[10px] text-green-200/80 opacity-0 group-hover:opacity-100 transition-opacity">{SHORTCUT_KEYS.addProduct}</span>
              </button>
            </div>
          </header>

          {/* Table selector bar */}
          {showTableService && (
            <div className="px-2 pt-1.5">
              {activeTableId ? (
                <button onClick={() => setShowTableSelector(true)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 active:scale-[0.98] transition-transform">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🍽️</span>
                    <span className="font-bold text-emerald-800 dark:text-emerald-200">{activeTableName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">{t('pos.changeTable')}</span>
                    <button onClick={(e) => { e.stopPropagation(); clearActiveTable() }}
                      className="text-red-500 text-xs px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 active:scale-95">
                      {t('common.cancel')}
                    </button>
                  </div>
                </button>
              ) : (
                <button onClick={() => setShowTableSelector(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10 active:scale-[0.98] transition-transform">
                  <span className="text-lg">🍽️</span>
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{t('pos.selectTablePrompt')}</span>
                </button>
              )}
            </div>
          )}

          {scaleTargetProduct && (
            <div className="mx-4 mt-2 px-3 py-2 rounded-xl bg-lime-100 dark:bg-lime-900/30 border border-lime-300 dark:border-lime-700 text-center">
              <p className="text-xs font-semibold text-lime-800 dark:text-lime-200">
                ⚖️ {t('weightScale.waiting')}: {scaleTargetProduct.name}
              </p>
              <button type="button" onClick={() => setScaleTargetProduct(null)} className="text-[10px] text-lime-600 underline mt-1">
                {t('common.cancel')}
              </button>
            </div>
          )}

          {showExpiryAlerts && posView === 'products' && (
            <div className="px-4 pt-2 bg-white/50 dark:bg-gray-900/50">
              <PharmacyExpiryBanner storeId={storeId} compact />
            </div>
          )}

          {/* Products / Services toggle */}
          {showServicesPos && (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-green-100 dark:border-gray-700 px-4 py-2 flex gap-2">
              <button
                type="button"
                onClick={() => setPosView('products')}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  posView === 'products' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {t('pos.productsTab')}
              </button>
              <button
                type="button"
                onClick={() => setPosView('services')}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  posView === 'services' ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {t('pos.servicesTab')}
              </button>
            </div>
          )}

          {/* Category filter */}
          {(!showServicesPos || posView === 'products') && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-green-100 dark:border-gray-700 px-4 py-2 lg:shadow-sm">
            <CategoryFilter value={categoryId} onChange={setCategoryId} />
          </div>
          )}

          {/* Grid — scrollable */}
          <div className="flex-1 overflow-y-auto p-3 lg:p-4 lg:bg-gradient-to-b lg:from-transparent lg:to-amber-50/30 dark:lg:to-transparent">
            {posView === 'services' && showServicesPos ? (
              servicesLoading ? (
                <LoadingSkeleton count={6} height="h-20" />
              ) : filteredServices.length === 0 ? (
                <EmptyState icon="✂️" title={t('pos.noServices')} subtitle={t('pos.noServicesHint')} />
              ) : (
                <ServiceGrid services={filteredServices} onServiceTap={handleServiceTap} />
              )
            ) : isError ? (
              <EmptyState icon="⚠️" title={t('common.error')} />
            ) : isLoading ? (
              <LoadingSkeleton count={8} height="h-20" />
            ) : products?.length === 0 ? (
              search ? (
                <EmptyState icon="🔍" title={t('common.noResults')} subtitle={t('common.tryDifferentSearch')} />
              ) : (
                <EmptyState icon="📦" title={t('inventory.empty')} subtitle={t('inventory.emptySubtitle')} />
              )
            ) : (
              <ProductGrid products={products || []} onProductTap={handleProductTap} />
            )}
          </div>
        </div>

        {/* ─── Right panel: cart (desktop only) / below products (mobile) ─── */}
        {cart.length > 0 && (
          <div className="lg:w-96 shrink-0 lg:border-s lg:border-green-200 lg:dark:border-gray-700 lg:flex lg:flex-col lg:bg-gradient-to-b lg:from-white lg:via-white lg:to-amber-50/40 lg:dark:from-gray-800 lg:dark:to-gray-800 border-t-2 border-green-500 bg-white dark:bg-gray-800 lg:shadow-xl">
            {/* Cart header */}
            <div className="hidden lg:flex items-center justify-between px-5 py-3.5 bg-gradient-to-l from-green-50 to-amber-50/50 dark:from-gray-800 dark:to-gray-800 border-b border-green-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h3 className="font-bold text-green-800 dark:text-green-200">{t('pos.cart')}</h3>
              </div>
              <span className="text-sm text-green-600 dark:text-green-400 font-medium bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 rounded-full">{cart.length} {t('pos.item')}</span>
            </div>
            <div className="flex-1 overflow-y-auto lg:px-2">
              <CartList />
            </div>
            <div className="shrink-0 lg:border-t lg:border-green-100 dark:border-gray-700">
              <CartFooter
                onCheckout={() => setShowCheckout(true)}
                onHold={() => setShowHold(true)}
                holdLabel={SHORTCUT_KEYS.hold}
                checkoutLabel={SHORTCUT_KEYS.checkout}
                onClear={clearCart}
                holdsCount={holdsCount}
                onRestoreHolds={() => setShowRestoreHolds(true)}
              />
            </div>
          </div>
        )}
      </div>

      {cart.length === 0 && (
        <div className="lg:absolute lg:inset-0 lg:flex lg:items-center lg:justify-center p-8 pointer-events-none">
          <div className="text-center">
            <div className="text-5xl mb-4 opacity-30">👑</div>
            <p className="text-lg text-gray-400 mb-2">{t('pos.emptyCart')}</p>
            <p className="text-xs text-gray-300 lg:hidden">{businessLabel}</p>
            <p className="hidden lg:block text-sm text-gray-400">{t('pos.emptyCart')}</p>
            <div className="hidden lg:flex items-center justify-center gap-2 mt-4">
              {[
                { key: 'search', labelKey: 'pos.shortcutSearch', kbd: SHORTCUT_KEYS.search },
                { key: 'checkout', labelKey: 'pos.shortcutCheckout', kbd: SHORTCUT_KEYS.checkout },
                { key: 'hold', labelKey: 'pos.shortcutHold', kbd: SHORTCUT_KEYS.hold },
                { key: 'scanner', labelKey: 'pos.shortcutScan', kbd: SHORTCUT_KEYS.scanner },
                { key: 'addProduct', labelKey: 'pos.shortcutProduct', kbd: SHORTCUT_KEYS.addProduct },
                { key: 'qtyUp', labelKey: 'pos.shortcutIncrease', kbd: SHORTCUT_KEYS.qtyUp },
                { key: 'qtyDown', labelKey: 'pos.shortcutDecrease', kbd: SHORTCUT_KEYS.qtyDown },
              ].map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[11px] font-medium">
                  <kbd className="px-1 py-0.5 rounded bg-white dark:bg-gray-700 text-[10px] font-mono shadow-sm">{s.kbd}</kbd>
                  {t(s.labelKey)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sheets */}
      <CheckoutSheet isOpen={showCheckout} onClose={() => setShowCheckout(false)} onSaleComplete={handleSaleComplete} />
      <InvoiceView
        isOpen={!!invoiceSaleData}
        onClose={() => setInvoiceSaleData(null)}
        saleData={invoiceSaleData?.sale}
        storeProfile={invoiceSaleData?.profile}
        wasPrinted={invoiceSaleData?.wasPrinted}
      />
      <SessionSalesSheet isOpen={showSessionSales} onClose={() => setShowSessionSales(false)} />
      <HoldSheet isOpen={showHold} onClose={() => setShowHold(false)} />
      <RestoreHoldsSheet isOpen={showRestoreHolds} onClose={() => setShowRestoreHolds(false)} holds={holds || []} />
      <BarcodeScanner isOpen={showScanner} onClose={() => setShowScanner(false)} onScan={handleBarcodeScan} />
      <ProductForm
        isOpen={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        initialBarcode={scannedBarcode}
        onProductCreated={(product) => {
          addToCart(product)
          toast.success(`${product.name} ← ${t('pos.cart')}`)
        }}
      />
      <UnitSelectionSheet
        isOpen={!!unitSelectionProduct}
        onClose={() => setUnitSelectionProduct(null)}
        product={unitSelectionProduct}
        onSelect={handleUnitSelect}
      />
      <VariantSelectionSheet
        isOpen={!!variantSelectionProduct}
        onClose={() => setVariantSelectionProduct(null)}
        product={variantSelectionProduct}
        onSelect={handleVariantSelect}
      />
      <WeightInputSheet
        isOpen={!!weightInputProduct}
        onClose={() => setWeightInputProduct(null)}
        product={weightInputProduct}
        onConfirm={handleWeightConfirm}
      />
      <ModifierPickerSheet
        isOpen={!!modifierPickerProduct}
        onClose={() => { setModifierPickerProduct(null); setModifierGroups([]) }}
        product={modifierPickerProduct}
        groups={modifierGroups}
        onConfirm={handleModifierConfirm}
      />

      {/* Table selector sheet */}
      <BottomSheet isOpen={showTableSelector} onClose={() => setShowTableSelector(false)} title={t('pos.selectTable')} large>
        <div className="space-y-3">
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500" /> {t('tables.free')}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500" /> {t('tables.occupied')}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400" /> {t('tables.reserved')}</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto">
            {(tables || []).map((table) => {
              const isOccupied = table.status === 'occupied'
              const isReserved = table.status === 'reserved'
              const capacity = table.capacity || 2
              return (
                <button key={table.id}
                  onClick={() => {
                    if (!isOccupied) {
                      setActiveTable(table.id, table.name)
                      setShowTableSelector(false)
                    }
                  }}
                  disabled={isOccupied}
                  className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-sm ${
                    isOccupied
                      ? 'bg-gradient-to-br from-red-500 to-red-600 text-white opacity-70 cursor-not-allowed'
                      : isReserved
                        ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white'
                        : activeTableId === table.id
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white ring-4 ring-emerald-300'
                          : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                  }`}>
                  <span className="text-xl font-black">{table.name.replace(t('tables.namePrefix'), '')}</span>
                  <div className="flex gap-0.5 mt-0.5">
                    {Array.from({ length: Math.min(capacity, 5) }).map((_, i) => (
                      <div key={i} className={`w-1 h-1 rounded-full ${isOccupied ? 'bg-red-200' : isReserved ? 'bg-amber-200' : 'bg-green-200'}`} />
                    ))}
                  </div>
                  <span className="text-[9px] opacity-85">{isOccupied ? t('tables.occupied') : isReserved ? t('tables.reserved') : t('tables.free')}</span>
                  {capacity > 0 && <span className="text-[8px] opacity-60">👥 {capacity}</span>}
                </button>
              )
            })}
          </div>
        </div>
      </BottomSheet>
    </motion.div>
  )
}
