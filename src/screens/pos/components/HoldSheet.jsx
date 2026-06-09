import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../stores/authStore'
import { usePosStore } from '../../../stores/posStore'
import { holdRepository } from '../../../repositories/holdRepository'
import BottomSheet from '../../../components/BottomSheet'
import FormInput from '../../../components/FormInput'
import { useTranslation } from 'react-i18next'

export default function HoldSheet({ isOpen, onClose }) {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const { cart, getTotal, clearCart } = usePosStore()
  const queryClient = useQueryClient()
  const [customerName, setCustomerName] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleHold = async () => {
    if (!customerName.trim()) { setError(t('common.required')); return }
    setError('')
    setLoading(true)
    try {
      await holdRepository.createHold(storeId, customerName, note, cart, getTotal())
      clearCart()
      queryClient.invalidateQueries(['holds'])
      toast.success(t('toast.holdCreated'))
      onClose()
      setCustomerName('')
      setNote('')
    } catch { toast.error(t('toast.saveFailed')) }
    finally { setLoading(false) }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('pos.holdSale')}>
      <div className="space-y-4">
        <FormInput label={t('pos.holdCustomerName')} value={customerName} onChange={setCustomerName} required error={error} />
        <FormInput label={t('pos.holdNote')} value={note} onChange={setNote} />
        <button onClick={handleHold} disabled={loading} className="btn-primary">
          {loading ? t('common.loading') : t('pos.holdSaveBtn')}
        </button>
      </div>
    </BottomSheet>
  )
}
