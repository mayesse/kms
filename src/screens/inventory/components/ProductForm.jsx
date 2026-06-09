import { useState, useEffect } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../stores/authStore'
import { hasFeature, F } from '../../../utils/businessTypes'
import { productRepository } from '../../../repositories/productRepository'
import { productVariantRepository } from '../../../repositories/productVariantRepository'
import { categoryRepository } from '../../../repositories/categoryRepository'
import { modifierRepository } from '../../../repositories/modifierRepository'
import BottomSheet from '../../../components/BottomSheet'
import FormInput from '../../../components/FormInput'
import FormSelect from '../../../components/FormSelect'
import BarcodeScanner from '../../../components/BarcodeScanner'
import { QrCodeIcon, PlusIcon, TrashIcon, XMarkIcon, TruckIcon } from '@heroicons/react/24/outline'
import PriceTierEditor from './PriceTierEditor'

/* eslint-disable react-hooks/set-state-in-effect */

export default function ProductForm({ isOpen, onClose, product, initialBarcode = '', onProductCreated }) {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const isEdit = !!product
  
  // Basic Product Fields
  const [name, setName] = useState('')
  const [barcode, setBarcode] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [stockType, setStockType] = useState('ready')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [quantity, setQuantity] = useState('0')
  const [minThreshold, setMinThreshold] = useState('5')
  const [baseUnit, setBaseUnit] = useState('')
  const [isWeightBased, setIsWeightBased] = useState(false)
  const [selectedModifierGroups, setSelectedModifierGroups] = useState([])
  
  // Supplementary barcodes
  const [suppBarcodes, setSuppBarcodes] = useState([])
  
  // Multiple Units
  const [units, setUnits] = useState([])

  // Clothing variants (size / color)
  const [variants, setVariants] = useState([])
  
  // Car parts fields
  const [carMake, setCarMake] = useState('')
  const [carModel, setCarModel] = useState('')
  const [carYear, setCarYear] = useState('')
  const [carOem, setCarOem] = useState('')
  
  const businessType = useAuthStore(s => s.businessType)
  const isCarParts = hasFeature(businessType, F.CAR_PARTS_FIELDS)
  const isVariants = hasFeature(businessType, F.VARIANTS)
  const isPriceTiers = hasFeature(businessType, F.PRICE_TIERS)
  const showWeightFlag = hasFeature(businessType, F.WEIGHT_PRODUCTS)
  const showModifierLink = hasFeature(businessType, F.MODIFIERS)
  
  const [loading, setLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [activeScanner, setActiveScanner] = useState(null) // 'main' or unit index

  const { data: categories } = useQuery({
    queryKey: ['categories', storeId],
    queryFn: () => categoryRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const { data: modifierGroups } = useQuery({
    queryKey: ['modifier_groups', storeId],
    queryFn: () => modifierRepository.getGroupsWithItems(storeId),
    enabled: !!storeId && showModifierLink && isOpen,
  })

  useEffect(() => {
    if (product) {
      setName(product.name || '')
      setBarcode(product.barcode || '')
      setCategoryId(product.category_id || '')
      setStockType(product.stock_type || 'ready')
      setPurchasePrice(String(product.purchase_price || ''))
      setSellingPrice(String(product.selling_price || ''))
      setQuantity(String(product.quantity || 0))
      setMinThreshold(String(product.min_stock_threshold || 5))
      setBaseUnit(product.base_unit || 'قطعة')
      setIsWeightBased(!!product.is_weight_based)
      setSuppBarcodes(product.supplementary_barcodes || [])
      setCarMake(product.car_make || '')
      setCarModel(product.car_model || '')
      setCarYear(product.car_year || '')
      setCarOem(product.car_oem || '')
      
      if (product.product_units && product.product_units.length > 0) {
        setUnits(product.product_units.map(u => ({
          name: u.name,
          conversion_rate: String(u.conversion_rate),
          purchase_price: String(u.purchase_price),
          selling_price: String(u.selling_price),
          barcode: u.barcode || ''
        })))
      } else {
        setUnits([])
      }

      if (product.product_variants?.length) {
        setVariants(product.product_variants.map(v => ({
          size: v.size || '',
          color: v.color || '',
          barcode: v.barcode || '',
          quantity: String(v.quantity ?? 0),
          purchase_price: v.purchase_price != null ? String(v.purchase_price) : '',
          selling_price: v.selling_price != null ? String(v.selling_price) : '',
        })))
      } else {
        setVariants([])
      }
    } else {
      setName(''); setBarcode(initialBarcode || ''); setCategoryId(''); setStockType('ready')
      setPurchasePrice(''); setSellingPrice(''); setQuantity('0'); setMinThreshold('5')
      setBaseUnit('قطعة'); setUnits([]); setSuppBarcodes([]); setVariants([])
      setCarMake(''); setCarModel(''); setCarYear(''); setCarOem('')
      setIsWeightBased(false)
      setSelectedModifierGroups([])
    }
  }, [product, isOpen, initialBarcode])

  useEffect(() => {
    if (!product?.id || !showModifierLink || !isOpen) return
    modifierRepository.getGroupsForProduct(storeId, product.id).then((linked) => {
      setSelectedModifierGroups((linked || []).map(g => g.id))
    }).catch(() => {})
  }, [product?.id, showModifierLink, isOpen, storeId])

  const handleAddUnit = () => {
    setUnits([...units, { name: '', conversion_rate: '', purchase_price: '', selling_price: '', barcode: '' }])
  }

  const handleRemoveUnit = (index) => {
    setUnits(units.filter((_, i) => i !== index))
  }

  const handleAddVariant = () => {
    setVariants([...variants, { size: '', color: '', barcode: '', quantity: '0', purchase_price: '', selling_price: '' }])
  }

  const handleRemoveVariant = (index) => {
    setVariants(variants.filter((_, i) => i !== index))
  }

  const handleVariantChange = (index, field, value) => {
    const next = [...variants]
    next[index][field] = value
    setVariants(next)
  }

  const handleUnitChange = (index, field, value) => {
    const newUnits = [...units]
    newUnits[index][field] = value
    setUnits(newUnits)
  }

  const handleSave = async () => {
    if (!name.trim() || !sellingPrice || !baseUnit.trim()) return
    setLoading(true)
    try {
      const data = {
        name: name.trim(), 
        barcode: barcode || null, 
        category_id: categoryId || null,
        stock_type: stockType, 
        purchase_price: parseFloat(purchasePrice || 0),
        selling_price: parseFloat(sellingPrice), 
        quantity: parseInt(quantity || 0),
        min_stock_threshold: parseInt(minThreshold || 5),
        base_unit: baseUnit.trim(),
        is_weight_based: showWeightFlag ? isWeightBased : false,
        supplementary_barcodes: suppBarcodes.filter(b => b.trim()),
        ...(isCarParts ? {
          car_make: carMake || null,
          car_model: carModel || null,
          car_year: carYear || null,
          car_oem: carOem || null,
        } : {}),
      }

      const unitsData = units.map(u => ({
        name: u.name.trim(),
        conversion_rate: parseFloat(u.conversion_rate || 1),
        purchase_price: parseFloat(u.purchase_price || 0),
        selling_price: parseFloat(u.selling_price || 0),
        barcode: u.barcode || null
      })).filter(u => u.name && u.selling_price > 0)

      let savedProduct
      if (isEdit) {
        savedProduct = await productRepository.update(storeId, product.id, data, unitsData)
      } else {
        savedProduct = await productRepository.create(storeId, data, unitsData)
      }

      if (showModifierLink) {
        await modifierRepository.setProductGroups(storeId, savedProduct.id, selectedModifierGroups)
      }

      if (isVariants) {
        const variantRows = variants.filter(v => v.size?.trim() || v.color?.trim())
        if (variantRows.length > 0) {
          await productVariantRepository.replaceForProduct(storeId, savedProduct.id, variantRows)
          await productVariantRepository.syncProductQuantityFromVariants(storeId, savedProduct.id)
        } else {
          await productVariantRepository.replaceForProduct(storeId, savedProduct.id, [])
        }
      }

      queryClient.invalidateQueries(['products'])
      queryClient.invalidateQueries(['stockValue'])
      toast.success(isEdit ? t('toast.stockUpdated') : t('toast.productAdded'))
      if (onProductCreated && savedProduct) onProductCreated(savedProduct)
      onClose()
    } catch (err) {
      if (err.message?.includes('duplicate') || err.code === '23505') toast.error(t('inventory.barcodeUsed'))
      else toast.error(t('toast.saveFailed'))
    } finally { setLoading(false) }
  }

  const handleBarcodeScan = (codeOrArray) => {
    const code = Array.isArray(codeOrArray) ? codeOrArray[0] : codeOrArray
    if (!code) { setShowScanner(false); return }
    if (activeScanner === 'main') {
      setBarcode(code)
    } else if (activeScanner === 'supp') {
      setSuppBarcodes(prev => [...prev, code])
    } else if (typeof activeScanner === 'number') {
      handleUnitChange(activeScanner, 'barcode', code)
    }
    setShowScanner(false)
  }

  const handleAddSuppBarcode = () => {
    setSuppBarcodes(prev => [...prev, ''])
  }

  const handleRemoveSuppBarcode = (index) => {
    setSuppBarcodes(prev => prev.filter((_, i) => i !== index))
  }

  const handleSuppBarcodeChange = (index, value) => {
    setSuppBarcodes(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const stockTypes = [
    { value: 'ready', label: t('inventory.stockTypeReady') },
    { value: 'raw', label: t('inventory.stockTypeRaw') },
    { value: 'consumable', label: t('inventory.stockTypeConsumable') },
  ]

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={isEdit ? t('inventory.edit') : t('inventory.add')} large>
      <div className="space-y-6">
        
        {/* Main Product Info */}
        <div className="space-y-4">
          <FormInput label={t('inventory.productName')} value={name} onChange={setName} required autoFocus />
          
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <FormInput label={t('inventory.barcode')} value={barcode} onChange={setBarcode} dir="ltr" />
            </div>
            <button onClick={() => { setActiveScanner('main'); setShowScanner(true); }}
              className="h-12 px-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl
                         flex items-center justify-center text-gray-700 dark:text-gray-300 active:scale-95 transition-transform shrink-0"
              title={t('inventory.scanCamera')}>
              <QrCodeIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Supplementary Barcodes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('inventory.suppBarcodes')}</label>
            {suppBarcodes.map((sb, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1">
                  <FormInput
                    value={sb}
                    onChange={(v) => handleSuppBarcodeChange(i, v)}
                    dir="ltr"
                    placeholder={t('inventory.suppBarcodeN', { n: i + 1 })}
                  />
                </div>
                <button onClick={() => { setActiveScanner('supp'); setShowScanner(true); }}
                  className="h-10 px-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg
                             flex items-center justify-center text-gray-500 active:scale-95 transition-transform shrink-0">
                  <QrCodeIcon className="h-4 w-4" />
                </button>
                <button onClick={() => handleRemoveSuppBarcode(i)}
                  className="h-10 px-2 text-red-500 hover:text-red-700 shrink-0">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
            {suppBarcodes.length < 10 && (
              <button onClick={handleAddSuppBarcode}
                className="text-sm text-green-600 dark:text-green-400 font-semibold flex items-center gap-1 hover:underline">
                <PlusIcon className="h-4 w-4" />
                {t('inventory.addSuppBarcode')}
              </button>
            )}
          </div>

          <FormSelect label={t('inventory.category')} value={categoryId} onChange={setCategoryId}
            options={(categories || []).map(c => ({ value: c.id, label: c.name }))} placeholder={t('inventory.selectCategory')} />
          <FormSelect label={t('inventory.stockType')} value={stockType} onChange={setStockType} options={stockTypes} />
          
          <div className="grid grid-cols-2 gap-3">
            <FormInput label={t('inventory.purchasePrice')} value={purchasePrice} onChange={setPurchasePrice} type="number" required dir="ltr" />
            <FormInput label={t('inventory.sellingPrice')} value={sellingPrice} onChange={setSellingPrice} type="number" required dir="ltr" />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <FormInput label={t('inventory.quantity')} value={quantity} onChange={setQuantity} type="number" dir="ltr" />
            <FormInput label={t('inventory.minThreshold')} value={minThreshold} onChange={setMinThreshold} type="number" dir="ltr" />
          </div>
        </div>

        {/* Car Parts Section */}
        {isCarParts && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <TruckIcon className="h-5 w-5 text-blue-500" />
              {t('inventory.carParts')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label={t('inventory.carMake')} value={carMake} onChange={setCarMake} />
              <FormInput label={t('inventory.carModel')} value={carModel} onChange={setCarModel} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label={t('inventory.carYear')} value={carYear} onChange={setCarYear} dir="ltr" />
              <FormInput label={t('inventory.carOem')} value={carOem} onChange={setCarOem} dir="ltr" />
            </div>
          </div>
        )}

        {/* Clothing variants */}
        {isVariants && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 dark:text-gray-200">{t('inventory.variants')}</h3>
              <button type="button" onClick={handleAddVariant}
                className="text-sm text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                <PlusIcon className="h-4 w-4" /> {t('inventory.addVariant')}
              </button>
            </div>
            <p className="text-xs text-gray-500">{t('inventory.variantsHint')}</p>
            {variants.map((v, index) => (
              <div key={index} className="p-3 bg-pink-50/50 dark:bg-pink-900/10 rounded-xl space-y-3 relative border border-pink-200 dark:border-pink-900/30">
                <button type="button" onClick={() => handleRemoveVariant(index)} className="absolute top-2 start-2 text-red-500">
                  <TrashIcon className="h-5 w-5" />
                </button>
                <div className="grid grid-cols-2 gap-3 pt-6">
                  <FormInput label={t('inventory.variantSize')} value={v.size} onChange={(val) => handleVariantChange(index, 'size', val)} />
                  <FormInput label={t('inventory.variantColor')} value={v.color} onChange={(val) => handleVariantChange(index, 'color', val)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label={t('inventory.quantity')} value={v.quantity} onChange={(val) => handleVariantChange(index, 'quantity', val)} type="number" dir="ltr" />
                  <FormInput label={t('inventory.barcode')} value={v.barcode} onChange={(val) => handleVariantChange(index, 'barcode', val)} dir="ltr" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormInput label={t('inventory.purchasePrice')} value={v.purchase_price} onChange={(val) => handleVariantChange(index, 'purchase_price', val)} type="number" dir="ltr" />
                  <FormInput label={t('inventory.sellingPrice')} value={v.selling_price} onChange={(val) => handleVariantChange(index, 'selling_price', val)} type="number" dir="ltr" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isPriceTiers && product?.id && (
          <PriceTierEditor productId={product.id} storeId={storeId} />
        )}

        {/* Units Section */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
          <h3 className="font-bold text-gray-800 dark:text-gray-200">{t('inventory.unitsTitle')}</h3>
          
          <FormInput label={t('inventory.baseUnitLabel')} value={baseUnit} onChange={setBaseUnit} required />

          {showWeightFlag && (
            <label className="flex items-center gap-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isWeightBased}
                onChange={(e) => setIsWeightBased(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-green-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('inventory.weightBased')}</span>
            </label>
          )}

          {showModifierLink && (modifierGroups || []).length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('modifiers.assignGroups')}</p>
              {(modifierGroups || []).map(g => (
                <label key={g.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedModifierGroups.includes(g.id)}
                    onChange={(e) => {
                      setSelectedModifierGroups(prev =>
                        e.target.checked ? [...prev, g.id] : prev.filter(id => id !== g.id)
                      )
                    }}
                  />
                  <span>{g.name}</span>
                </label>
              ))}
            </div>
          )}
          
          {units.map((unit, index) => (
            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-3 relative border border-gray-200 dark:border-gray-700">
              <button onClick={() => handleRemoveUnit(index)} className="absolute top-2 left-2 text-red-500 hover:text-red-700">
                <TrashIcon className="h-5 w-5" />
              </button>
              
              <div className="grid grid-cols-2 gap-3 pr-6">
                <FormInput label={t('inventory.unitName')} value={unit.name} onChange={(v) => handleUnitChange(index, 'name', v)} required />
                <FormInput label={t('inventory.unitConvertsTo', { unit: baseUnit })} value={unit.conversion_rate} onChange={(v) => handleUnitChange(index, 'conversion_rate', v)} type="number" required dir="ltr" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <FormInput label={t('inventory.unitPurchasePrice', { unit: unit.name || t('inventory.unitFallback') })} value={unit.purchase_price} onChange={(v) => handleUnitChange(index, 'purchase_price', v)} type="number" dir="ltr" />
                <FormInput label={t('inventory.unitSellingPrice', { unit: unit.name || t('inventory.unitFallback') })} value={unit.selling_price} onChange={(v) => handleUnitChange(index, 'selling_price', v)} type="number" required dir="ltr" />
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <FormInput label={t('inventory.unitBarcode')} value={unit.barcode} onChange={(v) => handleUnitChange(index, 'barcode', v)} dir="ltr" />
                </div>
                <button onClick={() => { setActiveScanner(index); setShowScanner(true); }}
                  className="h-12 px-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl
                             flex items-center justify-center text-gray-700 dark:text-gray-300 active:scale-95 transition-transform shrink-0">
                  <QrCodeIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
          ))}

          <button onClick={handleAddUnit} className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <PlusIcon className="h-5 w-5" />
            {t('inventory.addUnit')}
          </button>
        </div>

        <button onClick={handleSave} disabled={loading} className="btn-primary mt-6">
          {loading ? t('common.loading') : t('common.save')}
        </button>
      </div>

      <BarcodeScanner 
        isOpen={showScanner} 
        onClose={() => setShowScanner(false)} 
        onScan={handleBarcodeScan} 
      />
    </BottomSheet>
  )
}
