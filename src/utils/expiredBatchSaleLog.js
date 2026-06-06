import { activityLogRepository } from '../repositories/activityLogRepository'
import { usePendingActivityLogStore } from '../stores/pendingActivityLogStore'

function buildEntry(storeId, saleResult, warnings) {
  const details = warnings.map(w => ({
    product: w.productName,
    lot: w.lot,
    expiry: w.expiryDate,
  }))

  return {
    storeId,
    actionType: 'sale_expired_batch',
    entityType: 'sale',
    entityId: saleResult?.sale_id || null,
    entityName: saleResult?.receipt_number || '—',
    details: JSON.stringify(details),
    amount: saleResult?.total ?? null,
  }
}

/** Audit trail when pharmacy sells expired batches — warn-only, never blocks sale. */
export async function logExpiredBatchSale(storeId, saleResult, warnings, { isOnline = true } = {}) {
  if (!storeId || !warnings?.length) return

  const entry = buildEntry(storeId, saleResult, warnings)

  if (!isOnline) {
    usePendingActivityLogStore.getState().enqueue(entry)
    return
  }

  try {
    await activityLogRepository.log(
      entry.storeId,
      entry.actionType,
      entry.entityType,
      entry.entityId,
      entry.entityName,
      entry.details,
      entry.amount,
    )
  } catch {
    usePendingActivityLogStore.getState().enqueue(entry)
  }
}

export async function flushPendingActivityLogs() {
  const pending = usePendingActivityLogStore.getState().getPending()
  if (!pending.length) return 0

  let synced = 0
  for (const entry of pending) {
    try {
      await activityLogRepository.log(
        entry.storeId,
        entry.actionType,
        entry.entityType,
        entry.entityId,
        entry.entityName,
        entry.details,
        entry.amount,
      )
      usePendingActivityLogStore.getState().remove(entry.id)
      synced += 1
    } catch {
      break
    }
  }
  return synced
}
