import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { branchRepository } from '../../repositories/branchRepository'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import ConfirmDialog from '../../components/ConfirmDialog'
import BottomSheet from '../../components/BottomSheet'
import FormInput from '../../components/FormInput'
import Card from '../../components/Card'
import Badge from '../../components/Badge'
import { formatCurrency } from '../../utils/format'
import { PlusIcon, TrashIcon, PencilIcon, CubeIcon } from '@heroicons/react/24/outline'

export default function BranchesScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [showDelete, setShowDelete] = useState(null)
  const [inventoryBranch, setInventoryBranch] = useState(null)
  const [formName, setFormName] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formActive, setFormActive] = useState(true)

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches', storeId],
    queryFn: () => branchRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const { data: branchInventory, isLoading: loadingInventory } = useQuery({
    queryKey: ['branch_inventory', storeId, inventoryBranch?.id],
    queryFn: () => branchRepository.getBranchInventory(storeId, inventoryBranch.id),
    enabled: !!storeId && !!inventoryBranch?.id,
  })

  const createMutation = useMutation({
    mutationFn: (data) => branchRepository.create(storeId, data),
    onSuccess: () => { queryClient.invalidateQueries(['branches']); toast.success(t('branches.created')); closeForm() },
    onError: () => toast.error(t('branches.createFailed')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => branchRepository.update(storeId, id, data),
    onSuccess: () => { queryClient.invalidateQueries(['branches']); toast.success(t('branches.updated')); closeForm() },
    onError: () => toast.error(t('branches.updateFailed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => branchRepository.delete(storeId, id),
    onSuccess: () => { queryClient.invalidateQueries(['branches']); toast.success(t('branches.deleted')); setShowDelete(null) },
    onError: () => toast.error(t('branches.deleteFailed')),
  })

  const closeForm = () => {
    setShowForm(false); setEditItem(null); setFormName(''); setFormAddress(''); setFormPhone(''); setFormActive(true)
  }

  const openEdit = (b) => {
    setEditItem(b); setFormName(b.name); setFormAddress(b.address || ''); setFormPhone(b.phone || ''); setFormActive(b.is_active); setShowForm(true)
  }

  const handleSave = () => {
    if (!formName.trim()) { toast.error(t('branches.nameRequired')); return }
    const data = { name: formName.trim(), address: formAddress.trim(), phone: formPhone.trim(), is_active: formActive }
    if (editItem) updateMutation.mutate({ id: editItem.id, data })
    else createMutation.mutate(data)
  }

  const inventoryTotal = (branchInventory || []).reduce((s, row) => {
    const price = parseFloat(row.products?.selling_price || 0)
    return s + parseFloat(row.quantity || 0) * price
  }, 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('nav.branches')}</h1>
          <button onClick={() => setShowForm(true)} className="h-10 w-10 grid place-items-center rounded-xl bg-green-600 text-white active:scale-95 transition-transform">
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      {isLoading ? <LoadingSkeleton count={4} /> : (
        <main className="p-4 space-y-2">
          {(branches || []).length === 0 ? (
            <EmptyState icon="🏢" title={t('branches.empty')} subtitle={t('branches.emptyHint')} />
          ) : (
            branches.map((b, i) => (
              <motion.div key={b.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0" onClick={() => openEdit(b)} role="button" tabIndex={0}>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 dark:text-gray-50">{b.name}</p>
                        <Badge variant={b.is_active ? 'success' : 'neutral'}>{b.is_active ? t('branches.active') : t('branches.inactive')}</Badge>
                      </div>
                      {b.address && <p className="text-xs text-gray-400 mt-0.5">{b.address}</p>}
                      {b.phone && <p className="text-xs text-gray-400 mt-0.5">{b.phone}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setInventoryBranch(b)} className="p-2 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg" title={t('branches.inventory')}>
                        <CubeIcon className="h-5 w-5" />
                      </button>
                      <button onClick={() => setShowDelete(b.id)} className="p-2 text-gray-400 hover:text-red-500">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => openEdit(b)} className="p-2 text-gray-300">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </main>
      )}

      <BottomSheet isOpen={showForm} onClose={closeForm} title={editItem ? t('branches.edit') : t('branches.add')}>
        <div className="space-y-4">
          <FormInput label={t('branches.name')} value={formName} onChange={setFormName} required />
          <FormInput label={t('branches.address')} value={formAddress} onChange={setFormAddress} />
          <FormInput label={t('branches.phone')} value={formPhone} onChange={setFormPhone} dir="ltr" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('branches.active')}</span>
            <button
              type="button"
              onClick={() => setFormActive(!formActive)}
              className={`relative w-11 h-6 rounded-full transition-colors ${formActive ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 start-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${formActive ? 'translate-x-full' : ''}`} />
            </button>
          </div>
          <button onClick={handleSave} className="btn-primary">{editItem ? t('common.update') : t('common.add')}</button>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={!!inventoryBranch} onClose={() => setInventoryBranch(null)} title={`${t('branches.inventory')} — ${inventoryBranch?.name || ''}`} large>
        {loadingInventory ? (
          <LoadingSkeleton count={3} />
        ) : (branchInventory || []).length === 0 ? (
          <EmptyState icon="📦" title={t('branches.noInventory')} subtitle={t('branches.noInventoryHint')} />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">{t('branches.inventoryValue')}: <span className="font-bold text-green-600">{formatCurrency(inventoryTotal)}</span></p>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {branchInventory.map(row => (
                <div key={row.id} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-900 dark:text-gray-50">{row.products?.name || '—'}</span>
                  <span className={`text-sm font-bold ${parseFloat(row.quantity) < 0 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`} dir="ltr">
                    {parseFloat(row.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </BottomSheet>

      <ConfirmDialog isOpen={!!showDelete} onClose={() => setShowDelete(null)} onConfirm={() => deleteMutation.mutate(showDelete)} title={t('branches.deleteTitle')} message={t('branches.deleteConfirm')} />
    </motion.div>
  )
}
