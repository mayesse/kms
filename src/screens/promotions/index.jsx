import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { promotionRepository } from '../../repositories/promotionRepository'
import { categoryRepository } from '../../repositories/categoryRepository'
import { productRepository } from '../../repositories/productRepository'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import ConfirmDialog from '../../components/ConfirmDialog'
import BottomSheet from '../../components/BottomSheet'
import FormInput from '../../components/FormInput'
import FormSelect from '../../components/FormSelect'
import Card from '../../components/Card'
import Badge from '../../components/Badge'
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline'

const PROMO_TYPES = [
  { value: 'percent_off', labelKey: 'promotions.typePercentProduct' },
  { value: 'percent_off_category', labelKey: 'promotions.typePercentCategory' },
  { value: 'bogo', labelKey: 'promotions.typeBogo' },
]

export default function PromotionsScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [showDelete, setShowDelete] = useState(null)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState('percent_off_category')
  const [formValue, setFormValue] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('')
  const [formProductId, setFormProductId] = useState('')
  const [formMinCart, setFormMinCart] = useState('0')
  const [formActive, setFormActive] = useState(true)

  const { data: promotions, isLoading } = useQuery({
    queryKey: ['promotions', storeId],
    queryFn: () => promotionRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const { data: categories } = useQuery({
    queryKey: ['categories', storeId],
    queryFn: () => categoryRepository.getAll(storeId),
    enabled: !!storeId && showForm,
  })

  const { data: products } = useQuery({
    queryKey: ['products', storeId],
    queryFn: () => productRepository.getAll(storeId),
    enabled: !!storeId && showForm,
  })

  const createMutation = useMutation({
    mutationFn: (data) => promotionRepository.create(storeId, data),
    onSuccess: () => { queryClient.invalidateQueries(['promotions']); toast.success(t('promotions.saved')); closeForm() },
    onError: () => toast.error(t('promotions.saveFailed')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => promotionRepository.update(storeId, id, data),
    onSuccess: () => { queryClient.invalidateQueries(['promotions']); toast.success(t('promotions.saved')); closeForm() },
    onError: () => toast.error(t('promotions.saveFailed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => promotionRepository.delete(storeId, id),
    onSuccess: () => { queryClient.invalidateQueries(['promotions']); toast.success(t('promotions.deleted')); setShowDelete(null) },
    onError: () => toast.error(t('promotions.deleteFailed')),
  })

  const closeForm = () => {
    setShowForm(false); setEditItem(null)
    setFormName(''); setFormType('percent_off_category'); setFormValue('')
    setFormCategoryId(''); setFormProductId(''); setFormMinCart('0'); setFormActive(true)
  }

  const openEdit = (p) => {
    setEditItem(p)
    setFormName(p.name)
    setFormType(p.promo_type)
    setFormValue(String(p.discount_value))
    setFormCategoryId(p.target_category_id || '')
    setFormProductId(p.target_product_id || '')
    setFormMinCart(String(p.min_cart_total || 0))
    setFormActive(p.is_active)
    setShowForm(true)
  }

  const typeLabel = (type) => {
    const found = PROMO_TYPES.find(pt => pt.value === type)
    return found ? t(found.labelKey) : type
  }

  const handleSave = () => {
    if (!formName.trim()) { toast.error(t('promotions.nameRequired')); return }
    if (!formValue) { toast.error(t('promotions.valueRequired')); return }
    const payload = {
      name: formName.trim(),
      promo_type: formType,
      discount_value: parseFloat(formValue),
      target_category_id: formType === 'percent_off_category' ? (formCategoryId || null) : null,
      target_product_id: formType !== 'percent_off_category' ? (formProductId || null) : null,
      min_cart_total: parseFloat(formMinCart || 0),
      is_active: formActive,
      bogo_buy_qty: 2,
      bogo_get_qty: 1,
    }
    if (editItem) updateMutation.mutate({ id: editItem.id, data: payload })
    else createMutation.mutate(payload)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('nav.promotions')}</h1>
          <button onClick={() => setShowForm(true)} className="h-10 w-10 grid place-items-center rounded-xl bg-green-600 text-white active:scale-95 transition-transform">
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      {isLoading ? <LoadingSkeleton count={4} /> : (
        <main className="p-4 space-y-2">
          {(promotions || []).length === 0 ? (
            <EmptyState icon="🏷️" title={t('promotions.empty')} subtitle={t('promotions.emptyHint')} />
          ) : (
            promotions.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card onClick={() => openEdit(p)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-gray-50">{p.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{typeLabel(p.promo_type)} — {p.discount_value}%</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={p.is_active ? 'success' : 'neutral'}>{p.is_active ? t('promotions.active') : t('promotions.inactive')}</Badge>
                      <button onClick={(e) => { e.stopPropagation(); setShowDelete(p.id) }} className="p-2 text-gray-400 hover:text-red-500">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                      <PencilIcon className="h-4 w-4 text-gray-300" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </main>
      )}

      <BottomSheet isOpen={showForm} onClose={closeForm} title={editItem ? t('promotions.edit') : t('promotions.add')}>
        <div className="space-y-4">
          <FormInput label={t('promotions.name')} value={formName} onChange={setFormName} required />
          <FormSelect label={t('promotions.type')} value={formType} onChange={setFormType}
            options={PROMO_TYPES.map(pt => ({ value: pt.value, label: t(pt.labelKey) }))} />
          <FormInput label={t('promotions.discountPercent')} value={formValue} onChange={setFormValue} type="number" dir="ltr" />
          {formType === 'percent_off_category' && (
            <FormSelect label={t('inventory.category')} value={formCategoryId} onChange={setFormCategoryId}
              options={(categories || []).map(c => ({ value: c.id, label: c.name }))} placeholder="—" />
          )}
          {formType !== 'percent_off_category' && (
            <FormSelect label={t('promotions.product')} value={formProductId} onChange={setFormProductId}
              options={(products || []).map(p => ({ value: p.id, label: p.name }))} placeholder="—" />
          )}
          <FormInput label={t('promotions.minCart')} value={formMinCart} onChange={setFormMinCart} type="number" dir="ltr" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('promotions.active')}</span>
            <button type="button" onClick={() => setFormActive(!formActive)}
              className={`relative w-11 h-6 rounded-full transition-colors ${formActive ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <span className={`absolute top-0.5 start-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${formActive ? 'translate-x-full' : ''}`} />
            </button>
          </div>
          <button onClick={handleSave} className="btn-primary">{t('common.save')}</button>
        </div>
      </BottomSheet>

      <ConfirmDialog isOpen={!!showDelete} onClose={() => setShowDelete(null)} onConfirm={() => deleteMutation.mutate(showDelete)}
        title={t('promotions.deleteTitle')} message={t('promotions.deleteConfirm')} />
    </motion.div>
  )
}
