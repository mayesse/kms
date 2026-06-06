import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { serviceRepository } from '../../repositories/serviceRepository'
import SearchInput from '../../components/SearchInput'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import ConfirmDialog from '../../components/ConfirmDialog'
import BottomSheet from '../../components/BottomSheet'
import FormInput from '../../components/FormInput'
import { formatCurrency } from '../../utils/format'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

export default function ServicesScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDelete, setShowDelete] = useState(null)
  const [editService, setEditService] = useState(null)
  const [formName, setFormName] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formDuration, setFormDuration] = useState('30')

  const { data: services, isLoading } = useQuery({
    queryKey: ['services', storeId],
    queryFn: () => serviceRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => serviceRepository.create(storeId, data),
    onSuccess: () => { queryClient.invalidateQueries(['services']); toast.success(t('services.created')); closeForm() },
    onError: () => toast.error(t('services.createFailed')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => serviceRepository.update(storeId, id, data),
    onSuccess: () => { queryClient.invalidateQueries(['services']); toast.success(t('services.updated')); closeForm() },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => serviceRepository.delete(storeId, id),
    onSuccess: () => { queryClient.invalidateQueries(['services']); toast.success(t('services.deleted')); setShowDelete(null) },
  })

  const filtered = (services || []).filter(s => !search || s.name.includes(search))

  const closeForm = () => { setShowForm(false); setEditService(null); setFormName(''); setFormPrice(''); setFormDuration('30') }
  const openEdit = (s) => { setEditService(s); setFormName(s.name); setFormPrice(String(s.price)); setFormDuration(String(s.duration_minutes || 30)); setShowForm(true) }
  const handleSave = () => {
    if (!formName.trim()) { toast.error(t('services.nameRequired')); return }
    const payload = { name: formName.trim(), price: parseFloat(formPrice) || 0, duration_minutes: parseInt(formDuration) || 30 }
    if (editService) { updateMutation.mutate({ id: editService.id, data: payload }) }
    else { createMutation.mutate(payload) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('services.title')}</h1>
          <button onClick={() => setShowForm(true)} className="h-10 w-10 grid place-items-center rounded-xl bg-green-600 text-white active:scale-95 transition-transform">
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder={t('services.searchPlaceholder')} />
      </header>

      {isLoading ? <LoadingSkeleton count={4} /> : (
        <main className="p-4 space-y-2">
          {filtered.length === 0 ? (
            <EmptyState icon="🔧" title={t('services.emptyTitle')} subtitle={t('services.emptySubtitle')} />
          ) : (
            filtered.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <div className="card" onClick={() => openEdit(s)}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-gray-50">{s.name}</p>
                      <p className="text-xs text-gray-400">{t('services.durationMinutes', { minutes: s.duration_minutes })}</p>
                    </div>
                    <div className="text-end shrink-0 ms-3">
                      <p className="font-bold text-green-600">{formatCurrency(s.price)}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setShowDelete(s.id) }} className="p-2 text-gray-400 hover:text-red-500 me-2">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </main>
      )}

      <BottomSheet isOpen={showForm} onClose={closeForm} title={editService ? t('services.editService') : t('services.addService')}>
        <div className="space-y-4">
          <FormInput label={t('services.serviceName')} value={formName} onChange={setFormName} />
          <FormInput label={t('services.price')} value={formPrice} onChange={setFormPrice} type="number" dir="ltr" />
          <FormInput label={t('services.durationLabel')} value={formDuration} onChange={setFormDuration} type="number" dir="ltr" />
          <button onClick={handleSave} className="btn-primary">{editService ? t('services.update') : t('services.add')}</button>
        </div>
      </BottomSheet>

      <ConfirmDialog isOpen={!!showDelete} onClose={() => setShowDelete(null)} onConfirm={() => deleteMutation.mutate(showDelete)} title={t('services.deleteTitle')} message={t('services.deleteMessage')} />
    </motion.div>
  )
}
