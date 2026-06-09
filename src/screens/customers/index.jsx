import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { customerRepository } from '../../repositories/customerRepository'
import SearchInput from '../../components/SearchInput'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import BottomSheet from '../../components/BottomSheet'
import FormInput from '../../components/FormInput'
import ConfirmDialog from '../../components/ConfirmDialog'
import Card from '../../components/Card'
import { formatCurrency, formatDate } from '../../utils/format'
import { useTranslation } from 'react-i18next'

export default function CustomersScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editCustomer, setEditCustomer] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: customers, isLoading, isError } = useQuery({
    queryKey: ['customers', storeId, search],
    queryFn: () => customerRepository.getAll(storeId, search),
    enabled: !!storeId,
  })

  const { data: salesHistory } = useQuery({
    queryKey: ['customerSales', storeId, selectedCustomer?.id],
    queryFn: () => customerRepository.getSalesHistory(storeId, selectedCustomer?.id),
    enabled: !!selectedCustomer,
  })

  const openForm = (customer = null) => {
    setEditCustomer(customer)
    setName(customer?.name || '')
    setPhone(customer?.phone || '')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      if (editCustomer) await customerRepository.update(storeId, editCustomer.id, { name, phone })
      else await customerRepository.create(storeId, { name, phone })
      queryClient.invalidateQueries(['customers'])
      toast.success(t('toast.settingsSaved'))
      setShowForm(false)
    } catch { toast.error(t('toast.saveFailed')) }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    try {
      await customerRepository.delete(storeId, selectedCustomer.id)
      queryClient.invalidateQueries(['customers'])
      toast.success(t('toast.deleted'))
      setSelectedCustomer(null)
    } catch {
      toast.error(t('toast.saveFailed'))
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('customers.title')}</h1>
          <button onClick={() => openForm()} className="btn-ghost text-green-600 font-semibold text-sm">+ {t('customers.add')}</button>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder={t('common.search')} />
      </header>

      <main className="p-4 space-y-2">
        {isLoading ? <LoadingSkeleton count={5} /> :
         isError ? <EmptyState icon="⚠️" title={t('common.error')} /> :
         customers?.length === 0 ? <EmptyState icon="👥" title={t('customers.empty')} actionLabel={'+ ' + t('common.add')} onAction={() => openForm()} /> :
         customers.map((c, i) => (
           <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
             <Card onClick={() => setSelectedCustomer(c)}>
               <p className="font-semibold text-gray-900 dark:text-gray-50">{c.name}</p>
               {c.phone && <p className="text-sm text-gray-500" dir="ltr">{c.phone}</p>}
             </Card>
           </motion.div>
         ))
        }
      </main>

      {/* Add/Edit form */}
      <BottomSheet isOpen={showForm} onClose={() => setShowForm(false)} title={editCustomer ? t('common.edit') : t('customers.addCustomer')}>
        <div className="space-y-4">
          <FormInput label={t('customers.name')} value={name} onChange={setName} required autoFocus />
          <FormInput label={t('customers.phone')} value={phone} onChange={setPhone} type="tel" dir="ltr" />
          <button onClick={handleSave} disabled={loading} className="btn-primary">{loading ? t('common.loading') : t('common.save')}</button>
        </div>
      </BottomSheet>

      {/* Customer detail */}
      <BottomSheet isOpen={!!selectedCustomer} onClose={() => setSelectedCustomer(null)} title={selectedCustomer?.name} large>
        {selectedCustomer && (
          <div className="space-y-4">
            {selectedCustomer.phone && <p className="text-sm text-gray-500" dir="ltr">{selectedCustomer.phone}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setSelectedCustomer(null); openForm(selectedCustomer) }} className="btn-ghost flex-1">{t('common.edit')}</button>
              <button onClick={() => setShowDelete(true)} className="btn-danger flex-1">{t('common.delete')}</button>
            </div>
            <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 pt-2">{t('customers.purchaseHistory')}</h3>
            {salesHistory?.length === 0 ? <p className="text-sm text-gray-400">{t('customers.noPurchases')}</p> :
             salesHistory?.map(sale => (
               <div key={sale.id} className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-700">
                 <span>{formatDate(sale.created_at)}</span>
                 <span className="font-semibold text-green-600">{formatCurrency(sale.total_amount)}</span>
               </div>
             ))
            }
          </div>
        )}
      </BottomSheet>

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} />
    </motion.div>
  )
}

