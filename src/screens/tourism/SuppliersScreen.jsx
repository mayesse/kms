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

const SUPPLIER_TYPES = ['airline', 'hotel', 'bus', 'insurance', 'guide', 'other']

export default function SuppliersScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('hotel')
  const [formPhone, setFormPhone] = useState('')
  const [formCommission, setFormCommission] = useState('')

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['travel_suppliers', storeId],
    queryFn: () => tourismRepository.getSuppliers(storeId),
    enabled: !!storeId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => tourismRepository.addSupplier(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['travel_suppliers', storeId])
      toast.success(t('tourism.supplierSaved'))
      setShowForm(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  function resetForm() {
    setFormName('')
    setFormType('hotel')
    setFormPhone('')
    setFormCommission('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!formName.trim()) { toast.error(t('common.required')); return }
    createMutation.mutate({
      name: formName, type: formType, phone: formPhone || null,
      commission_rate: formCommission ? parseFloat(formCommission) : 0,
    })
  }

  if (isLoading) return <LoadingSkeleton count={4} height="h-16" />

  const grouped = (suppliers || []).reduce((acc, s) => {
    if (!acc[s.type]) acc[s.type] = []
    acc[s.type].push(s)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('tourism.suppliers')}</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary !w-auto !h-9 !px-3 !text-xs flex items-center gap-1.5">
          <PlusIcon className="w-4 h-4" /> {t('tourism.newSupplier')}
        </button>
      </div>

      {!suppliers?.length ? (
        <EmptyState title={t('tourism.emptySuppliers') || t('common.empty')} />
      ) : (
        <div className="space-y-4">
          {SUPPLIER_TYPES.filter(type => grouped[type]?.length).map(type => (
            <div key={type}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {t(`tourism.supplierType${type.charAt(0).toUpperCase() + type.slice(1)}`)}
              </h3>
              <div className="space-y-2">
                {grouped[type].map(s => (
                  <div key={s.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-gray-50">{s.name}</p>
                        {s.phone && <p className="text-xs text-gray-500 mt-0.5">{s.phone}</p>}
                      </div>
                      {s.commission_rate > 0 && <span className="text-xs text-gray-500">{s.commission_rate}%</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <BottomSheet open={showForm} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('tourism.newSupplier')}</h2>
            <FormInput label={t('tourism.supplierName')} value={formName} onChange={setFormName} required />
            <FormSelect label={t('common.type')} value={formType} onChange={setFormType} options={SUPPLIER_TYPES.map(type => ({
              value: type, label: t(`tourism.supplierType${type.charAt(0).toUpperCase() + type.slice(1)}`),
            }))} />
            <FormInput label={t('common.phone')} value={formPhone} onChange={setFormPhone} type="tel" />
            <FormInput label={t('tourism.commissionRate')} value={formCommission} onChange={setFormCommission} type="number" />
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? t('common.loading') : t('common.save')}
            </button>
          </form>
        </BottomSheet>
      )}
    </div>
  )
}
