import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { tourismRepository } from '../../repositories/tourismRepository'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import BottomSheet from '../../components/BottomSheet'
import FormInput from '../../components/FormInput'
import FormSelect from '../../components/FormSelect'
import { PlusIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

export default function PaymentsScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formAmount, setFormAmount] = useState('')
  const [formMethod, setFormMethod] = useState('cash')
  const [formPaidDate, setFormPaidDate] = useState(new Date().toISOString().slice(0, 10))
  const [formNotes, setFormNotes] = useState('')

  const { data: payments, isLoading } = useQuery({
    queryKey: ['travel_payments', storeId],
    queryFn: () => tourismRepository.getPayments(storeId),
    enabled: !!storeId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => tourismRepository.addPayment(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['travel_payments', storeId])
      toast.success(t('tourism.paymentRecorded'))
      setShowForm(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  function resetForm() {
    setFormAmount('')
    setFormMethod('cash')
    setFormPaidDate(new Date().toISOString().slice(0, 10))
    setFormNotes('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!formAmount || parseFloat(formAmount) <= 0) { toast.error(t('common.required')); return }
    createMutation.mutate({
      amount: parseFloat(formAmount), method: formMethod,
      paid_date: formPaidDate || null, notes: formNotes || null,
    })
  }

  const totalPaid = (payments || []).filter(p => p.status === 'paid').reduce((s, p) => s + parseFloat(p.amount || 0), 0)
  const totalPending = (payments || []).filter(p => p.status === 'pending').reduce((s, p) => s + parseFloat(p.amount || 0), 0)

  if (isLoading) return <LoadingSkeleton count={4} height="h-16" />

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-200 dark:border-green-800">
          <p className="text-xs text-green-600 dark:text-green-400">{t('common.paid')}</p>
          <p className="text-xl font-bold text-green-700 dark:text-green-300">{totalPaid.toLocaleString()} DZD</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 border border-yellow-200 dark:border-yellow-800">
          <p className="text-xs text-yellow-600 dark:text-yellow-400">{t('common.pending')}</p>
          <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">{totalPending.toLocaleString()} DZD</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('tourism.payments')}</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary !w-auto !h-9 !px-3 !text-xs flex items-center gap-1.5">
          <PlusIcon className="w-4 h-4" /> {t('tourism.newPayment')}
        </button>
      </div>

      {!payments?.length ? (
        <EmptyState title={t('tourism.emptyPayments')} />
      ) : (
        <div className="space-y-2">
          {payments.map(p => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-50">{parseFloat(p.amount).toLocaleString()} DZD</p>
                <p className="text-xs text-gray-500">
                  {p.travel_clients?.name && `${p.travel_clients.name} • `}
                  {
  { cash: t('pos.cash'), ccp: 'CCP', bank_transfer: t('receipt.bankTransfer'), baridi_mob: t('receipt.baridiMob'), other: t('receipt.other') }[p.method] || p.method
}{p.paid_date && ` • ${p.paid_date}`}
                </p>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                p.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                p.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' :
                p.status === 'overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                'bg-gray-100 text-gray-600'
              }`}>
                {p.status === 'paid' ? t('common.paid') : p.status === 'pending' ? t('common.pending') : p.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <BottomSheet open={showForm} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('tourism.newPayment')}</h2>
            <FormInput label={t('pos.total')} value={formAmount} onChange={setFormAmount} type="number" required />
            <FormSelect label={t('pos.paymentMethod')} value={formMethod} onChange={setFormMethod} options={[
              { value: 'cash', label: t('pos.cash') },
              { value: 'ccp', label: 'CCP' },
              { value: 'bank_transfer', label: t('common.bankTransfer') },
              { value: 'baridi_mob', label: 'Baridi Mob' },
              { value: 'other', label: t('common.other') },
            ]} />
            <FormInput label={t('tourism.paidDate')} value={formPaidDate} onChange={setFormPaidDate} type="date" />
            <FormInput label={t('common.notes')} value={formNotes} onChange={setFormNotes} />
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? t('common.loading') : t('common.save')}
            </button>
          </form>
        </BottomSheet>
      )}
    </div>
  )
}
