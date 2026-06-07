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

export default function HajjScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('omra')
  const [formDestination, setFormDestination] = useState('')
  const [formDuration, setFormDuration] = useState('')

  const { data: packages, isLoading } = useQuery({
    queryKey: ['travel_packages_hajj', storeId],
    queryFn: () => tourismRepository.getPackages(storeId, 'hajj'),
    enabled: !!storeId,
  })

  const { data: omraPackages } = useQuery({
    queryKey: ['travel_packages_omra', storeId],
    queryFn: () => tourismRepository.getPackages(storeId, 'omra'),
    enabled: !!storeId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => tourismRepository.createPackage(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['travel_packages_hajj', storeId])
      queryClient.invalidateQueries(['travel_packages_omra', storeId])
      toast.success(t('tourism.packageCreated'))
      setShowForm(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  function resetForm() {
    setFormName('')
    setFormType('omra')
    setFormDestination('')
    setFormDuration('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!formName.trim()) { toast.error(t('common.required')); return }
    createMutation.mutate({
      name: formName, type: formType, destination: formDestination || null,
      duration_days: formDuration ? parseInt(formDuration) : null,
    })
  }

  if (isLoading) return <LoadingSkeleton count={4} height="h-16" />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('tourism.hajj')}</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary !w-auto !h-9 !px-3 !text-xs flex items-center gap-1.5">
          <PlusIcon className="w-4 h-4" /> {t('tourism.newPackage')}
        </button>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">🕋 {t('tourism.typeHajj')}</h3>
        {!packages?.length ? (
          <EmptyState title={t('tourism.emptyPackages')} subtitle={t('tourism.emptyPackagesHint')} />
        ) : (
          <div className="space-y-2">
            {packages.map(pkg => (
              <div key={pkg.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-50">{pkg.name}</h4>
                    {pkg.destination && <p className="text-xs text-gray-500 mt-0.5">{pkg.destination}</p>}
                  </div>
                  {pkg.duration_days && <span className="text-xs text-gray-500">{pkg.duration_days} {t('tourism.duration')}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">🕌 {t('tourism.typeOmra')}</h3>
        {!omraPackages?.length ? (
          <EmptyState title={t('tourism.emptyPackages')} subtitle={t('tourism.emptyPackagesHint')} />
        ) : (
          <div className="space-y-2">
            {omraPackages.map(pkg => (
              <div key={pkg.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-50">{pkg.name}</h4>
                    {pkg.destination && <p className="text-xs text-gray-500 mt-0.5">{pkg.destination}</p>}
                  </div>
                  {pkg.duration_days && <span className="text-xs text-gray-500">{pkg.duration_days} {t('tourism.duration')}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <BottomSheet open={showForm} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('tourism.newPackage')}</h2>
            <FormInput label={t('tourism.packageName')} value={formName} onChange={setFormName} required />
            <FormSelect label={t('common.type')} value={formType} onChange={setFormType} options={[
              { value: 'hajj', label: t('tourism.typeHajj') },
              { value: 'omra', label: t('tourism.typeOmra') },
            ]} />
            <FormInput label={t('tourism.destination')} value={formDestination} onChange={setFormDestination} />
            <FormInput label={t('tourism.duration')} value={formDuration} onChange={setFormDuration} type="number" />
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? t('common.loading') : t('common.save')}
            </button>
          </form>
        </BottomSheet>
      )}
    </div>
  )
}
