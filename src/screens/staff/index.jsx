import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { staffRepository } from '../../repositories/staffRepository'
import SearchInput from '../../components/SearchInput'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import BottomSheet from '../../components/BottomSheet'
import FormInput from '../../components/FormInput'
import { PlusIcon, UserIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'

export default function StaffScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editStaff, setEditStaff] = useState(null)
  const [formName, setFormName] = useState('')
  const [formPin, setFormPin] = useState('')
  const [formRole, setFormRole] = useState('cashier')

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff', storeId],
    queryFn: () => staffRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const createMutation = useMutation({
    mutationFn: (data) => staffRepository.create(storeId, data),
    onSuccess: () => { queryClient.invalidateQueries(['staff']); toast.success(t('staff.staffCreated')); closeForm() },
    onError: () => toast.error(t('staff.staffCreateFailed')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => staffRepository.update(storeId, id, data),
    onSuccess: () => { queryClient.invalidateQueries(['staff']); toast.success(t('staff.staffUpdated')); closeForm() },
    onError: () => toast.error(t('staff.staffUpdateFailed')),
  })


  const filtered = (staff || []).filter(s =>
    !search || s.name.includes(search) || (s.phone || '').includes(search)
  )

  const activeStaff = filtered.filter(s => s.is_active)
  const inactiveStaff = filtered.filter(s => !s.is_active)

  const closeForm = () => {
    setShowForm(false)
    setEditStaff(null)
    setFormName('')
    setFormPin('')
    setFormRole('cashier')
  }

  const openEdit = (s) => {
    setEditStaff(s)
    setFormName(s.name)
    setFormPin(s.pin || '')
    setFormRole(s.role || 'cashier')
    setShowForm(true)
  }

  const handleSave = () => {
    if (!formName.trim()) { toast.error(t('staff.nameRequired')); return }
    if (!formPin.trim() || formPin.length < 4) { toast.error(t('staff.pinRequired')); return }
    const payload = { name: formName.trim(), pin: formPin.trim(), role: formRole }
    if (editStaff) { updateMutation.mutate({ id: editStaff.id, data: payload }) }
    else { createMutation.mutate(payload) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('staff.title')}</h1>
          <button onClick={() => setShowForm(true)}
            className="h-10 w-10 grid place-items-center rounded-xl bg-green-600 text-white active:scale-95 transition-transform">
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder={t('staff.searchPlaceholder')} />
      </header>

      {isLoading ? <LoadingSkeleton count={4} /> : (
        <main className="p-4 space-y-4">
          {filtered.length === 0 ? (
            <EmptyState icon="👤" title={t('staff.emptyTitle')} subtitle={t('staff.emptySubtitle')} />
          ) : (
            <>
              {activeStaff.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <div className="card" onClick={() => openEdit(s)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <UserIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 dark:text-gray-50">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.role === 'admin' ? t('staff.roleAdmin') : t('staff.roleCashier')}</p>
                      </div>
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                </motion.div>
              ))}
              {inactiveStaff.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 mb-2 px-1">{t('staff.inactive', { count: inactiveStaff.length })}</p>
                  {inactiveStaff.map((s) => (
                    <div key={s.id} className="card opacity-50 mb-2" onClick={() => openEdit(s)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-500">{s.name}</p>
                        </div>
                        <XCircleIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      )}

      <BottomSheet isOpen={showForm} onClose={closeForm} title={editStaff ? t('staff.editStaff') : t('staff.addStaff')}>
        <div className="space-y-4">
          <FormInput label={t('staff.name')} value={formName} onChange={setFormName} placeholder={t('staff.namePlaceholder')} />
          <FormInput label={t('staff.pinLabel')} value={formPin} onChange={setFormPin} type="password" placeholder="1234" dir="ltr" maxLength={6} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('staff.role')}</label>
            <select value={formRole} onChange={e => setFormRole(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-50">
              <option value="cashier">{t('staff.roleCashier')}</option>
              <option value="admin">{t('staff.roleAdmin')}</option>
            </select>
          </div>
          <button onClick={handleSave} className="btn-primary">{editStaff ? t('staff.update') : t('staff.add')}</button>
        </div>
      </BottomSheet>
    </motion.div>
  )
}
