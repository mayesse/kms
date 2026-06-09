import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../stores/authStore'
import { productRepository } from '../../../repositories/productRepository'
import BottomSheet from '../../../components/BottomSheet'
import ConfirmDialog from '../../../components/ConfirmDialog'
import FormInput from '../../../components/FormInput'
import Badge from '../../../components/Badge'
import { formatCurrency } from '../../../utils/format'
import { useTranslation } from 'react-i18next'

export default function ProductDetailSheet({ product, onClose, onEdit }) {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [showDelete, setShowDelete] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)
  const [adjustDelta, setAdjustDelta] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [loading, setLoading] = useState(false)

  if (!product) return null

  const stockPercent = Math.min(100, Math.max(0, (product.quantity / Math.max(product.min_stock_threshold * 3, 1)) * 100))
  const stockColor = product.quantity < 0 ? 'bg-red-500' : product.quantity <= product.min_stock_threshold ? 'bg-amber-500' : 'bg-green-500'

  const handleDelete = async () => {
    await productRepository.delete(storeId, product.id)
    queryClient.invalidateQueries(['products'])
    toast.success(t('toast.deleted'))
    onClose()
  }

  const handleAdjust = async () => {
    if (!adjustDelta) return
    setLoading(true)
    try {
      await productRepository.adjustStock(storeId, product.id, parseInt(adjustDelta), adjustReason)
      queryClient.invalidateQueries(['products'])
      queryClient.invalidateQueries(['stockValue'])
      toast.success(t('toast.stockUpdated'))
      setShowAdjust(false)
      setAdjustDelta(''); setAdjustReason('')
      onClose()
    } catch { toast.error(t('toast.saveFailed')) }
    finally { setLoading(false) }
  }

  return (
    <>
      <BottomSheet isOpen={!!product} onClose={onClose} title={product.name} large>
        <div className="space-y-4">
          {/* Stock bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">{t('inventory.quantity')}</span>
              <span className={product.quantity < 0 ? 'text-red-600 font-bold' : 'font-semibold'}>{product.quantity}</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${stockColor} transition-all`} style={{ width: `${stockPercent}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0</span><span>{t('inventory.minThresholdLabel', { count: product.min_stock_threshold })}</span>
            </div>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card"><p className="text-xs text-gray-500">{t('inventory.sellingPrice')}</p><p className="font-bold text-green-600">{formatCurrency(product.selling_price)}</p></div>
            <div className="card"><p className="text-xs text-gray-500">{t('inventory.purchasePrice')}</p><p className="font-bold">{formatCurrency(product.purchase_price)}</p></div>
          </div>

          {product.barcode && <p className="text-sm text-gray-400">{t('inventory.barcodeLabel')}: <span dir="ltr" className="font-mono">{product.barcode}</span></p>}
          {product.categories?.name && <Badge variant="info">{product.categories.name}</Badge>}

          {/* Car parts info */}
          {(product.car_make || product.car_model || product.car_oem) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 space-y-1 text-sm">
              <p className="font-semibold text-blue-700 dark:text-blue-300">{t('inventory.carInfo')}</p>
              {product.car_make && <p className="text-gray-600 dark:text-gray-400">{t('inventory.carMakeLabel', { make: product.car_make })}</p>}
              {product.car_model && <p className="text-gray-600 dark:text-gray-400">{t('inventory.carModelLabel', { model: product.car_model })}</p>}
              {product.car_year && <p className="text-gray-600 dark:text-gray-400">{t('inventory.carYearLabel', { year: product.car_year })}</p>}
              {product.car_oem && <p className="text-gray-600 dark:text-gray-400">{t('inventory.carOemLabel', { oem: product.car_oem })}</p>}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button onClick={() => setShowAdjust(true)} className="btn-outline-green w-full">{t('inventory.adjustStock')}</button>
            <button onClick={() => onEdit(product)} className="btn-ghost w-full">{t('inventory.edit')}</button>
            <button onClick={() => setShowDelete(true)} className="btn-danger">{t('inventory.delete')}</button>
          </div>
        </div>
      </BottomSheet>

      {/* Adjust stock sheet */}
      <BottomSheet isOpen={showAdjust} onClose={() => setShowAdjust(false)} title={t('inventory.adjustStock')}>
        <div className="space-y-4">
          <FormInput label={t('inventory.adjustAmount')} value={adjustDelta} onChange={setAdjustDelta} type="number" dir="ltr" autoFocus placeholder={t('inventory.adjustPlaceholder')} />
          <FormInput label={t('inventory.adjustReason')} value={adjustReason} onChange={setAdjustReason} />
          <button onClick={handleAdjust} disabled={loading} className="btn-primary">{loading ? t('common.loading') : t('common.confirm')}</button>
        </div>
      </BottomSheet>

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete}
        message={`${t('inventory.deleteConfirm')}\n${product.name}`} />
    </>
  )
}
