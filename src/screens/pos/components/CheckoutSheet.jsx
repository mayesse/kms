import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../stores/authStore'
import { usePosStore } from '../../../stores/posStore'
import { useLocalSalesStore } from '../../../stores/localSalesStore'
import { saleRepository } from '../../../repositories/saleRepository'
import { sessionRepository } from '../../../repositories/sessionRepository'
import { customerRepository } from '../../../repositories/customerRepository'
import { settingsRepository } from '../../../repositories/settingsRepository'
import { tableRepository } from '../../../repositories/tableRepository'
import { batchRepository } from '../../../repositories/batchRepository'
import { staffRepository } from '../../../repositories/staffRepository'
import { appointmentRepository } from '../../../repositories/appointmentRepository'
import { repairJobRepository } from '../../../repositories/repairJobRepository'
import { promotionRepository } from '../../../repositories/promotionRepository'
import { productRepository } from '../../../repositories/productRepository'
import { hasFeature, F, hasModule } from '../../../utils/businessTypes'
import { calculatePromotionDiscount } from '../../../utils/promotionCalc'
import { calculateTaxFromHt } from '../../../utils/taxCalc'
import { isBatchExpired } from '../../../utils/batchExpiry'
import { logExpiredBatchSale } from '../../../utils/expiredBatchSaleLog'
import { taxRateRepository } from '../../../repositories/taxRateRepository'
import { useOfflineQueueStore } from '../../../stores/offlineQueueStore'
import { useOnlineStatus } from '../../../hooks/useOnlineStatus'
import { printReceipt, connectPrinter, isPrinterConnected } from '../../../utils/printer'
import BottomSheet from '../../../components/BottomSheet'
import FormInput from '../../../components/FormInput'
import { formatCurrency } from '../../../utils/format'
import { useTranslation } from 'react-i18next'
import { buildReceiptLabels } from '../../../utils/receiptLabels'
import { PrinterIcon } from '@heroicons/react/24/outline'

export default function CheckoutSheet({ isOpen, onClose, onSaleComplete }) {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const businessType = useAuthStore(s => s.businessType)
  const { getTotal, getCartForSale, clearCart, cart, setCartItemBatch, checkoutDefaults, clearCheckoutDefaults, activeBranchId, activeTableId, clearActiveTable } = usePosStore()
  const addLocalSale = useLocalSalesStore(s => s.addSale)
  const queryClient = useQueryClient()

  const showOrderTypes = hasFeature(businessType, F.ORDER_TYPES)
  const showTableService = hasFeature(businessType, F.TABLE_SERVICE)
  const showBatchPicker = hasFeature(businessType, F.BATCH_TRACKING)
  const showExpiryAlerts = hasFeature(businessType, F.EXPIRY_ALERTS)
  const showStaffPicker = hasFeature(businessType, F.STAFF_AT_CHECKOUT)
  const showPromotions = hasModule(businessType, 'promotions')
  const showBranchOnSale = hasFeature(businessType, F.BRANCH_SELECTOR)
  const showTvaCheckout = hasFeature(businessType, F.TVA_CHECKOUT)
  const showServiceCharge = hasFeature(businessType, F.SERVICE_CHARGE)
  const showDeliveryFee = hasFeature(businessType, F.DELIVERY_FEE)
  const useOfflineQueue = hasFeature(businessType, F.OFFLINE_QUEUE)
  const isOnline = useOnlineStatus()
  const enqueueOffline = useOfflineQueueStore(s => s.enqueue)

  const [promotionId, setPromotionId] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [serviceChargeAmount, setServiceChargeAmount] = useState('')
  const [deliveryFeeAmount, setDeliveryFeeAmount] = useState('')

  const [staffId, setStaffId] = useState(null)

  const batchProductIds = [...new Set(cart.filter(i => i.product_id).map(i => i.product_id))]

  const { data: staffList } = useQuery({
    queryKey: ['staff_active', storeId],
    queryFn: () => staffRepository.getAll(storeId),
    enabled: !!storeId && isOpen && showStaffPicker,
  })

  const activeStaff = (staffList || []).filter(s => s.is_active !== false)

  const { data: productBatches } = useQuery({
    queryKey: ['checkout_batches', storeId, [...batchProductIds].sort().join(',')],
    queryFn: () => batchRepository.getFefoForProducts(storeId, batchProductIds),
    enabled: !!storeId && isOpen && (showBatchPicker || showExpiryAlerts) && batchProductIds.length > 0,
  })

  const cartItemsNeedingBatch = cart.filter(item => {
    if (!item.product_id) return false
    const batches = productBatches?.[item.product_id] || []
    return batches.length > 0
  })

  const expiredBatchWarnings = useMemo(() => {
    if (!showExpiryAlerts || !productBatches) return []
    return cart
      .filter(item => item.batch_id && item.product_id)
      .map(item => {
        const batches = productBatches[item.product_id] || []
        const batch = batches.find(b => b.id === item.batch_id)
        if (!batch?.expiry_date || !isBatchExpired(batch.expiry_date)) return null
        return {
          itemId: item.id,
          productName: item.product_name,
          lot: item.batch_label || batch.lot_number || batch.batch_number,
          expiryDate: batch.expiry_date,
        }
      })
      .filter(Boolean)
  }, [cart, productBatches, showExpiryAlerts])

  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [customerName, setCustomerName] = useState('')
  const [customerId, setCustomerId] = useState(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [amountPaid, setAmountPaid] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orderType, setOrderType] = useState('dine_in')
  const [tableId, setTableId] = useState(null)
  const [releaseTable, setReleaseTable] = useState(true)
  const dropdownRef = useRef(null)
  const [printBtnLoading, setPrintBtnLoading] = useState(false)
  const [printerStatus, setPrinterStatus] = useState('')

  const ORDER_TYPES = [
    { value: 'dine_in', label: t('pos.orderDineIn'), icon: '🍽️' },
    { value: 'takeaway', label: t('pos.orderTakeaway'), icon: '🥡' },
    { value: 'delivery', label: t('pos.orderDelivery'), icon: '🛵' },
  ]

  const showTablePicker = showTableService && orderType === 'dine_in'

  const { data: defaultTax } = useQuery({
    queryKey: ['tax_rate_default', storeId],
    queryFn: () => taxRateRepository.getDefault(storeId),
    enabled: !!storeId && isOpen && showTvaCheckout,
  })

  const { data: availableTables } = useQuery({
    queryKey: ['tables_available', storeId],
    queryFn: () => tableRepository.getAvailable(storeId),
    enabled: !!storeId && isOpen && showTablePicker,
  })

  const { data: activePromotions } = useQuery({
    queryKey: ['promotions_active', storeId],
    queryFn: () => promotionRepository.getActive(storeId),
    enabled: !!storeId && isOpen && showPromotions,
  })

  const { data: allProducts } = useQuery({
    queryKey: ['products_categories', storeId],
    queryFn: () => productRepository.getAll(storeId),
    enabled: !!storeId && isOpen && showPromotions,
  })

  const productCategoryMap = useMemo(() => {
    const m = {}
    for (const p of allProducts || []) {
      if (p.id) m[p.id] = p.category_id
    }
    return m
  }, [allProducts])

  const selectedPromotion = (activePromotions || []).find(p => p.id === promotionId) || null

  const promotionDiscount = useMemo(() => {
    if (!selectedPromotion) return 0
    return calculatePromotionDiscount(
      cart.map(i => ({ product_id: i.product_id, unit_price: i.unit_price, qty: i.qty })),
      selectedPromotion,
      productCategoryMap
    )
  }, [cart, selectedPromotion, productCategoryMap])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isOpen) return
    setOrderType(showOrderTypes ? 'dine_in' : 'counter')
    setTableId(activeTableId || null)
    setPromotionId('')
    if (checkoutDefaults?.staffId) setStaffId(checkoutDefaults.staffId)
    else setStaffId(null)
    if (checkoutDefaults?.customerName) {
      setCustomerName(checkoutDefaults.customerName)
      setCustomerSearch(checkoutDefaults.customerName)
    }
  }, [isOpen, showOrderTypes, checkoutDefaults, activeTableId])

  useEffect(() => {
    if (orderType !== 'dine_in') setTableId(null)
  }, [orderType])

  useEffect(() => {
    if (!isOpen || !productBatches) return
    cart.forEach((item) => {
      if (!item.product_id || item.batch_id) return
      const batches = productBatches[item.product_id]
      if (batches?.length) {
        const fresh = batches.filter(b => !isBatchExpired(b.expiry_date))
        const b = (fresh.length ? fresh : batches)[0]
        setCartItemBatch(item.id, b.id, b.lot_number || b.batch_number || '')
      }
    })
  }, [isOpen, productBatches, cart, setCartItemBatch])
  /* eslint-enable react-hooks/set-state-in-effect */

  const subtotal = getTotal()
  const subtotalAfterPromo = Math.max(0, subtotal - promotionDiscount)
  const parsedServiceCharge = showServiceCharge ? parseFloat(serviceChargeAmount) || 0 : 0
  const parsedDeliveryFee = showDeliveryFee && orderType === 'delivery' ? parseFloat(deliveryFeeAmount) || 0 : 0
  const subtotalWithFees = subtotalAfterPromo + parsedServiceCharge + parsedDeliveryFee
  const taxBreakdown = useMemo(() => {
    if (!showTvaCheckout || !defaultTax?.rate) {
      return { subtotalHt: subtotalWithFees, taxAmount: 0, totalTtc: subtotalWithFees }
    }
    return calculateTaxFromHt(subtotalWithFees, defaultTax.rate)
  }, [showTvaCheckout, defaultTax, subtotalWithFees])

  const total = taxBreakdown.totalTtc
  const change = amountPaid ? parseFloat(amountPaid) - total : 0

  const { data: customers } = useQuery({
    queryKey: ['customers', storeId, customerSearch],
    queryFn: () => customerRepository.getAll(storeId, customerSearch),
    enabled: !!storeId && paymentMethod === 'credit' && showDropdown,
  })

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleCustomerInput = (value) => {
    setCustomerSearch(value)
    setCustomerName(value)
    setCustomerId(null)
    setShowDropdown(true)
  }

  const selectCustomer = (customer) => {
    setCustomerName(customer.name)
    setCustomerId(customer.id)
    setCustomerSearch(customer.name)
    setShowDropdown(false)
  }

  const buildSalePayload = async () => {
    const saleItems = getCartForSale()
    const session = await sessionRepository.getOrCreateToday(storeId)
    const resolvedOrderType = showOrderTypes ? orderType : 'counter'
    return {
      storeId,
      sessionId: session.id,
      items: saleItems,
      paymentMethod,
      customerName: customerName || null,
      customerPhone: null,
      customerId: customerId || null,
      note: note || null,
      discountAmount: promotionDiscount,
      verticalOptions: {
        orderType: resolvedOrderType,
        tableId: showTablePicker ? tableId : null,
        staffId: showStaffPicker && staffId ? staffId : null,
        branchId: showBranchOnSale ? activeBranchId : null,
        taxRateId: showTvaCheckout && defaultTax?.id ? defaultTax.id : null,
        taxAmount: taxBreakdown.taxAmount,
        subtotalHt: taxBreakdown.subtotalHt,
        serviceCharge: parsedServiceCharge,
        deliveryFee: parsedDeliveryFee,
      },
    }
  }

  const recordLocalSale = (result, saleItems) => {
    addLocalSale({
      local_id: result?.sale_id || 'pending',
      sale_id: result?.sale_id || null,
      receipt_number: result?.receipt_number || 'LOCAL-PENDING',
      created_at: new Date().toISOString(),
      total_amount: result?.total || total,
      payment_method: paymentMethod,
      customer_name: customerName || null,
      customer_id: customerId || null,
      amount_paid: amountPaid ? parseFloat(amountPaid) : null,
      change_amount: paymentMethod === 'cash' && amountPaid ? Math.max(change, 0) : null,
      note: note || null,
      items: saleItems,
      tax_amount: taxBreakdown.taxAmount,
    })
  }

  const invalidateAfterSale = () => {
    queryClient.invalidateQueries(['products'])
    queryClient.invalidateQueries(['sales'])
    queryClient.invalidateQueries(['debtsByCustomer'])
    queryClient.invalidateQueries(['creditSales'])
    queryClient.invalidateQueries(['kitchen_orders'])
    queryClient.invalidateQueries(['tables'])
    queryClient.invalidateQueries(['tables_available'])
    queryClient.invalidateQueries(['delivery_orders'])
    queryClient.invalidateQueries(['batches'])
    queryClient.invalidateQueries(['appointments'])
    queryClient.invalidateQueries(['commissions'])
  }

  const doSale = async () => {
    const payload = await buildSalePayload()
    const saleItems = payload.items

    if (useOfflineQueue && !isOnline) {
      enqueueOffline(payload)
      recordLocalSale({ receipt_number: 'OFFLINE', total }, saleItems)
      clearCart()
      clearActiveTable()
      clearCheckoutDefaults()
      return { receipt_number: 'OFFLINE', total, offline: true }
    }

    try {
      const result = await saleRepository.createSale(
        payload.storeId,
        payload.sessionId,
        payload.items,
        payload.paymentMethod,
        payload.customerName,
        payload.customerPhone,
        payload.customerId,
        payload.note,
        payload.discountAmount,
        payload.verticalOptions
      )

      const appointmentId = checkoutDefaults?.appointmentId
      if (appointmentId) {
        await appointmentRepository.setStatus(storeId, appointmentId, 'completed')
      }

      const workOrderId = checkoutDefaults?.workOrderId
      if (workOrderId && result?.sale_id) {
        await repairJobRepository.linkSale(storeId, workOrderId, result.sale_id)
        queryClient.invalidateQueries(['repair_jobs', storeId])
      }

      recordLocalSale(result, saleItems)
      if (releaseTable && tableId) {
        try { await tableRepository.setOccupied(storeId, tableId, false) }
        catch (e) { console.error('Failed to release table:', e) }
      }
      clearCart()
      clearActiveTable()
      invalidateAfterSale()
      clearCheckoutDefaults()
      return result
    } catch (err) {
      if (useOfflineQueue) {
        enqueueOffline(payload)
        recordLocalSale({ receipt_number: 'OFFLINE', total }, saleItems)
        clearCart()
        clearActiveTable()
        clearCheckoutDefaults()
        return { receipt_number: 'OFFLINE', total, offline: true }
      }
      throw err
    }
  }

  const resetForm = () => {
    setPaymentMethod('cash')
    setCustomerName('')
    setCustomerId(null)
    setCustomerSearch('')
    setAmountPaid('')
    setNote('')
    setOrderType(showOrderTypes ? 'dine_in' : 'counter')
    setTableId(null)
    setStaffId(null)
    setServiceChargeAmount('')
    setDeliveryFeeAmount('')
    setError('')
  }

  const validateCheckout = () => {
    if (paymentMethod === 'credit' && !customerName.trim()) {
      setError(t('pos.customerNameRequired'))
      return false
    }
    if (showTablePicker && !tableId) {
      setError(t('pos.tableRequired'))
      return false
    }
    if (showBatchPicker) {
      for (const item of cartItemsNeedingBatch) {
        if (!item.batch_id) {
          setError(t('pos.batchRequired'))
          return false
        }
      }
    }
    setError('')
    return true
  }

  const warnExpiredBatchesIfNeeded = () => {
    if (expiredBatchWarnings.length === 0) return
    toast(t('pharmacy.expiredBatchCheckoutWarn', { count: expiredBatchWarnings.length }), {
      icon: '⚠️',
      duration: 6000,
      className: 'bg-amber-500 text-white',
    })
  }

  const auditExpiredBatchSale = async (result) => {
    if (!showExpiryAlerts || expiredBatchWarnings.length === 0) return
    await logExpiredBatchSale(storeId, result, expiredBatchWarnings, {
      isOnline: isOnline && !result?.offline,
    })
    queryClient.invalidateQueries(['activityLog', storeId])
  }

  const receiptLabels = useMemo(() => buildReceiptLabels(t), [t])

  const buildPrintPayload = (result) => ({
    receipt_number: result.receipt_number,
    created_at: new Date().toISOString(),
    total_amount: result.total ?? total,
    payment_method: paymentMethod,
    customer_name: customerName || null,
    subtotal_ht: showTvaCheckout ? taxBreakdown.subtotalHt : null,
    tax_amount: showTvaCheckout ? taxBreakdown.taxAmount : 0,
    tax_label: defaultTax?.name || 'TVA',
    items: getCartForSale().map(i => ({
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.unit_price,
    })),
  })

  const handleConfirm = async () => {
    if (!validateCheckout()) return
    warnExpiredBatchesIfNeeded()
    setLoading(true)
    try {
      const result = await doSale()
      await auditExpiredBatchSale(result)
      resetForm()
      onClose()
      onSaleComplete?.(result)
    } catch (err) {
      const msg = err?.message || ''
      if (msg.includes('Trial') || msg.includes('trial')) {
        toast.error(t('toast.trialLimitReached'))
      } else {
        toast.error(t('toast.saveFailed'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmAndPrint = async () => {
    if (!validateCheckout()) return
    warnExpiredBatchesIfNeeded()
    setPrintBtnLoading(true)
    setPrinterStatus('')
    try {
      const result = await doSale()
      await auditExpiredBatchSale(result)

      if (!isPrinterConnected()) {
        setPrinterStatus(t('pos.printerConnecting'))
        const conn = await connectPrinter()
        if (!conn.success) {
          toast.error(t('pos.printerError') + (conn.error || ''))
          setPrintBtnLoading(false)
          resetForm()
          onClose()
          onSaleComplete?.({ ...result, printed: true })
          return
        }
      }

      setPrinterStatus(t('pos.printerPrinting'))
      const profile = await settingsRepository.get(storeId)
      await printReceipt(buildPrintPayload(result), profile, receiptLabels)

      resetForm()
      onClose()
      onSaleComplete?.({ ...result, printed: true, profile })
    } catch (err) {
      const msg = err?.message || ''
      if (msg.includes('Trial') || msg.includes('trial')) {
        toast.error(t('toast.trialLimitReached'))
      } else {
        toast.error(t('toast.saveFailed'))
      }
    } finally {
      setPrintBtnLoading(false)
      setPrinterStatus('')
    }
  }

  const handleConfirmRef = useRef(handleConfirm)
  handleConfirmRef.current = handleConfirm

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Enter' && !loading && !printBtnLoading) {
        e.preventDefault()
        handleConfirmRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, loading, printBtnLoading])

  const ALL_METHODS = [
    { value: 'cash', label: t('pos.cash') },
    { value: 'ccp', label: t('pos.ccp') },
    { value: 'credit', label: t('pos.credit') },
  ]

  const methods = hasFeature(businessType, F.CASH_ONLY)
    ? ALL_METHODS.filter(m => m.value === 'cash')
    : hasFeature(businessType, F.NO_CCP)
      ? ALL_METHODS.filter(m => m.value !== 'ccp')
      : ALL_METHODS

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('pos.checkout')} large>
      <div className="space-y-4">
        <div className="text-center py-2">
          <p className="text-sm text-gray-500">{t('pos.total')}</p>
          {promotionDiscount > 0 && (
            <p className="text-xs text-gray-400 line-through">{formatCurrency(subtotal)}</p>
          )}
          <p className="text-3xl font-bold text-green-600">{formatCurrency(total)}</p>
          {showTvaCheckout && defaultTax && taxBreakdown.taxAmount > 0 && (
            <div className="mt-2 text-xs text-gray-500 space-y-0.5">
              <p>{t('tax.subtotalHt')}: {formatCurrency(taxBreakdown.subtotalHt)}</p>
              <p>{t('tax.tvaLine', { name: defaultTax.name, rate: defaultTax.rate })}: {formatCurrency(taxBreakdown.taxAmount)}</p>
            </div>
          )}
          {promotionDiscount > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              {t('promotions.discountApplied')}: −{formatCurrency(promotionDiscount)}
            </p>
          )}
        </div>

        {showPromotions && (activePromotions || []).length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('promotions.selectAtCheckout')}</p>
            <select
              value={promotionId}
              onChange={(e) => setPromotionId(e.target.value)}
              className="w-full h-11 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm"
            >
              <option value="">{t('promotions.none')}</option>
              {(activePromotions || []).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {showPromotions && (
          <FormInput
            label={t('pos.promoCode')}
            value={promoCode}
            onChange={setPromoCode}
            placeholder={t('pos.promoCodePlaceholder')}
          />
        )}

        {showOrderTypes && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('pos.orderType')}</p>
            <div className="grid grid-cols-3 gap-2">
              {ORDER_TYPES.map(ot => (
                <button
                  key={ot.value}
                  type="button"
                  onClick={() => setOrderType(ot.value)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-semibold transition-all active:scale-95 flex flex-col items-center gap-1 ${
                    orderType === ot.value
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-lg">{ot.icon}</span>
                  {ot.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {showServiceCharge && (
          <FormInput
            label={t('checkout.serviceCharge')}
            value={serviceChargeAmount}
            onChange={setServiceChargeAmount}
            type="number"
            placeholder="0"
          />
        )}

        {showDeliveryFee && orderType === 'delivery' && (
          <FormInput
            label={t('checkout.deliveryFee')}
            value={deliveryFeeAmount}
            onChange={setDeliveryFeeAmount}
            type="number"
            placeholder="0"
          />
        )}

        {showTablePicker && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('pos.selectTable')} <span className="text-red-500">*</span>
            </p>
            {!availableTables?.length ? (
              <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                {t('pos.noTablesAvailable')}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {availableTables.map(tbl => (
                  <button
                    key={tbl.id}
                    type="button"
                    onClick={() => setTableId(tbl.id)}
                    className={`py-2 px-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                      tableId === tbl.id
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {tbl.name}
                  </button>
                ))}
              </div>
            )}
            {error === t('pos.tableRequired') && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={releaseTable}
                onChange={() => setReleaseTable(!releaseTable)}
                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-xs text-gray-500">{t('pos.releaseTable')}</span>
            </label>
          </div>
        )}

        {showStaffPicker && activeStaff.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('pos.selectStaff')}</p>
            <div className="flex flex-wrap gap-2">
              {activeStaff.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStaffId(staffId === s.id ? null : s.id)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                    staffId === s.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {expiredBatchWarnings.length > 0 && (
          <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-1">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
              ⚠️ {t('pharmacy.expiredBatchCheckoutTitle')}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">{t('pharmacy.expiredBatchCheckoutHint')}</p>
            <ul className="text-xs text-amber-800 dark:text-amber-200 list-disc ps-4 space-y-0.5">
              {expiredBatchWarnings.map((w) => (
                <li key={w.itemId}>
                  {w.productName} — {w.lot} ({new Date(w.expiryDate).toLocaleDateString('ar-DZ')})
                </li>
              ))}
            </ul>
          </div>
        )}

        {showBatchPicker && cartItemsNeedingBatch.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('pos.selectBatch')}</p>
            {cartItemsNeedingBatch.map((item) => {
              const batches = productBatches?.[item.product_id] || []
              return (
                <div key={item.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{item.product_name}</p>
                  <div className="flex flex-wrap gap-2">
                    {batches.map((b) => {
                      const lot = b.lot_number || b.batch_number || '—'
                      const expiry = b.expiry_date
                        ? new Date(b.expiry_date).toLocaleDateString('ar-DZ')
                        : null
                      const selected = item.batch_id === b.id
                      const expired = isBatchExpired(b.expiry_date)
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setCartItemBatch(item.id, b.id, lot)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                            selected
                              ? expired ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                              : expired
                                ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                          }`}
                        >
                          <span>{lot}{expired ? ' ⚠️' : ''}</span>
                          {expiry && <span className="block opacity-80">{t('pos.expires')}: {expiry}</span>}
                          <span className="block opacity-70">{b.quantity} {item.unit_name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {error === t('pos.batchRequired') && (
              <p className="text-xs text-red-500">{error}</p>
            )}
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('pos.paymentMethod')}</p>
          <div className="flex gap-2">
            {methods.map(m => (
              <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                  paymentMethod === m.value
                    ? m.value === 'credit'
                      ? 'bg-amber-500 text-white'
                      : 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {paymentMethod === 'credit' && (
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('pos.linkToClient')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => handleCustomerInput(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                placeholder={t('pos.selectClient')}
                className={`w-full h-11 px-3 rounded-xl border text-sm transition-colors
                  ${error && error !== t('pos.tableRequired')
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                    : customerId
                      ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  }
                  text-gray-900 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent`}
              />
              {customerId && (
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-green-600 text-sm">✓</span>
              )}
            </div>

            {showDropdown && (
              <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                {customers && customers.length > 0 ? (
                  customers.map(c => (
                    <button
                      key={c.id}
                      onClick={() => selectCustomer(c)}
                      className="w-full text-start px-3 py-2.5 text-sm hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                    >
                      <span className="font-semibold text-gray-900 dark:text-gray-50">{c.name}</span>
                      {c.phone && <span className="text-gray-400 ms-2 text-xs" dir="ltr">{c.phone}</span>}
                    </button>
                  ))
                ) : customerSearch.trim() ? (
                  <button
                    onClick={async () => {
                      try {
                        const created = await customerRepository.create(storeId, { name: customerSearch.trim(), phone: null })
                        selectCustomer(created)
                        queryClient.invalidateQueries(['customers'])
                        toast.success(t('toast.settingsSaved'))
                      } catch {
                        toast.error(t('toast.saveFailed'))
                      }
                    }}
                    className="w-full text-start px-3 py-3 text-sm hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                  >
                    <span className="font-semibold text-green-700 dark:text-green-400">
                      + {t('common.add')} "{customerSearch.trim()}"
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">{t('pos.noPhoneHint')}</p>
                  </button>
                ) : (
                  <div className="px-3 py-3 text-sm text-gray-400">{t('customers.empty') || t('common.search')}</div>
                )}
              </div>
            )}

            {error && error !== t('pos.tableRequired') && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}

            {!customerId && customerName.trim() && (
              <p className="text-xs text-amber-600 mt-1">
                {t('pos.unlinkedCustomerHint')}
              </p>
            )}
          </div>
        )}

        {paymentMethod === 'cash' && (
          <>
            <FormInput label={t('pos.amountPaid')} value={amountPaid}
              onChange={setAmountPaid} type="number" dir="ltr" />
            {amountPaid && (
              <div className={`text-center py-2 rounded-xl ${change >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <p className="text-sm text-gray-500">{t('pos.change')}</p>
                <p className={`text-2xl font-bold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(change))}
                </p>
              </div>
            )}
          </>
        )}

        <FormInput label={t('pos.note')} value={note} onChange={setNote} placeholder={t('pos.note')} />

        {printerStatus && (
          <p className="text-xs text-amber-600 text-center animate-pulse">{printerStatus}</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleConfirm} disabled={loading} className="btn-primary">
            {loading ? t('common.loading') : t('pos.confirmSale')}
          </button>
          <button onClick={handleConfirmAndPrint} disabled={loading || printBtnLoading}
            className="btn-outline-green h-12 flex items-center justify-center gap-2 text-sm">
            <PrinterIcon className="h-5 w-5" />
            {printBtnLoading ? t('common.loading') : t('pos.confirmAndPrint')}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
