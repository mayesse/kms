import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { commissionRuleRepository } from '../../repositories/commissionRuleRepository'
import { staffRepository } from '../../repositories/staffRepository'
import SearchInput from '../../components/SearchInput'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import ConfirmDialog from '../../components/ConfirmDialog'
import BottomSheet from '../../components/BottomSheet'
import FormInput from '../../components/FormInput'
import FormSelect from '../../components/FormSelect'
import { PlusIcon, CheckCircleIcon, XCircleIcon, PercentBadgeIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

export default function CommissionsScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editRule, setEditRule] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [formStaffId, setFormStaffId] = useState('')
  const [formRate, setFormRate] = useState('')
  const [formAppliesTo, setFormAppliesTo] = useState('all')
  const [formProductId, setFormProductId] = useState('')
  const [formServiceId, setFormServiceId] = useState('')
  const [formActive, setFormActive] = useState(true)

  const { data: rules, isLoading } = useQuery({
    queryKey: ['commissions', storeId],
    queryFn: () => commissionRuleRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const { data: staffList } = useQuery({
    queryKey: ['staff', storeId],
    queryFn: () => staffRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => commissionRuleRepository.create(storeId, data),
    onSuccess: () => { queryClient.invalidateQueries(['commissions']); toast.success(t('commissions.created')); closeForm() },
    onError: () => toast.error(t('commissions.createFailed')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => commissionRuleRepository.update(storeId, id, data),
    onSuccess: () => { queryClient.invalidateQueries(['commissions']); toast.success(t('commissions.updated')); closeForm() },
    onError: () => toast.error(t('commissions.updateFailed')),
  })


  const deleteMutation = useMutation({
    mutationFn: (id) => commissionRuleRepository.delete(storeId, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['commissions'])
      toast.success(t('commissions.deleted'))
    },
    onError: () => toast.error(t('commissions.deleteFailed')),
  })

  const filtered = (rules || []).filter(r =>
    !search || (r.staff?.name || '').includes(search)
  )

  const activeRules = filtered.filter(r => r.is_active)
  const inactiveRules = filtered.filter(r => !r.is_active)

  const closeForm = () => {
    setShowForm(false)
    setEditRule(null)
    setFormStaffId('')
    setFormRate('')
    setFormAppliesTo('all')
    setFormProductId('')
    setFormServiceId('')
    setFormActive(true)
  }

  const openEdit = (r) => {
    setEditRule(r)
    setFormStaffId(r.staff_id)
    setFormRate(String(r.commission_rate))
    setFormAppliesTo(r.applies_to || 'all')
    setFormProductId(r.product_id || '')
    setFormServiceId(r.service_id || '')
    setFormActive(r.is_active)
    setShowForm(true)
  }

  const handleSave = () => {
    if (!formStaffId) { toast.error(t('commissions.selectStaff')); return }
    if (!formRate || isNaN(formRate) || Number(formRate) <= 0) { toast.error(t('commissions.invalidRate')); return }
    const payload = {
      staff_id: formStaffId,
      commission_rate: Number(formRate),
      applies_to: formAppliesTo,
      product_id: formAppliesTo === 'product' ? (formProductId || null) : null,
      service_id: formAppliesTo === 'service' ? (formServiceId || null) : null,
      is_active: formActive,
    }
    if (editRule) { updateMutation.mutate({ id: editRule.id, data: payload }) }
    else { createMutation.mutate(payload) }
  }

  const appliesToLabel = (v) => {
    if (v === 'product') return t('commissions.appliesProduct')
    if (v === 'service') return t('commissions.appliesService')
    return t('commissions.appliesAll')
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('commissions.title')}</h1>
          <button onClick={() => setShowForm(true)}
            className="h-10 w-10 grid place-items-center rounded-xl bg-green-600 text-white active:scale-95 transition-transform">
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder={t('commissions.searchPlaceholder')} />
      </header>

      {isLoading ? <LoadingSkeleton count={4} /> : (
        <main className="p-4 space-y-4">
          {filtered.length === 0 ? (
            <EmptyState icon="💰" title={t('commissions.emptyTitle')} subtitle={t('commissions.emptySubtitle')} />
          ) : (
            <>
              {activeRules.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <div className="card" onClick={() => openEdit(r)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                        <PercentBadgeIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 dark:text-gray-50">{r.staff?.name || '—'}</p>
                        <p className="text-xs text-gray-400">
                          {r.commission_rate}% — {appliesToLabel(r.applies_to)}
                          {r.product_id && ' • ' + t('commissions.specificProduct')}
                          {r.service_id && ' • ' + t('commissions.specificService')}
                        </p>
                      </div>
                      <CheckCircleIcon className="h-5 w-5 text-green-500 shrink-0" />
                    </div>
                  </div>
                </motion.div>
              ))}
              {inactiveRules.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-2 px-1">{t('commissions.inactive', { count: inactiveRules.length })}</p>
                  {inactiveRules.map((r) => (
                    <div key={r.id} className="card opacity-50 mb-2" onClick={() => openEdit(r)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                          <PercentBadgeIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-500">{r.staff?.name || '—'}</p>
                          <p className="text-xs text-gray-400">{r.commission_rate}% — {appliesToLabel(r.applies_to)}</p>
                        </div>
                        <XCircleIcon className="h-5 w-5 text-gray-400 shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      )}

      <BottomSheet isOpen={showForm} onClose={closeForm} title={editRule ? t('commissions.editRule') : t('commissions.addRule')} large>
        <div className="space-y-4">
          <FormSelect
            label={t('commissions.staff')}
            value={formStaffId}
            onChange={setFormStaffId}
            placeholder={t('commissions.staffPlaceholder')}
            options={(staffList || [])
              .filter(s => s.is_active || s.id === formStaffId)
              .map(s => ({ value: s.id, label: s.name }))}
            required
          />
          <FormInput
            label={t('commissions.rateLabel')}
            value={formRate}
            onChange={setFormRate}
            type="number"
            placeholder={t('commissions.ratePlaceholder')}
            dir="ltr"
            required
          />
          <FormSelect
            label={t('commissions.appliesTo')}
            value={formAppliesTo}
            onChange={(v) => { setFormAppliesTo(v); if (v !== 'product') setFormProductId(''); if (v !== 'service') setFormServiceId('') }}
            options={[
              { value: 'all', label: t('commissions.appliesAll') },
              { value: 'product', label: t('commissions.specificProduct') },
              { value: 'service', label: t('commissions.specificService') },
            ]}
          />
          {formAppliesTo === 'product' && (
            <FormInput
              label={t('commissions.productId')}
              value={formProductId}
              onChange={setFormProductId}
              placeholder={t('commissions.productIdPlaceholder')}
              dir="ltr"
            />
          )}
          {formAppliesTo === 'service' && (
            <FormInput
              label={t('commissions.serviceId')}
              value={formServiceId}
              onChange={setFormServiceId}
              placeholder={t('commissions.serviceIdPlaceholder')}
              dir="ltr"
            />
          )}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('commissions.active')}</label>
            <button
              type="button"
              onClick={() => setFormActive(!formActive)}
              className={`w-12 h-6 rounded-full transition-colors relative ${formActive ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${formActive ? 'start-0.5 translate-x-full' : 'start-0.5'}`} />
            </button>
          </div>
          <button onClick={handleSave} className="btn-primary">{editRule ? t('commissions.update') : t('commissions.add')}</button>
          {editRule && (
            <button
              onClick={() => { setDeleteTarget(editRule); closeForm() }}
              className="w-full h-10 rounded-lg font-semibold text-red-600 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <TrashIcon className="h-4 w-4" />
              {t('commissions.deleteRule')}
            </button>
          )}
        </div>
      </BottomSheet>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null) }}
        title={t('commissions.deleteTitle')}
        message={t('commissions.deleteMessage')}
        confirmLabel={t('commissions.deleteConfirm')}
        danger
      />
    </motion.div>
  )
}
