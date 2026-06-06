import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../stores/authStore'
import { tableRepository } from '../../../repositories/tableRepository'

export default function useTableService() {
  const storeId = useAuthStore(s => s.storeId)
  const queryClient = useQueryClient()

  const assignTable = useMutation({
    mutationFn: async ({ tableId, orderId }) => {
      await tableRepository.setOccupied(storeId, tableId, true)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables', storeId] })
    },
  })

  const releaseTable = useMutation({
    mutationFn: async (tableId) => {
      await tableRepository.setOccupied(storeId, tableId, false)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables', storeId] })
      toast.success('تم تحرير الطاولة')
    },
    onError: () => toast.error('فشل تحرير الطاولة'),
  })

  const getAvailableTables = (tables) => {
    return (tables || []).filter(t => t.status !== 'occupied')
  }

  const getOccupiedTables = (tables) => {
    return (tables || []).filter(t => t.status === 'occupied')
  }

  return {
    assignTable,
    releaseTable,
    getAvailableTables,
    getOccupiedTables,
  }
}
