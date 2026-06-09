import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../stores/authStore'
import { categoryRepository } from '../../../repositories/categoryRepository'
import BottomSheet from '../../../components/BottomSheet'
import FormInput from '../../../components/FormInput'
import EmptyState from '../../../components/EmptyState'
import ConfirmDialog from '../../../components/ConfirmDialog'
import { useTranslation } from 'react-i18next'

const PRESET_COLORS = [
  '#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed',
  '#0891b2', '#c026d3', '#ea580c', '#4f46e5', '#059669',
  '#e11d48', '#0284c7', '#9333ea', '#65a30d', '#b91c1c',
]

export default function CategoryManager({ isOpen, onClose }) {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#16a34a')
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories', storeId],
    queryFn: () => categoryRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const openForm = (cat = null) => {
    setEditCat(cat)
    setName(cat?.name || '')
    setColor(cat?.color || '#16a34a')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      if (editCat) {
        await categoryRepository.update(storeId, editCat.id, { name: name.trim(), color })
      } else {
        await categoryRepository.create(storeId, { name: name.trim(), color })
      }
      queryClient.invalidateQueries(['categories'])
      queryClient.invalidateQueries(['products'])
      toast.success(editCat ? t('inventory.categoryUpdated') : t('inventory.categoryAdded'))
      setShowForm(false)
      setName('')
      setColor('#16a34a')
    } catch { toast.error(t('toast.saveFailed')) }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await categoryRepository.delete(storeId, deleteTarget.id)
      queryClient.invalidateQueries(['categories'])
      queryClient.invalidateQueries(['products'])
      toast.success(t('toast.deleted'))
      setDeleteTarget(null)
    } catch { toast.error(t('toast.saveFailed')) }
  }

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} title={t('inventory.categoryManager')} large>
        <div className="space-y-3">
          <button onClick={() => openForm()} className="btn-primary">+ {t('inventory.addCategory')}</button>

          {isLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
            </div>
          ) : !categories?.length ? (
            <EmptyState icon="🏷️" title={t('inventory.emptyCategories')} subtitle={t('inventory.emptyCategoriesHint')} />
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-full shrink-0 border-2 border-white dark:border-gray-700 shadow"
                    style={{ backgroundColor: cat.color || '#6b7280' }}
                  />
                  <span className="font-semibold text-gray-900 dark:text-gray-50">{cat.name}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openForm(cat)}
                    className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                    {t('common.edit')}
                  </button>
                  <button onClick={() => setDeleteTarget(cat)}
                    className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </BottomSheet>

      {/* Add/Edit form */}
      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title={editCat ? t('inventory.editCategory') : t('inventory.newCategory')}>
        <div className="space-y-4">
          <FormInput label={t('inventory.categoryName')} value={name} onChange={setName} required autoFocus />

          {/* Color picker */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{t('inventory.color')}</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    color === c ? 'ring-2 ring-offset-2 ring-green-500 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500">{t('inventory.customColor')}:</span>
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm font-medium">{name || t('inventory.preview')}</span>
          </div>

          <button onClick={handleSave} disabled={loading || !name.trim()} className="btn-primary">
            {loading ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        message={t('inventory.deleteCategoryConfirm', { name: deleteTarget?.name })}
      />
    </>
  )
}
