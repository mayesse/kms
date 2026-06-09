import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../stores/authStore'
import { purchaseRepository } from '../../../repositories/purchaseRepository'
import BottomSheet from '../../../components/BottomSheet'
import Badge from '../../../components/Badge'
import FormInput from '../../../components/FormInput'
import { formatCurrency, formatDate } from '../../../utils/format'
import { useTranslation } from 'react-i18next'

export default function PurchaseDetailSheet({ purchaseId, onClose }) {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [showPayment, setShowPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: purchase, refetch } = useQuery({
    queryKey: ['purchase', purchaseId],
    queryFn: () => purchaseRepository.getDetail(storeId, purchaseId),
    enabled: !!purchaseId,
  })

  if (!purchase) return null

  const totalAmount = parseFloat(purchase.total_amount || 0)
  const amountPaid = parseFloat(purchase.amount_paid || 0)
  const remaining = Math.max(0, totalAmount - amountPaid)
  const isPaid = amountPaid >= totalAmount
  const isPartial = amountPaid > 0 && amountPaid < totalAmount

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) return
    setLoading(true)
    try {
      await purchaseRepository.recordPayment(storeId, purchase.id, amount)
      queryClient.invalidateQueries(['purchases'])
      queryClient.invalidateQueries(['purchase', purchaseId])
      refetch()
      toast.success(t('purchases.paymentRecorded', { amount: formatCurrency(amount) }))
      setPaymentAmount('')
      setShowPayment(false)
    } catch { toast.error(t('toast.saveFailed')) }
    finally { setLoading(false) }
  }

  const handleMarkPaid = async () => {
    setLoading(true)
    try {
      await purchaseRepository.markFullyPaid(storeId, purchase.id)
      queryClient.invalidateQueries(['purchases'])
      queryClient.invalidateQueries(['purchase', purchaseId])
      refetch()
      toast.success(t('purchases.fullyPaid'))
    } catch { toast.error(t('toast.saveFailed')) }
    finally { setLoading(false) }
  }

  return (
    <BottomSheet isOpen={!!purchaseId} onClose={onClose} title={t('purchases.purchaseDetail')} large>
      <div className="space-y-4">
        {/* Supplier info */}
        <div className="card bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">{t('purchases.supplier')}</p>
              <p className="font-bold text-gray-900 dark:text-gray-50">{purchase.suppliers?.name || '—'}</p>
              {purchase.suppliers?.phone && (
                <p className="text-xs text-gray-400" dir="ltr">{purchase.suppliers.phone}</p>
              )}
            </div>
            <Badge variant={isPaid ? 'success' : isPartial ? 'warning' : 'danger'}>
              {isPaid ? t('purchases.paid') : isPartial ? t('purchases.partial') : t('purchases.unpaid')}
            </Badge>
          </div>
        </div>

        {/* Payment summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="card text-center">
            <p className="text-[10px] text-gray-500">{t('purchases.totalAmount')}</p>
            <p className="font-bold text-sm text-gray-900 dark:text-gray-50">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="card text-center">
            <p className="text-[10px] text-gray-500">{t('purchases.paidAmount')}</p>
            <p className="font-bold text-sm text-green-600">{formatCurrency(amountPaid)}</p>
          </div>
          <div className="card text-center">
            <p className="text-[10px] text-gray-500">{t('purchases.remainingAmount')}</p>
            <p className={`font-bold text-sm ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>

        {/* Payment progress */}
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isPaid ? 'bg-green-500' : 'bg-amber-500'}`}
            style={{ width: `${Math.min(100, (amountPaid / totalAmount) * 100)}%` }}
          />
        </div>

        {/* Date */}
        <p className="text-sm text-gray-500">{t('purchases.dateLabel')}: {formatDate(purchase.created_at)}</p>
        {purchase.note && <p className="text-sm text-gray-400">{t('purchases.noteLabel')}: {purchase.note}</p>}

        {/* Items */}
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('purchases.products')}</p>
          <div className="space-y-1">
            {purchase.purchase_items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-gray-900 dark:text-gray-50">{item.products?.name || t('purchases.product')}</span>
                <span className="text-gray-500">
                  {item.quantity} × {formatCurrency(item.purchase_price)}
                  <span className="font-semibold text-gray-900 dark:text-gray-50 ms-2">
                    = {formatCurrency(item.quantity * parseFloat(item.purchase_price))}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment actions */}
        {!isPaid && (
          <div className="space-y-2 pt-2">
            {showPayment ? (
              <div className="space-y-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <FormInput
                  label={t('purchases.paymentAmount')}
                  value={paymentAmount}
                  onChange={setPaymentAmount}
                  type="number"
                  dir="ltr"
                  autoFocus
                  placeholder={`${t('purchases.maxAmount')}: ${remaining.toFixed(2)}`}
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowPayment(false)} className="btn-ghost flex-1">{t('common.cancel')}</button>
                  <button onClick={handleRecordPayment} disabled={loading} className="btn-primary flex-1">
                    {loading ? t('common.loading') : t('purchases.recordPayment')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button onClick={() => setShowPayment(true)} className="btn-outline-green w-full">
                  💵 {t('purchases.recordPartialPayment')}
                </button>
                <button onClick={handleMarkPaid} disabled={loading} className="btn-primary">
                  ✅ {t('purchases.payFullAmount', { amount: formatCurrency(remaining) })}
                </button>
              </>
            )}
          </div>
        )}

        {isPaid && (
          <div className="text-center py-4">
            <span className="text-3xl">✅</span>
            <p className="text-green-600 font-semibold mt-2">{t('purchases.fullyPaidMessage')}</p>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
