import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'

export default function useStaffSchedule() {
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()
  const [schedule, setSchedule] = useState({})

  const saveSchedule = useMutation({
    mutationFn: async (scheduleData) => {
      const entries = []
      Object.entries(scheduleData).forEach(([staffId, dates]) => {
        Object.entries(dates).forEach(([date, slots]) => {
          entries.push({ store_id: storeId, staff_id: staffId, date, slots, created_at: new Date().toISOString() })
        })
      })
      if (entries.length === 0) return
      const { error } = await supabase
        .from('staff_schedule')
        .upsert(entries, { onConflict: 'store_id,staff_id,date' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffSchedule'] })
      toast.success('تم حفظ جدول الموظفين')
    },
    onError: () => toast.error('فشل حفظ الجدول'),
  })

  const toggleSlot = useCallback(({ staffId, date, slot }) => {
    setSchedule(prev => {
      const staffDates = { ...(prev[staffId] || {}) }
      const dateSlots = [...(staffDates[date] || [])]
      const index = dateSlots.indexOf(slot)
      if (index >= 0) dateSlots.splice(index, 1)
      else dateSlots.push(slot)
      dateSlots.sort()
      staffDates[date] = dateSlots
      return { ...prev, [staffId]: staffDates }
    })
  }, [])

  const clearSchedule = useCallback(() => setSchedule({}), [])

  return { schedule, setSchedule, toggleSlot, clearSchedule, saveSchedule }
}
