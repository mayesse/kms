import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../stores/authStore'
import { usePosStore } from '../../../stores/posStore'
import { productRepository } from '../../../repositories/productRepository'
import BottomSheet from '../../../components/BottomSheet'
import FormInput from '../../../components/FormInput'
import { useTranslation } from 'react-i18next'


export default function BarcodeNotFoundSheet({ isOpen, onClose, barcode }) {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const { addToCart, addManualItem } = usePosStore()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState(null) // 'add' | 'manual'
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAddProduct = async () => {
    if (!name.trim() || !price) return
    setLoading(true)
    try {
      const product = await productRepository.create(storeId, {
        name, barcode, selling_price: parseFloat(price),
        purchase_price: parseFloat(purchasePrice || 0), quantity: 0,
      })
      addToCart(product)
      queryClient.invalidateQueries(['products'])
      toast.success(t('toast.productAdded'))
      resetAndClose()
    } catch (err) {
      if (err.message?.includes('duplicate')) toast.error(t('inventory.barcodeUsed'))
      else toast.error(t('toast.saveFailed'))
    } finally { setLoading(false) }
  }

  const handleManualEntry = () => {
    if (!name.trim() || !price) return
    addManualItem(name, price)
    resetAndClose()
  }

  const resetAndClose = () => {
    setMode(null); setName(''); setPrice(''); setPurchasePrice('')
    onClose()
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={resetAndClose} title={t('pos.barcodeNotFound')}>
      {!mode ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 text-center mb-2">{t('pos.barcodeLabel')}<span dir="ltr" className="font-mono">{barcode}</span></p>
          <button onClick={() => setMode('add')} className="btn-primary">{t('pos.addNewProduct')}</button>
          <button onClick={() => setMode('manual')} className="btn-outline-green w-full">{t('pos.manualEntry')}</button>
          <button onClick={resetAndClose} className="btn-ghost w-full">{t('pos.close')}</button>
        </div>
      ) : (
        <div className="space-y-4">
          <FormInput label={t('inventory.productName')} value={name} onChange={setName} required autoFocus />
          <FormInput label={t('inventory.sellingPrice')} value={price} onChange={setPrice} type="number" required dir="ltr" />
          {mode === 'add' && (
            <FormInput label={t('inventory.purchasePrice')} value={purchasePrice} onChange={setPurchasePrice} type="number" dir="ltr" />
          )}
          <button onClick={mode === 'add' ? handleAddProduct : handleManualEntry} disabled={loading} className="btn-primary">
            {loading ? t('common.loading') : t('common.save')}
          </button>
        </div>
      )}
    </BottomSheet>
  )
}
