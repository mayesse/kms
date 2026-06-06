import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useTrialStore } from '../stores/trialStore'

export default function TrialGuard() {
  const storeId = useAuthStore(s => s.storeId)
  const loadTrial = useTrialStore(s => s.loadTrial)

  useEffect(() => {
    if (storeId) {
      loadTrial(storeId)
    }
  }, [storeId, loadTrial])

  return null
}
