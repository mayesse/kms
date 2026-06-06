import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

const DAYS_OF_WEEK = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const TIME_SLOTS = Array.from({ length: 10 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`)

export default function StaffSchedule({ staff = [], schedule = {}, onToggleSlot }) {
  const { t } = useTranslation()
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedStaff, setSelectedStaff] = useState(null)

  const getWeekDates = () => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() + weekOffset * 7 - now.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      return d
    })
  }

  const weekDates = getWeekDates()

  const filteredStaff = selectedStaff
    ? staff.filter(s => s.id === selectedStaff)
    : staff

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekOffset(p => p - 1)}
          className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center active:scale-90 transition-transform">
          <ChevronRightIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
        </button>
        <span className="text-sm font-bold text-gray-900 dark:text-gray-50">
          {weekDates[0]?.toLocaleDateString('ar-DZ', { month: 'long', day: 'numeric' })} — {weekDates[6]?.toLocaleDateString('ar-DZ', { month: 'long', day: 'numeric' })}
        </span>
        <button onClick={() => setWeekOffset(p => p + 1)}
          className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center active:scale-90 transition-transform">
          <ChevronLeftIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        <button onClick={() => setSelectedStaff(null)}
          className={`px-3 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${
            !selectedStaff ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}>
          الكل
        </button>
        {staff.map(s => (
          <button key={s.id} onClick={() => setSelectedStaff(s.id)}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${
              selectedStaff === s.id ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}>
            {s.name}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto" dir="ltr">
        <table className="w-full border-collapse text-xs min-w-[600px]">
          <thead>
            <tr>
              <th className="px-2 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold border border-gray-200 dark:border-gray-700 sticky start-0 z-10">الموظف</th>
              {weekDates.map((date, i) => (
                <th key={i} className="px-2 py-1.5 bg-gray-100 dark:bg-gray-800 text-center border border-gray-200 dark:border-gray-700 min-w-[80px]">
                  <div className="font-semibold text-gray-700 dark:text-gray-300">{DAYS_OF_WEEK[date.getDay()]}</div>
                  <div className="text-[10px] text-gray-400">{date.getDate()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map(member => (
              <tr key={member.id}>
                <td className="px-2 py-2 font-semibold text-gray-900 dark:text-gray-50 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 sticky start-0 z-10">
                  {member.name}
                </td>
                {weekDates.map((date, dayIndex) => {
                  const dateKey = date.toISOString().split('T')[0]
                  const daySchedule = schedule[member.id]?.[dateKey] || []
                  return (
                    <td key={dayIndex} className="border border-gray-200 dark:border-gray-700 p-0.5 align-top">
                      <div className="space-y-0.5">
                        {TIME_SLOTS.map((slot, slotIndex) => {
                          const isActive = daySchedule.includes(slot)
                          return (
                            <button key={slotIndex}
                              onClick={() => onToggleSlot?.({ staffId: member.id, date: dateKey, slot })}
                              className={`w-full h-4 rounded-sm text-[8px] font-semibold transition-colors ${
                                isActive
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}>
                              {isActive ? '✓' : ''}
                            </button>
                          )
                        })}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> نشط</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-600" /> غير نشط</span>
      </div>
    </motion.div>
  )
}
