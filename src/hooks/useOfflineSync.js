import { useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { useOfflineQueueStore } from '../stores/offlineQueueStore'
import { usePendingActivityLogStore } from '../stores/pendingActivityLogStore'
import { saleRepository } from '../repositories/saleRepository'
import { flushPendingActivityLogs } from '../utils/expiredBatchSaleLog'
import { useOnlineStatus } from './useOnlineStatus'

export function useOfflineSync() {
  const { t } = useTranslation()
  const storeId = useAuthStore((s) => s.storeId)
  const isOnline = useOnlineStatus()
  const queue = useOfflineQueueStore((s) => s.queue)
  const activityQueue = usePendingActivityLogStore((s) => s.queue)
  const remove = useOfflineQueueStore((s) => s.remove)
  const incrementAttempts = useOfflineQueueStore((s) => s.incrementAttempts)
  const syncingRef = useRef(false)

  const flushQueue = useCallback(async () => {
    if (!storeId || syncingRef.current) return

    const pendingSales = useOfflineQueueStore.getState().getPending()
    const pendingLogs = usePendingActivityLogStore.getState().getPending()
    if (!pendingSales.length && !pendingLogs.length) return

    syncingRef.current = true
    let syncedSales = 0
    let syncedLogs = 0

    for (const entry of pendingSales) {
      const { payload } = entry
      try {
        await saleRepository.createSale(
          payload.storeId,
          payload.sessionId,
          payload.items,
          payload.paymentMethod,
          payload.customerName,
          payload.customerPhone,
          payload.customerId,
          payload.note,
          payload.discountAmount,
          payload.verticalOptions
        )
        remove(entry.id)
        syncedSales += 1
      } catch (err) {
        incrementAttempts(entry.id, err.message || 'sync failed')
      }
    }

    syncedLogs = await flushPendingActivityLogs()

    syncingRef.current = false

    if (syncedSales > 0) {
      toast.success(t('offline.synced', { count: syncedSales }))
    }
    if (syncedLogs > 0) {
      toast.success(t('offline.logsSynced', { count: syncedLogs }))
    }
  }, [storeId, remove, incrementAttempts, t])

  useEffect(() => {
    if (isOnline && storeId) {
      flushQueue()
    }
  }, [isOnline, storeId, flushQueue])

  return {
    pendingCount: queue.length + activityQueue.length,
    pendingSalesCount: queue.length,
    pendingLogsCount: activityQueue.length,
    flushQueue,
    isSyncing: syncingRef.current,
  }
}
