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
import { PlusIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

const TYPE_OPTIONS = [
  { value: '', labelKey: 'common.all' },
  { value: 'hajj', labelKey: 'tourism.typeHajj' },
  { value: 'omra', labelKey: 'tourism.typeOmra' },
  { value: 'international', labelKey: 'tourism.typeInternational' },
  { value: 'domestic', labelKey: 'tourism.typeDomestic' },
]

const TYPE_COLORS = {
  hajj: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  omra: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  international: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  domestic: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

export default function PackagesScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('omra')
  const [formDestination, setFormDestination] = useState('')
  const [formDuration, setFormDuration] = useState('')

  const { data: packages, isLoading } = useQuery({
    queryKey: ['travel_packages', storeId, typeFilter],
    queryFn: () => tourismRepository.getPackages(storeId, typeFilter || undefined),
    enabled: !!storeId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => tourismRepository.createPackage(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['travel_packages', storeId])
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
      name: formName,
      type: formType,
      destination: formDestination || null,
      duration_days: formDuration ? parseInt(formDuration) : null,
    })
  }

  if (isLoading) return <LoadingSkeleton count={4} height="h-16" />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-4 h-4 text-gray-400" />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1.5">
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
          </select>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary !w-auto !h-9 !px-3 !text-xs flex items-center gap-1.5">
          <PlusIcon className="w-4 h-4" /> {t('tourism.newPackage')}
        </button>
      </div>

      {!packages?.length ? (
        <EmptyState title={t('tourism.emptyPackages')} subtitle={t('tourism.emptyPackagesHint')} />
      ) : (
        <div className="space-y-3">
          {packages.map(pkg => (
            <div key={pkg.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-50">{pkg.name}</h3>
                  {pkg.destination && <p className="text-xs text-gray-500 mt-0.5">{pkg.destination}{pkg.duration_days ? ` • ${pkg.duration_days} ${t('tourism.duration')}` : ''}</p>}
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[pkg.type]}`}>{t(`tourism.type${pkg.type.charAt(0).toUpperCase() + pkg.type.slice(1)}`)}</span>
              </div>
              {pkg.travel_package_tiers?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {pkg.travel_package_tiers.map(tier => (
                    <span key={tier.id} className="text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                      {tier.name}
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
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('tourism.newPackage')}</h2>
            <FormInput label={t('tourism.packageName')} value={formName} onChange={setFormName} required />
            <FormSelect label={t('common.type')} value={formType} onChange={setFormType} options={[
              { value: 'hajj', label: t('tourism.typeHajj') },
              { value: 'omra', label: t('tourism.typeOmra') },
              { value: 'international', label: t('tourism.typeInternational') },
              { value: 'domestic', label: t('tourism.typeDomestic') },
            ]} />
            <FormInput label={t('tourism.destination')} value={formDestination} onChange={setFormDestination} placeholder={t('tourism.destinationPlaceholder')} />
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
