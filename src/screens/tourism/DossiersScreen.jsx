import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { tourismRepository } from '../../repositories/tourismRepository'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import ConfirmDialog from '../../components/ConfirmDialog'
import BottomSheet from '../../components/BottomSheet'
import FormInput from '../../components/FormInput'
import FormSelect from '../../components/FormSelect'
import { PlusIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

const STATUS_OPTIONS = [
  { value: '', labelKey: 'common.all' },
  { value: 'pending', labelKey: 'tourism.statusPending' },
  { value: 'confirmed', labelKey: 'tourism.statusConfirmed' },
  { value: 'traveled', labelKey: 'tourism.statusTraveled' },
  { value: 'returned', labelKey: 'tourism.statusReturned' },
  { value: 'cancelled', labelKey: 'tourism.statusCancelled' },
]

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  traveled: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  returned: 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export default function DossiersScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDelete, setShowDelete] = useState(null)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('group')
  const [formPackageId, setFormPackageId] = useState('')
  const [formDeparture, setFormDeparture] = useState('')
  const [formReturn, setFormReturn] = useState('')

  const { data: dossiers, isLoading } = useQuery({
    queryKey: ['travel_dossiers', storeId, statusFilter],
    queryFn: () => tourismRepository.getDossiers(storeId, { status: statusFilter || undefined }),
    enabled: !!storeId,
  })

  const { data: packages } = useQuery({
    queryKey: ['travel_packages', storeId],
    queryFn: () => tourismRepository.getPackages(storeId),
    enabled: !!storeId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => tourismRepository.createDossier(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['travel_dossiers', storeId])
      toast.success(t('tourism.dossierCreated'))
      setShowForm(false)
      resetForm()
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => tourismRepository.deleteDossier(storeId, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['travel_dossiers', storeId])
      toast.success(t('common.deleted'))
      setShowDelete(null)
    },
    onError: (err) => toast.error(err.message),
  })

  function resetForm() {
    setFormName('')
    setFormType('group')
    setFormPackageId('')
    setFormDeparture('')
    setFormReturn('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!formName.trim()) { toast.error(t('common.required')); return }
    createMutation.mutate({
      name: formName,
      type: formType,
      package_id: formPackageId || null,
      departure_date: formDeparture || null,
      return_date: formReturn || null,
    })
  }

  if (isLoading) return <LoadingSkeleton count={4} height="h-16" />

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1.5"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
            ))}
          </select>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary !w-auto !h-9 !px-3 !text-xs flex items-center gap-1.5">
          <PlusIcon className="w-4 h-4" />
          {t('tourism.newDossier')}
        </button>
      </div>

      {!dossiers?.length ? (
        <EmptyState title={t('tourism.emptyDossiers')} subtitle={t('tourism.emptyDossiersHint')} />
      ) : (
        <div className="space-y-3">
          {dossiers.map(d => (
            <div key={d.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-50">{d.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {d.travel_packages?.name || '—'} • {d.type === 'group' ? t('tourism.dossierTypeGroup') : t('tourism.dossierTypeIndividual')}
                  </p>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[d.status] || STATUS_COLORS.pending}`}>
                  {t(`tourism.status${d.status.charAt(0).toUpperCase() + d.status.slice(1)}`)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {d.departure_date && <span>{t('tourism.departure')}: {d.departure_date}</span>}
                {d.max_participants && <span>{d.quota_used || 0}/{d.max_participants}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <BottomSheet open={showForm} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t('tourism.newDossier')}</h2>
            <FormInput label={t('tourism.dossierName')} value={formName} onChange={setFormName} required />
            <FormSelect label={t('common.type')} value={formType} onChange={setFormType} options={[
              { value: 'group', label: t('tourism.dossierTypeGroup') },
              { value: 'individual', label: t('tourism.dossierTypeIndividual') },
            ]} />
            <FormSelect label={t('tourism.packages')} value={formPackageId} onChange={setFormPackageId} options={[
              { value: '', label: '—' },
              ...(packages || []).map(p => ({ value: p.id, label: p.name })),
            ]} />
            <FormInput label={t('tourism.departure')} value={formDeparture} onChange={setFormDeparture} type="date" />
            <FormInput label={t('tourism.return')} value={formReturn} onChange={setFormReturn} type="date" />
            <button type="submit" disabled={createMutation.isPending} className="btn-primary">
              {createMutation.isPending ? t('common.loading') : t('common.save')}
            </button>
          </form>
        </BottomSheet>
      )}

      {showDelete && (
        <ConfirmDialog
          message={t('common.deleteConfirm')}
          onConfirm={() => deleteMutation.mutate(showDelete)}
          onCancel={() => setShowDelete(null)}
        />
      )}
    </div>
  )
}
