import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { usePosStore } from '../../stores/posStore'
import { repairJobRepository } from '../../repositories/repairJobRepository'
import { productRepository } from '../../repositories/productRepository'
import { serviceRepository } from '../../repositories/serviceRepository'
import { staffRepository } from '../../repositories/staffRepository'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import BottomSheet from '../../components/BottomSheet'
import FormInput from '../../components/FormInput'
import FormSelect from '../../components/FormSelect'
import SearchInput from '../../components/SearchInput'
import { formatCurrency } from '../../utils/format'
import { useTranslation } from 'react-i18next'
import {
  PlusIcon, ShoppingCartIcon, TrashIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline'

const STATUS_CLASS = {
  received: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  ready: 'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const STATUS_ACTIONS = {
  received: [{ key: 'in_progress', tone: 'bg-blue-500' }],
  in_progress: [{ key: 'ready', tone: 'bg-amber-500' }],
  ready: [],
}

export default function WorkOrdersScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { clearCart, addToCart, addServiceToCart, setCheckoutDefaults } = usePosStore()

  const [filter, setFilter] = useState('active')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [productSearch, setProductSearch] = useState('')
  const [showAddItems, setShowAddItems] = useState(false)

  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formDeviceType, setFormDeviceType] = useState('')
  const [formDeviceModel, setFormDeviceModel] = useState('')
  const [formIssue, setFormIssue] = useState('')
  const [formStaffId, setFormStaffId] = useState('')
  const [formNotes, setFormNotes] = useState('')

  const statusFilter = filter === 'active'
    ? undefined
    : filter === 'all' ? 'all' : filter

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['repair_jobs', storeId, filter],
    queryFn: () => repairJobRepository.getAll(storeId, statusFilter),
    enabled: !!storeId,
  })

  const { data: staff } = useQuery({
    queryKey: ['staff', storeId],
    queryFn: () => staffRepository.getAll(storeId),
    enabled: !!storeId,
  })

  const { data: products } = useQuery({
    queryKey: ['products', storeId, productSearch],
    queryFn: () => productRepository.getAll(storeId, { search: productSearch }),
    enabled: !!storeId && showAddItems && !!productSearch.trim(),
  })

  const { data: services } = useQuery({
    queryKey: ['services', storeId],
    queryFn: () => serviceRepository.getAll(storeId),
    enabled: !!storeId && showAddItems,
  })

  const filteredJobs = (jobs || []).filter(j => {
    if (filter !== 'active') return true
    return !['completed', 'cancelled'].includes(j.status)
  })

  const createMutation = useMutation({
    mutationFn: (data) => repairJobRepository.create(storeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['repair_jobs', storeId])
      toast.success(t('workOrders.created'))
      closeCreate()
    },
    onError: () => toast.error(t('toast.saveFailed')),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => repairJobRepository.updateStatus(storeId, id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['repair_jobs', storeId])
      toast.success(t('workOrders.statusUpdated'))
    },
  })

  const addItemMutation = useMutation({
    mutationFn: ({ jobId, item }) => repairJobRepository.addItem(storeId, jobId, item),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['repair_jobs', storeId])
      setSelectedJob(prev => prev ? {
        ...prev,
        repair_job_items: [...(prev.repair_job_items || []), data],
      } : prev)
      toast.success(t('workOrders.itemAdded'))
    },
  })

  const removeItemMutation = useMutation({
    mutationFn: (itemId) => repairJobRepository.removeItem(storeId, itemId),
    onSuccess: (_, itemId) => {
      queryClient.invalidateQueries(['repair_jobs', storeId])
      setSelectedJob(prev => prev ? {
        ...prev,
        repair_job_items: (prev.repair_job_items || []).filter(i => i.id !== itemId),
      } : prev)
    },
  })

  const closeCreate = () => {
    setShowCreate(false)
    setFormName('')
    setFormPhone('')
    setFormDeviceType('')
    setFormDeviceModel('')
    setFormIssue('')
    setFormStaffId('')
    setFormNotes('')
  }

  const handleCreate = () => {
    if (!formName.trim()) {
      toast.error(t('workOrders.customerRequired'))
      return
    }
    createMutation.mutate({
      customer_name: formName.trim(),
      customer_phone: formPhone.trim() || null,
      device_type: formDeviceType.trim() || null,
      device_model: formDeviceModel.trim() || null,
      issue_description: formIssue.trim() || null,
      staff_id: formStaffId || null,
      notes: formNotes.trim() || null,
    })
  }

  const jobTotal = (job) => (job.repair_job_items || []).reduce(
    (sum, i) => sum + parseFloat(i.quantity) * parseFloat(i.unit_price), 0
  )

  const convertToSale = async (job) => {
    const items = job.repair_job_items || []
    if (!items.length) {
      toast.error(t('workOrders.noItems'))
      return
    }

    clearCart()

    for (const item of items) {
      if (item.item_type === 'service' && item.service_id) {
        const svc = (services || []).find(s => s.id === item.service_id)
        if (svc) addServiceToCart(svc)
        continue
      }
      if (item.item_type === 'part' && item.product_id) {
        try {
          const product = await productRepository.getById(storeId, item.product_id)
          if (product) {
            addToCart(product)
            const cartId = `${product.id}_${product.base_unit || 'قطعة'}`
            if (parseFloat(item.quantity) !== 1) {
              usePosStore.getState().updateQty(cartId, parseFloat(item.quantity))
            }
          }
        } catch { /* skip missing product */ }
      }
    }

    setCheckoutDefaults({
      workOrderId: job.id,
      staffId: job.staff_id || null,
      customerName: job.customer_name || '',
      customerPhone: job.customer_phone || '',
    })
    toast.success(t('workOrders.convertedToSale'))
    navigate('/', { state: { openCheckout: true } })
  }

  const openJob = (job) => {
    setSelectedJob(job)
    setShowAddItems(false)
    setProductSearch('')
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('nav.workOrders')}</h1>
          <button type="button" onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold active:scale-95">
            <PlusIcon className="h-5 w-5" />
            {t('workOrders.newJob')}
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {['active', 'received', 'in_progress', 'ready', 'completed', 'all'].map(key => (
            <button key={key} type="button" onClick={() => setFilter(key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === key ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>
              {t(`workOrders.filters.${key}`)}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? <LoadingSkeleton count={5} /> : (
        <main className="p-4 space-y-3 pb-24">
          {filteredJobs.length === 0 ? (
            <EmptyState icon="🔧" title={t('workOrders.empty')} />
          ) : filteredJobs.map(job => (
            <button key={job.id} type="button" onClick={() => openJob(job)}
              className="card w-full text-start active:scale-[0.99] transition-transform">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 dark:text-gray-50">{job.job_number}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_CLASS[job.status] || 'bg-gray-100 text-gray-600'}`}>
                      {t(`workOrders.status.${job.status}`)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{job.customer_name}</p>
                  {(job.device_type || job.device_model) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[job.device_type, job.device_model].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {job.issue_description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{job.issue_description}</p>
                  )}
                </div>
                <div className="text-end shrink-0">
                  <p className="text-sm font-bold text-green-600">{formatCurrency(jobTotal(job))}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {(job.repair_job_items || []).length} {t('workOrders.items')}
                  </p>
                  <ChevronRightIcon className="h-5 w-5 text-gray-300 ms-auto mt-1" />
                </div>
              </div>
            </button>
          ))}
        </main>
      )}

      <BottomSheet isOpen={showCreate} onClose={closeCreate} title={t('workOrders.newJob')} large>
        <div className="space-y-3">
          <FormInput label={t('workOrders.customerName')} value={formName} onChange={setFormName} required />
          <FormInput label={t('workOrders.phone')} value={formPhone} onChange={setFormPhone} />
          <FormInput label={t('workOrders.deviceType')} value={formDeviceType} onChange={setFormDeviceType} placeholder={t('workOrders.deviceTypeHint')} />
          <FormInput label={t('workOrders.deviceModel')} value={formDeviceModel} onChange={setFormDeviceModel} />
          <FormInput label={t('workOrders.issue')} value={formIssue} onChange={setFormIssue} />
          <FormSelect label={t('workOrders.technician')} value={formStaffId} onChange={setFormStaffId}
            options={[{ value: '', label: t('workOrders.noTechnician') }, ...(staff || []).map(s => ({ value: s.id, label: s.name }))]} />
          <FormInput label={t('workOrders.notes')} value={formNotes} onChange={setFormNotes} />
          <button type="button" onClick={handleCreate} disabled={createMutation.isPending}
            className="w-full h-12 rounded-2xl bg-green-600 text-white font-bold active:scale-95 disabled:opacity-50">
            {t('common.save')}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet isOpen={!!selectedJob} onClose={() => { setSelectedJob(null); setShowAddItems(false) }}
        title={selectedJob?.job_number || ''} large>
        {selectedJob && (
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 space-y-1">
              <p className="font-semibold text-gray-900 dark:text-gray-50">{selectedJob.customer_name}</p>
              {selectedJob.customer_phone && <p className="text-sm text-gray-500">{selectedJob.customer_phone}</p>}
              {(selectedJob.device_type || selectedJob.device_model) && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {[selectedJob.device_type, selectedJob.device_model].filter(Boolean).join(' · ')}
                </p>
              )}
              {selectedJob.issue_description && (
                <p className="text-sm text-gray-500 mt-2">{selectedJob.issue_description}</p>
              )}
            </div>

            {(STATUS_ACTIONS[selectedJob.status] || []).length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {STATUS_ACTIONS[selectedJob.status].map(a => (
                  <button key={a.key} type="button"
                    onClick={() => statusMutation.mutate({ id: selectedJob.id, status: a.key })}
                    className={`px-4 py-2 rounded-xl text-white text-sm font-semibold ${a.tone}`}>
                    {t(`workOrders.advanceTo.${a.key}`)}
                  </button>
                ))}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('workOrders.lineItems')}</h3>
                {selectedJob.status !== 'completed' && selectedJob.status !== 'cancelled' && (
                  <button type="button" onClick={() => setShowAddItems(!showAddItems)}
                    className="text-xs font-semibold text-green-600">
                    {showAddItems ? t('common.cancel') : t('workOrders.addItem')}
                  </button>
                )}
              </div>

              {(selectedJob.repair_job_items || []).length === 0 ? (
                <p className="text-sm text-gray-400">{t('workOrders.noItemsYet')}</p>
              ) : (
                <div className="space-y-2">
                  {(selectedJob.repair_job_items || []).map(item => (
                    <div key={item.id} className="flex items-center gap-2 py-2 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">
                          {item.item_type === 'service' ? t('workOrders.service') : t('workOrders.part')}
                          {' · '}{item.quantity} × {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-green-600 shrink-0">
                        {formatCurrency(parseFloat(item.quantity) * parseFloat(item.unit_price))}
                      </span>
                      {selectedJob.status !== 'completed' && (
                        <button type="button" onClick={() => removeItemMutation.mutate(item.id)}
                          className="p-1.5 text-red-400 hover:text-red-600">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-end text-lg font-bold text-green-600 mt-3">
                {formatCurrency(jobTotal(selectedJob))}
              </p>
            </div>

            {showAddItems && selectedJob.status !== 'completed' && (
              <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                <SearchInput value={productSearch} onChange={setProductSearch} placeholder={t('workOrders.searchPart')} />
                {(products || []).slice(0, 5).map(p => (
                  <button key={p.id} type="button"
                    onClick={() => addItemMutation.mutate({
                      jobId: selectedJob.id,
                      item: { item_type: 'part', product_id: p.id, name: p.name, quantity: 1, unit_price: p.selling_price },
                    })}
                    className="w-full flex items-center justify-between py-2 text-start text-sm">
                    <span>{p.name}</span>
                    <span className="text-green-600 font-semibold">{formatCurrency(p.selling_price)}</span>
                  </button>
                ))}
                <p className="text-xs font-semibold text-gray-500 pt-2">{t('workOrders.services')}</p>
                {(services || []).map(s => (
                  <button key={s.id} type="button"
                    onClick={() => addItemMutation.mutate({
                      jobId: selectedJob.id,
                      item: { item_type: 'service', service_id: s.id, name: s.name, quantity: 1, unit_price: s.price },
                    })}
                    className="w-full flex items-center justify-between py-2 text-start text-sm">
                    <span>{s.name}</span>
                    <span className="text-green-600 font-semibold">{formatCurrency(s.price)}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedJob.status === 'ready' && !selectedJob.sale_id && (
              <button type="button" onClick={() => convertToSale(selectedJob)}
                className="w-full h-12 rounded-2xl bg-green-600 text-white font-bold flex items-center justify-center gap-2 active:scale-95">
                <ShoppingCartIcon className="h-5 w-5" />
                {t('workOrders.invoiceSale')}
              </button>
            )}
          </div>
        )}
      </BottomSheet>
    </motion.div>
  )
}
