import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { saleRepository } from '../../repositories/saleRepository'
import { customerRepository } from '../../repositories/customerRepository'
import SearchInput from '../../components/SearchInput'
import EmptyState from '../../components/EmptyState'
import LoadingSkeleton from '../../components/LoadingSkeleton'
import ConfirmDialog from '../../components/ConfirmDialog'
import BottomSheet from '../../components/BottomSheet'
import FormInput from '../../components/FormInput'
import CustomerDebtCard from './components/CustomerDebtCard'
import DebtReceiptSheet from './components/DebtReceiptSheet'
import { formatCurrency } from '../../utils/format'
import { useTranslation } from 'react-i18next'

export default function DebtsScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [confirmSale, setConfirmSale] = useState(null) // single sale to mark paid
  const [confirmCustomer, setConfirmCustomer] = useState(null) // customer to mark all paid
  const [selectedCustomer, setSelectedCustomer] = useState(null) // for receipt sheet
  const [loading, setLoading] = useState(false)
  const [showAddClient, setShowAddClient] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const { data: debtGroups, isLoading } = useQuery({
    queryKey: ['debtsByCustomer', storeId],
    queryFn: () => saleRepository.getDebtsByCustomer(storeId),
    enabled: !!storeId,
  })

  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers', storeId, search],
    queryFn: () => customerRepository.getAll(storeId, search),
    enabled: !!storeId,
  })

  const groups = debtGroups || []

  const groupByCustomerId = new Map()
  const unlinkedGroups = []
  for (const g of groups) {
    if (g.customer_id) groupByCustomerId.set(g.customer_id, g)
    else unlinkedGroups.push(g)
  }

  // Build list: all customers (even if 0 debt) + any unlinked debt groups
  const customerRows = (customers || []).map((c) => {
    const g = groupByCustomerId.get(c.id)
    return (
      g || {
        customer_id: c.id,
        customer_name: c.name,
        customer_phone: c.phone,
        total: 0,
        sales: [],
      }
    )
  })

  const filteredUnlinked = unlinkedGroups.filter((g) => {
    if (!search) return true
    return (g.customer_name || '').includes(search)
  })

  const filtered = [...customerRows, ...filteredUnlinked].sort((a, b) => (b.total || 0) - (a.total || 0))

  const totalOutstanding = filtered.reduce((s, g) => s + g.total, 0)
  const totalCustomers = filtered.length

  // Mark a single sale as paid
  const handleMarkSalePaid = async (sale) => {
    setLoading(true)
    try {
      await saleRepository.markCreditPaid(storeId, sale.id)
      queryClient.invalidateQueries(['debtsByCustomer'])
      queryClient.invalidateQueries(['creditSales'])
      queryClient.invalidateQueries(['collectedCreditSales'])
      queryClient.invalidateQueries(['summary'])
      queryClient.invalidateQueries(['salesHistory'])
      toast.success(t('debts.paidSuccess'))
    } catch {
      toast.error(t('toast.saveFailed'))
    } finally {
      setLoading(false)
      setConfirmSale(null)
    }
  }

  // Mark all sales for a customer as paid
  const handleMarkAllPaid = async (group) => {
    setLoading(true)
    try {
      await saleRepository.markAllCreditPaidForCustomer(
        storeId, group.customer_name, group.customer_id
      )
      queryClient.invalidateQueries(['debtsByCustomer'])
      queryClient.invalidateQueries(['creditSales'])
      queryClient.invalidateQueries(['collectedCreditSales'])
      queryClient.invalidateQueries(['summary'])
      queryClient.invalidateQueries(['salesHistory'])
      toast.success(t('debts.paidSuccess'))
    } catch {
      toast.error(t('toast.saveFailed'))
    } finally {
      setLoading(false)
      setConfirmCustomer(null)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('debts.title')}</h1>
          <button
            onClick={() => {
              setName(search || '')
              setPhone('')
              setShowAddClient(true)
            }}
            className="btn-ghost text-green-600 font-semibold text-sm"
          >
            + {t('common.add')}
          </button>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder={t('debts.searchClients')} />
      </header>

      <main className="p-4 space-y-3">
        {/* Total outstanding banner */}
        <div className="card bg-gradient-to-br from-red-50 to-amber-50 dark:from-red-900/20 dark:to-amber-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 dark:text-red-400">{t('debts.totalOutstanding')}</p>
              <p className="text-3xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p>
            </div>
            <div className="text-end">
              <p className="text-sm text-gray-500">{totalCustomers}</p>
              <p className="text-xs text-gray-400">{t('debts.customers')}</p>
            </div>
          </div>
        </div>

        {/* Customer debt cards */}
        {isLoading || isLoadingCustomers ? <LoadingSkeleton count={5} /> :
         filtered.length === 0 ? (
           <EmptyState icon="✅" title={t('debts.noDebts')} />
         ) : (
           filtered.map((group, i) => (
             <motion.div
               key={group.customer_id || group.customer_name || i}
               initial={{ opacity: 0, y: 8 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.04 }}
             >
               <CustomerDebtCard
                 group={group}
                 onMarkSalePaid={(sale) => setConfirmSale(sale)}
                 onMarkAllPaid={() => setConfirmCustomer(group)}
                 onViewStatement={() => setSelectedCustomer(group)}
               />
             </motion.div>
           ))
         )
        }
      </main>

      {/* Confirm single payment */}
      <ConfirmDialog
        isOpen={!!confirmSale}
        onClose={() => setConfirmSale(null)}
        onConfirm={() => handleMarkSalePaid(confirmSale)}
        title={t('debts.confirmPayTitle')}
        message={t('debts.confirmPayMessage')}
        danger={false}
      />

      {/* Confirm mark all paid for customer */}
      <ConfirmDialog
        isOpen={!!confirmCustomer}
        onClose={() => setConfirmCustomer(null)}
        onConfirm={() => handleMarkAllPaid(confirmCustomer)}
        title={t('debts.confirmPayTitle')}
        message={t('debts.confirmPayAllMessage')}
        danger={false}
      />

      {/* Receipt sheet */}
      <DebtReceiptSheet
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        group={selectedCustomer}
        onMarkSalePaid={(sale) => {
          setSelectedCustomer(null)
          setTimeout(() => setConfirmSale(sale), 200)
        }}
      />

      {/* Add client */}
      <BottomSheet
        isOpen={showAddClient}
        onClose={() => setShowAddClient(false)}
        title={t('customers.addCustomer')}
      >
        <div className="space-y-4">
          <FormInput label={t('customers.name')} value={name} onChange={setName} required autoFocus />
          <FormInput label={t('customers.phone')} value={phone} onChange={setPhone} type="tel" dir="ltr" />
          <button
            onClick={async () => {
              if (!name.trim()) return
              setLoading(true)
              try {
                await customerRepository.create(storeId, { name: name.trim(), phone: phone.trim() || null })
                queryClient.invalidateQueries(['customers'])
                toast.success(t('toast.settingsSaved'))
                setShowAddClient(false)
              } catch {
                toast.error(t('toast.saveFailed'))
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </BottomSheet>
    </motion.div>
  )
}

