import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { batchRepository } from '../../../repositories/batchRepository'
import { useAuthStore } from '../../../stores/authStore'

export default function useExpiryAlerts() {
  const storeId = useAuthStore(s => s.storeId)

  const { data: expiringBatches, isLoading } = useQuery({
    queryKey: ['expiryAlerts', storeId],
    queryFn: () => batchRepository.getExpiring(storeId, 30),
    enabled: !!storeId,
    refetchInterval: 60000,
  })

  const alerts = useMemo(() => {
    if (!expiringBatches) return { critical: [], warning: [], total: 0 }

    const now = new Date()
    const critical = []
    const warning = []

    expiringBatches.forEach(batch => {
      if (!batch.expiry_date) return
      const diff = Math.ceil((new Date(batch.expiry_date) - now) / (1000 * 60 * 60 * 24))
      const productName = batch.products?.name || batch.product_name || 'غير معروف'
      if (diff <= 0) {
        critical.push({ ...batch, days: diff, productName, severity: 'expired' })
      } else if (diff <= 7) {
        critical.push({ ...batch, days: diff, productName, severity: 'critical' })
      } else if (diff <= 30) {
        warning.push({ ...batch, days: diff, productName, severity: 'warning' })
      }
    })

    return {
      critical: critical.sort((a, b) => a.days - b.days),
      warning: warning.sort((a, b) => a.days - b.days),
      total: critical.length + warning.length,
    }
  }, [expiringBatches])

  return {
    alerts,
    isLoading,
    hasAlerts: alerts.total > 0,
    criticalCount: alerts.critical.length,
  }
}
