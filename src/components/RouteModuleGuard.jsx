import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useDeviceModulesStore } from '../stores/deviceModulesStore'
import { hasModule } from '../utils/businessTypes'

export default function RouteModuleGuard({ module, children }) {
  const businessType = useAuthStore(s => s.businessType)
  const hasModuleOnDevice = useDeviceModulesStore(s => s.hasModuleOnDevice)
  useDeviceModulesStore(s => s._v) // re-render on changes

  const visible = !module || hasModuleOnDevice(businessType, module, hasModule)

  if (!visible) {
    return <Navigate to="/app/" replace />
  }

  return children
}
