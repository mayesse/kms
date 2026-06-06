import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import LoadingSkeleton from './LoadingSkeleton'

export default function ProtectedRoute({ children }) {
  const { session, businessType, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4" dir="rtl">
        <LoadingSkeleton count={6} />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/app/auth/login" replace />
  }

  if (!businessType) {
    return <Navigate to="/app/onboarding" replace />
  }

  return children
}
