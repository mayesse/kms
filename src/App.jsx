import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from './stores/authStore'
import { useSettingsStore } from './stores/settingsStore'
import { useDeviceModulesStore } from './stores/deviceModulesStore'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { useOfflineSync } from './hooks/useOfflineSync'
import ProtectedRoute from './components/ProtectedRoute'
import RouteModuleGuard from './components/RouteModuleGuard'
import AppShell from './components/AppShell'
import LoadingSkeleton from './components/LoadingSkeleton'
import WelcomeTour from './components/WelcomeTour'
import TrialGuard from './components/TrialGuard'
import OfflineBanner from './components/OfflineBanner'
import UpdateBanner from './components/UpdateBanner'
import ErrorBoundary from './components/ErrorBoundary'
import { isElectron, isDesktopApp, getStorageConfig } from './lib/adapters/storageConfig'

// POS screens
const POSScreen = lazy(() => import('./screens/pos/index'))
const LoginScreen = lazy(() => import('./screens/auth/LoginScreen'))
const RegisterScreen = lazy(() => import('./screens/auth/RegisterScreen'))
const LoginRegisterScreen = lazy(() => import('./screens/auth/LoginRegisterScreen'))
const InventoryScreen = lazy(() => import('./screens/inventory/index'))
const PurchasesScreen = lazy(() => import('./screens/purchases/index'))
const ReportsScreen = lazy(() => import('./screens/reports/index'))
const SettingsScreen = lazy(() => import('./screens/settings/index'))
const CustomersScreen = lazy(() => import('./screens/customers/index'))
const HoldsScreen = lazy(() => import('./screens/holds/index'))
const SessionsScreen = lazy(() => import('./screens/sessions/index'))
const DebtsScreen = lazy(() => import('./screens/debts/index'))
const TablesScreen = lazy(() => import('./screens/tables/index'))
const KitchenScreen = lazy(() => import('./screens/kitchen/index'))
const DeliveryScreen = lazy(() => import('./screens/delivery/index'))
const AppointmentsScreen = lazy(() => import('./screens/appointments/index'))
const BatchesScreen = lazy(() => import('./screens/batches/index'))
const TaxRatesScreen = lazy(() => import('./screens/tax_rates/index'))
const CommissionsScreen = lazy(() => import('./screens/commissions/index'))
const TransfersScreen = lazy(() => import('./screens/transfers/index'))
const BranchesScreen = lazy(() => import('./screens/branches/index'))
const PromotionsScreen = lazy(() => import('./screens/promotions/index'))
const StaffScreen = lazy(() => import('./screens/staff/index'))
const ServicesScreen = lazy(() => import('./screens/services/index'))
const WorkOrdersScreen = lazy(() => import('./screens/work_orders/index'))
const ModifiersScreen = lazy(() => import('./screens/modifiers/index'))
const TourismLayout = lazy(() => import('./screens/tourism/index'))
const DossiersScreen = lazy(() => import('./screens/tourism/DossiersScreen'))
const TourismPackagesScreen = lazy(() => import('./screens/tourism/PackagesScreen'))
const HajjScreen = lazy(() => import('./screens/tourism/HajjScreen'))
const TourismClientsScreen = lazy(() => import('./screens/tourism/ClientsScreen'))
const TourismPaymentsScreen = lazy(() => import('./screens/tourism/PaymentsScreen'))
const TourismReportsScreen = lazy(() => import('./screens/tourism/ReportsScreen'))
const TourismSuppliersScreen = lazy(() => import('./screens/tourism/SuppliersScreen'))
const AcademyLayout = lazy(() => import('./screens/academy/index'))
const StudentsScreen = lazy(() => import('./screens/academy/StudentsScreen'))
const ScheduleScreen = lazy(() => import('./screens/academy/ScheduleScreen'))
const TeachersScreen = lazy(() => import('./screens/academy/TeachersScreen'))
const BillingScreen = lazy(() => import('./screens/academy/BillingScreen'))
const CoursesScreen = lazy(() => import('./screens/academy/CoursesScreen'))
const AcademyReportsScreen = lazy(() => import('./screens/academy/ReportsScreen'))
const BusinessTypeSelection = lazy(() => import('./screens/onboarding/BusinessTypeSelection'))

// Landing pages
const LandingPage = lazy(() => import('./landing/pages/LandingPage'))
const DemoPage = lazy(() => import('./landing/pages/DemoPage'))
// These are kept for now but no longer routed — landing registration removed.
const ElectronSetupPage = lazy(() => import('./landing/pages/ElectronSetupPage'))
const DownloadPage = lazy(() => import('./landing/pages/DownloadPage'))

function AppShellFallback() {
  return <div className="flex items-center justify-center min-h-screen"><LoadingSkeleton count={6} height="h-24" /></div>
}

function PageFallback() {
  return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900"><LoadingSkeleton count={3} height="h-8" /></div>
}

export default function App() {
  const { t } = useTranslation()
  const initialize = useAuthStore((s) => s.initialize)
  const session = useAuthStore((s) => s.session)
  const storeId = useAuthStore((s) => s.storeId)
  const businessType = useAuthStore((s) => s.businessType)
  const authLoading = useAuthStore((s) => s.isLoading)
  const loadSettings = useSettingsStore((s) => s.load)
  const loadDeviceModules = useDeviceModulesStore((s) => s.load)
  const isOnline = useOnlineStatus()
  const { pendingCount, flushQueue } = useOfflineSync()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (storeId) {
      loadSettings(storeId)
      loadDeviceModules(storeId)
    }
  }, [storeId, loadSettings, loadDeviceModules])

  const dir = document.documentElement.dir

  // Redirect to Electron setup on first launch
  useEffect(() => {
    if (isElectron()) {
      const cfg = getStorageConfig()
      if (!cfg.setupComplete) {
        window.location.hash = '#/setup'
      }
    }
  }, [])

  return (
      <div className="relative min-h-screen">
        {!isOnline && <OfflineBanner />}
        <UpdateBanner />
      <Routes>
        {/* Public landing routes — redirect to auth gate on desktop */}
        <Route path="/" element={
          <ErrorBoundary>
            {isDesktopApp() ? (
              authLoading ? (
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                  <LoadingSkeleton count={3} height="h-8" />
                </div>
              ) : !session ? (
                <Suspense fallback={<PageFallback />}>
                  <LoginRegisterScreen />
                </Suspense>
              ) : (
                <Navigate to="/app/" replace />
              )
            ) : (
              <Suspense fallback={<PageFallback />}>
                <LandingPage />
              </Suspense>
            )}
          </ErrorBoundary>
        } />
        <Route path="/demo" element={
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <DemoPage />
            </Suspense>
          </ErrorBoundary>
        } />
        {/* /register routes removed — use /app/auth/register instead */}
        <Route path="/setup" element={
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <ElectronSetupPage />
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/download" element={
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <DownloadPage />
            </Suspense>
          </ErrorBoundary>
        } />

        {/* POS app routes — all under /app/ */}
        <Route path="/app/auth/login" element={
          <Suspense fallback={<AppShellFallback />}>
            {session ? <Navigate to="/app/" replace /> : <LoginScreen />}
          </Suspense>
        } />
        <Route path="/app/auth/register" element={
          <Suspense fallback={<AppShellFallback />}>
            {session ? <Navigate to="/app/" replace /> : <RegisterScreen />}
          </Suspense>
        } />

        <Route path="/app/onboarding/business-type" element={
          <Suspense fallback={<AppShellFallback />}>
            {!session ? <Navigate to="/app/auth/login" replace /> :
            businessType ? <Navigate to="/app/" replace /> :
            <BusinessTypeSelection />}
          </Suspense>
        } />
        <Route path="/app/onboarding" element={<Navigate to="/app/onboarding/business-type" replace />} />

        <Route element={
          <ProtectedRoute>
            <TrialGuard />
            <AppShell />
          </ProtectedRoute>
        }>
          <Route path="/app/" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><POSScreen /></Suspense>} />
          <Route path="/app/inventory" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="inventory"><InventoryScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/purchases" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="purchases"><PurchasesScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/reports" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="reports"><ReportsScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/debts" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="debts"><DebtsScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/settings" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><SettingsScreen /></Suspense>} />
          <Route path="/app/customers" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="customers"><CustomersScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/holds" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="holds"><HoldsScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/sessions" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="sessions"><SessionsScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/tables" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="tables"><TablesScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/kitchen" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="kitchen"><KitchenScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/delivery" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="delivery"><DeliveryScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/appointments" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="appointments"><AppointmentsScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/work-orders" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="work_orders"><WorkOrdersScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/branches" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="branches"><BranchesScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/promotions" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="promotions"><PromotionsScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/staff" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="staff"><StaffScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/batches" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="batches"><BatchesScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/tax-rates" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="tva"><TaxRatesScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/commissions" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="staff"><CommissionsScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/transfers" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="branches"><TransfersScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/services" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="services"><ServicesScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/modifiers" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="modifiers"><ModifiersScreen /></RouteModuleGuard></Suspense>} />
          <Route path="/app/tourism" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="tourism"><TourismLayout /></RouteModuleGuard></Suspense>}>
            <Route index element={<Navigate to="dossiers" replace />} />
            <Route path="dossiers" element={<DossiersScreen />} />
            <Route path="packages" element={<TourismPackagesScreen />} />
            <Route path="hajj" element={<HajjScreen />} />
            <Route path="clients" element={<TourismClientsScreen />} />
            <Route path="payments" element={<TourismPaymentsScreen />} />
            <Route path="suppliers" element={<TourismSuppliersScreen />} />
            <Route path="reports" element={<TourismReportsScreen />} />
          </Route>
          <Route path="/app/academy" element={<Suspense fallback={<div className="p-4"><LoadingSkeleton count={4} height="h-16" /></div>}><RouteModuleGuard module="academy"><AcademyLayout /></RouteModuleGuard></Suspense>}>
            <Route index element={<Navigate to="students" replace />} />
            <Route path="students" element={<StudentsScreen />} />
            <Route path="schedule" element={<ScheduleScreen />} />
            <Route path="teachers" element={<TeachersScreen />} />
            <Route path="billing" element={<BillingScreen />} />
            <Route path="courses" element={<CoursesScreen />} />
            <Route path="reports" element={<AcademyReportsScreen />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
