import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { taxRateRepository } from '../../repositories/taxRateRepository'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import ConfirmDialog from '../../components/ConfirmDialog'
import BottomSheet from '../../components/BottomSheet'
import FormInput from '../../components/FormInput'
import Badge from '../../components/Badge'
import { PlusIcon, CheckCircleIcon, XCircleIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

export default function TaxRatesScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editRate, setEditRate] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [formName, setFormName] = useState('')
  const [formRate, setFormRate] = useState('')
  const [formIsDefault, setFormIsDefault] = useState(false)
  const [formIsActive, setFormIsActive] = useState(true)

  const { data: rates, isLoading } = useQuery({
    queryKey: ['tax_rates', storeId],
    queryFn: () => taxRateRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => taxRateRepository.create(storeId, data),
    onSuccess: () => { queryClient.invalidateQueries(['tax_rates']); toast.success(t('taxRates.created')); closeForm() },
    onError: () => toast.error(t('taxRates.createFailed')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => taxRateRepository.update(storeId, id, data),
    onSuccess: () => { queryClient.invalidateQueries(['tax_rates']); toast.success(t('taxRates.updated')); closeForm() },
    onError: () => toast.error(t('taxRates.updateFailed')),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => taxRateRepository.update(storeId, id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tax_rates'])
      toast.success(t('taxRates.toggleSuccess'))
    },
    onError: () => toast.error(t('taxRates.toggleFailed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => taxRateRepository.delete(storeId, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['tax_rates'])
      toast.success(t('taxRates.deleted'))
    },
    onError: () => toast.error(t('taxRates.deleteFailed')),
  })

  const activeRates = (rates || []).filter(r => r.is_active)
  const inactiveRates = (rates || []).filter(r => !r.is_active)

  const closeForm = () => {
    setShowForm(false)
    setEditRate(null)
    setFormName('')
    setFormRate('')
    setFormIsDefault(false)
    setFormIsActive(true)
  }

  const openEdit = (r) => {
    setEditRate(r)
    setFormName(r.name)
    setFormRate(String(r.rate))
    setFormIsDefault(r.is_default)
    setFormIsActive(r.is_active)
    setShowForm(true)
  }

  const handleSave = () => {
    if (!formName.trim()) { toast.error(t('taxRates.nameRequired')); return }
    if (!formRate || isNaN(formRate) || Number(formRate) < 0) { toast.error(t('taxRates.rateRequired')); return }
    const payload = { name: formName.trim(), rate: Number(formRate), is_default: formIsDefault, is_active: formIsActive }
    if (editRate) { updateMutation.mutate({ id: editRate.id, data: payload }) }
    else { createMutation.mutate(payload) }
  }

  const handleDeleteClick = (r) => {
    if (r.is_default) { toast.error(t('taxRates.cannotDeleteDefault')); return }
    setDeleteTarget(r)
  }

  const handleToggle = (e, r) => {
    e.stopPropagation()
    toggleMutation.mutate({ id: r.id, is_active: !r.is_active })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('taxRates.title')}</h1>
          <button onClick={() => setShowForm(true)}
            className="h-10 w-10 grid place-items-center rounded-xl bg-green-600 text-white active:scale-95 transition-transform">
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      {isLoading ? <LoadingSkeleton count={4} /> : (
        <main className="p-4 space-y-4">
          {rates?.length === 0 ? (
            <EmptyState icon="🏷️" title={t('taxRates.emptyTitle')} subtitle={t('taxRates.emptySubtitle')} actionLabel={t('taxRates.addTax')} onAction={() => setShowForm(true)} />
          ) : (
            <>
              {activeRates.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <div className="card" onClick={() => openEdit(r)}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 dark:text-gray-50">{r.name}</p>
                          {r.is_default && <Badge variant="info">{t('taxRates.default')}</Badge>}
                        </div>
                        <p className="text-xs text-gray-400">{r.rate}%</p>
                      </div>
                      <button onClick={(e) => handleToggle(e, r)} className="shrink-0">
                        {r.is_active ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
              {inactiveRates.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-2 px-1">{t('taxRates.inactive', { count: inactiveRates.length })}</p>
                  {inactiveRates.map((r) => (
                    <div key={r.id} className="card opacity-50 mb-2" onClick={() => openEdit(r)}>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-500">{r.name}</p>
                            {r.is_default && <Badge variant="info">{t('taxRates.default')}</Badge>}
                          </div>
                          <p className="text-xs text-gray-400">{r.rate}%</p>
                        </div>
                        <button onClick={(e) => handleToggle(e, r)} className="shrink-0">
                          {r.is_active ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      )}

      <BottomSheet isOpen={showForm} onClose={closeForm} title={editRate ? t('taxRates.editTax') : t('taxRates.addTax')} large>
        <div className="space-y-4">
          <FormInput label={t('taxRates.taxName')} value={formName} onChange={setFormName} placeholder={t('taxRates.taxNamePlaceholder')} required />
          <FormInput label={t('taxRates.ratePercent')} value={formRate} onChange={setFormRate} type="number" placeholder={t('taxRates.ratePlaceholder')} dir="ltr" required />
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('taxRates.isDefault')}</label>
            <button
              type="button"
              onClick={() => setFormIsDefault(!formIsDefault)}
              className={`w-12 h-6 rounded-full transition-colors relative ${formIsDefault ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${formIsDefault ? 'start-0.5 translate-x-full' : 'start-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('taxRates.isActive')}</label>
            <button
              type="button"
              onClick={() => setFormIsActive(!formIsActive)}
              className={`w-12 h-6 rounded-full transition-colors relative ${formIsActive ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${formIsActive ? 'start-0.5 translate-x-full' : 'start-0.5'}`} />
            </button>
          </div>
          <button onClick={handleSave} className="btn-primary">{editRate ? t('taxRates.update') : t('taxRates.add')}</button>
          {editRate && (
            <button
              onClick={() => handleDeleteClick(editRate)}
              className="w-full h-10 rounded-lg font-semibold text-red-600 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <TrashIcon className="h-4 w-4" />
              {t('taxRates.deleteTax')}
            </button>
          )}
        </div>
      </BottomSheet>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null) }}
        title={t('taxRates.deleteTitle')}
        message={t('taxRates.deleteMessage')}
        confirmLabel={t('taxRates.deleteConfirm')}
        danger
      />
    </motion.div>
  )
}
