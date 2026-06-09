import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { modifierRepository } from '../../repositories/modifierRepository'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import BottomSheet from '../../components/BottomSheet'
import FormInput from '../../components/FormInput'
import { useTranslation } from 'react-i18next'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { formatCurrency } from '../../utils/format'

export default function ModifiersScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [activeGroup, setActiveGroup] = useState(null)
  const [itemName, setItemName] = useState('')
  const [itemPrice, setItemPrice] = useState('')

  const { data: groups, isLoading } = useQuery({
    queryKey: ['modifier_groups', storeId],
    queryFn: () => modifierRepository.getGroupsWithItems(storeId),
    enabled: !!storeId,
  })

  const createGroupMutation = useMutation({
    mutationFn: () => modifierRepository.createGroup(storeId, { name: groupName.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries(['modifier_groups', storeId])
      setShowGroupForm(false)
      setGroupName('')
      toast.success(t('modifiers.groupCreated'))
    },
    onError: () => toast.error(t('toast.saveFailed')),
  })

  const addItemMutation = useMutation({
    mutationFn: () => modifierRepository.addItem(storeId, activeGroup.id, {
      name: itemName.trim(),
      price: parseFloat(itemPrice || 0),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['modifier_groups', storeId])
      setItemName('')
      setItemPrice('')
      toast.success(t('modifiers.itemAdded'))
    },
    onError: () => toast.error(t('toast.saveFailed')),
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('nav.modifiers')}</h1>
        <button type="button" onClick={() => setShowGroupForm(true)}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold">
          <PlusIcon className="h-5 w-5" />
          {t('modifiers.newGroup')}
        </button>
      </header>

      {isLoading ? <LoadingSkeleton count={4} /> : (
        <main className="p-4 space-y-4">
          {!groups?.length ? (
            <EmptyState icon="🍕" title={t('modifiers.empty')} />
          ) : groups.map(group => (
            <div key={group.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-900 dark:text-gray-50">{group.name}</h2>
                <button type="button" onClick={() => setActiveGroup(group)}
                  className="text-xs font-semibold text-green-600">
                  + {t('modifiers.addOption')}
                </button>
              </div>
              <div className="space-y-2">
                {(group.modifier_items || []).map(item => (
                  <div key={item.id} className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-700">
                    <span>{item.name}</span>
                    <span className="text-green-600 font-semibold">{formatCurrency(item.price)}</span>
                  </div>
                ))}
                {!group.modifier_items?.length && (
                  <p className="text-xs text-gray-400">{t('modifiers.noOptions')}</p>
                )}
              </div>
            </div>
          ))}
        </main>
      )}

      <BottomSheet isOpen={showGroupForm} onClose={() => setShowGroupForm(false)} title={t('modifiers.newGroup')}>
        <div className="space-y-3">
          <FormInput label={t('modifiers.groupName')} value={groupName} onChange={setGroupName} />
          <button type="button" onClick={() => createGroupMutation.mutate()} disabled={!groupName.trim()}
            className="w-full h-11 rounded-xl bg-green-600 text-white font-bold disabled:opacity-50">
            {t('common.save')}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={!!activeGroup} onClose={() => setActiveGroup(null)} title={activeGroup?.name}>
        <div className="space-y-3">
          <FormInput label={t('modifiers.optionName')} value={itemName} onChange={setItemName} />
          <FormInput label={t('modifiers.optionPrice')} value={itemPrice} onChange={setItemPrice} type="number" />
          <button type="button" onClick={() => addItemMutation.mutate()} disabled={!itemName.trim()}
            className="w-full h-11 rounded-xl bg-green-600 text-white font-bold disabled:opacity-50">
            {t('common.save')}
          </button>
        </div>
      </BottomSheet>
    </motion.div>
  )
}
