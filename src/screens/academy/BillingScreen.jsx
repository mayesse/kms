import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { academyRepository } from '../../repositories/academyRepository'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import BottomSheet from '../../components/BottomSheet'
import FormInput from '../../components/FormInput'
import FormSelect from '../../components/FormSelect'
import { PlusIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

export default function BillingScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formStudentId, setFormStudentId] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formMethod, setFormMethod] = useState('cash')
  const [formType, setFormType] = useState('tuition')
  const [formPaidDate, setFormPaidDate] = useState(new Date().toISOString().slice(0, 10))

  const { data: payments, isLoading } = useQuery({
    queryKey: ['academy_payments', storeId],
    queryFn: () => academyRepository.getPayments(storeId),
    enabled: !!storeId,
  })

  const { data: students } = useQuery({
    queryKey: ['academy_students', storeId],
    queryFn: () => academyRepository.getStudents(storeId),
    enabled: !!storeId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => academyRepository.addPayment(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['academy_payments', storeId])
      toast.success(t('academy.paymentRecorded'))
      setShowForm(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  function resetForm() {
    setFormStudentId(''); setFormAmount(''); setFormMethod('cash'); setFormType('tuition')
    setFormPaidDate(new Date().toISOString().slice(0, 10))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!formAmount || parseFloat(formAmount) <= 0) { toast.error(t('common.required')); return }
    createMutation.mutate({
      student_id: formStudentId || null, amount: parseFloat(formAmount),
      method: formMethod, type: formType, paid_date: formPaidDate || null,
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
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('academy.billing')}</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary !w-auto !h-9 !px-3 !text-xs flex items-center gap-1.5">
          <PlusIcon className="w-4 h-4" /> {t('academy.newPayment')}
        </button>
      </div>

      {!payments?.length ? (
        <EmptyState title={t('academy.emptyBilling')} />
      ) : (
        <div className="space-y-2">
          {payments.map(p => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-gray-900 dark:text-gray-50">{parseFloat(p.amount).toLocaleString()} DZD</p>
                <p className="text-xs text-gray-500">
                  {p.academy_students?.name && `${p.academy_students.name} • `}
                  {t(`academy.paymentType${p.type.charAt(0).toUpperCase() + p.type.slice(1)}`)}
                  {p.paid_date && ` • ${p.paid_date}`}
                </p>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                p.status === 'paid' ? 'bg-green-100 text-green-700' :
                p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
              }`}>{t(`common.${p.status}`)}</span>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <BottomSheet open={showForm} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('academy.newPayment')}</h2>
            <FormSelect label={t('academy.studentName')} value={formStudentId} onChange={setFormStudentId}
              options={[{ value: '', label: '—' }, ...(students || []).map(s => ({ value: s.id, label: s.name }))]} />
            <FormInput label={t('pos.total')} value={formAmount} onChange={setFormAmount} type="number" required />
            <FormSelect label={t('common.type')} value={formType} onChange={setFormType} options={[
              { value: 'enrollment', label: t('academy.paymentTypeEnrollment') },
              { value: 'tuition', label: t('academy.paymentTypeTuition') },
              { value: 'package', label: t('academy.paymentTypePackage') },
              { value: 'exam', label: t('academy.paymentTypeExam') },
              { value: 'certificate', label: t('academy.paymentTypeCertificate') },
              { value: 'other', label: t('academy.paymentTypeOther') },
            ]} />
            <FormSelect label={t('pos.paymentMethod')} value={formMethod} onChange={setFormMethod} options={[
              { value: 'cash', label: t('pos.cash') },
              { value: 'ccp', label: 'CCP' },
              { value: 'bank_transfer', label: t('common.bankTransfer') },
              { value: 'baridi_mob', label: 'Baridi Mob' },
              { value: 'other', label: t('common.other') },
            ]} />
            <FormInput label={t('tourism.paidDate')} value={formPaidDate} onChange={setFormPaidDate} type="date" />
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? t('common.loading') : t('common.save')}
            </button>
          </form>
        </BottomSheet>
      )}
    </div>
  )
}
