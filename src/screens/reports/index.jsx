import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Cog6ToothIcon } from '@heroicons/react/24/outline'
import { useReportsStore } from '../../stores/reportsStore'
import { useTranslation } from 'react-i18next'
import PasswordGate from './components/PasswordGate'
import DashboardTab from './components/DashboardTab'
import SalesHistoryTab from './components/SalesHistoryTab'
import ActivityLogTab from './components/ActivityLogTab'
import CreditTab from './components/CreditTab'
import LocalSalesTab from './components/LocalSalesTab'

export default function ReportsScreen() {
  const { checkAccess, activeTab, setTab } = useReportsStore()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const hasAccess = checkAccess()

  const tabs = [
    { id: 'dashboard', label: t('reports.dashboard') },
    { id: 'sales', label: t('reports.salesHistory') },
    { id: 'localSales', label: t('reports.localSales') },
    { id: 'activity', label: t('reports.activityLog') },
    { id: 'credit', label: t('reports.creditSales') },
  ]

  if (!hasAccess) return <PasswordGate />

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('reports.title')}</h1>
          <button
            onClick={() => navigate('/app/settings', { state: { from: '/app/reports' } })}
            className="h-10 w-10 grid place-items-center rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 active:scale-95 transition-transform"
            aria-label={t('settings.title')}
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.id ? 'bg-green-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="p-4">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'sales' && <SalesHistoryTab />}
        {activeTab === 'localSales' && <LocalSalesTab />}
        {activeTab === 'activity' && <ActivityLogTab />}
        {activeTab === 'credit' && <CreditTab />}
      </main>
    </motion.div>
  )
}
