import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../../stores/authStore'
import { staffRepository } from '../../../repositories/staffRepository'
import StaffSchedule from '../components/StaffSchedule'
import useStaffSchedule from '../hooks/useStaffSchedule'
import LoadingSkeleton from '../../../components/LoadingSkeleton'
import { useTranslation } from 'react-i18next'

export default function StaffScheduleScreen() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const { schedule, toggleSlot, saveSchedule } = useStaffSchedule()

  const { data: staff, isLoading } = useQuery({
    queryKey: ['scheduleStaff', storeId],
    queryFn: () => staffRepository.getAll(storeId),
    enabled: !!storeId,
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">جدول الموظفين</h1>
          <button onClick={() => saveSchedule.mutate(schedule)}
            disabled={saveSchedule.isPending}
            className="px-4 py-1.5 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-40 active:scale-95 transition-transform">
            {saveSchedule.isPending ? '...' : 'حفظ'}
          </button>
        </div>
      </header>

      <main className="p-4">
        {isLoading ? <LoadingSkeleton count={4} /> : (
          <div className="card">
            <StaffSchedule staff={staff || []} schedule={schedule} onToggleSlot={toggleSlot} />
          </div>
        )}
      </main>
    </motion.div>
  )
}
