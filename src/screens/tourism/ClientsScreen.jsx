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

const VISA_STATUS_COLORS = {
  applied: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  collected: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
}

export default function ClientsScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formPassport, setFormPassport] = useState('')
  const [formPassportExpiry, setFormPassportExpiry] = useState('')
  const [formCin, setFormCin] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)

  const { data: clients, isLoading } = useQuery({
    queryKey: ['travel_clients', storeId],
    queryFn: () => tourismRepository.getClients(storeId),
    enabled: !!storeId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => tourismRepository.addClient(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['travel_clients', storeId])
      toast.success(t('tourism.clientAdded'))
      setShowForm(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  const visaMutation = useMutation({
    mutationFn: ({ id, status }) => tourismRepository.updateVisaStatus(storeId, id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['travel_clients', storeId])
      toast.success(t('common.saved'))
    },
    onError: (err) => toast.error(err.message),
  })

  function resetForm() {
    setFormName('')
    setFormPhone('')
    setFormPassport('')
    setFormPassportExpiry('')
    setFormCin('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!formName.trim()) { toast.error(t('common.required')); return }
    createMutation.mutate({
      name: formName, phone: formPhone || null,
      passport_number: formPassport || null,
      passport_expiry: formPassportExpiry || null,
      cin_number: formCin || null,
    })
  }

  if (isLoading) return <LoadingSkeleton count={4} height="h-16" />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('tourism.clients')}</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary !w-auto !h-9 !px-3 !text-xs flex items-center gap-1.5">
          <PlusIcon className="w-4 h-4" /> {t('tourism.newClient')}
        </button>
      </div>

      {!clients?.length ? (
        <EmptyState title={t('tourism.emptyClients')} subtitle={t('tourism.emptyClientsHint')} />
      ) : (
        <div className="space-y-3">
          {clients.map(client => (
            <div key={client.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-50">{client.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {client.phone && `${client.phone}`}
                    {client.passport_number && ` • ${t('tourism.passportNumber')}: ${client.passport_number}`}
                  </p>
                </div>
                {client.passport_expiry && (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    new Date(client.passport_expiry) < new Date() ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {client.passport_expiry}
                  </span>
                )}
              </div>
              {client.travel_visa_tracking?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {client.travel_visa_tracking.map(visa => (
                    <span key={visa.id} className={`text-[11px] px-2 py-0.5 rounded-full ${VISA_STATUS_COLORS[visa.status] || ''}`}>
                      {t(`tourism.visa${visa.status.charAt(0).toUpperCase() + visa.status.slice(1)}`)} ({visa.country})
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <BottomSheet open={showForm} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('tourism.newClient')}</h2>
            <FormInput label={t('common.name')} value={formName} onChange={setFormName} required />
            <FormInput label={t('common.phone')} value={formPhone} onChange={setFormPhone} type="tel" />
            <FormInput label={t('tourism.passportNumber')} value={formPassport} onChange={setFormPassport} />
            <FormInput label={t('tourism.passportExpiry')} value={formPassportExpiry} onChange={setFormPassportExpiry} type="date" />
            <FormInput label={t('tourism.cinNumber')} value={formCin} onChange={setFormCin} />
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? t('common.loading') : t('common.save')}
            </button>
          </form>
        </BottomSheet>
      )}
    </div>
  )
}
