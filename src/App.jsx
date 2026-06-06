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

// POS screens
const POSScreen = lazy(() => import('./screens/pos/index'))
const LoginScreen = lazy(() => import('./screens/auth/LoginScreen'))
const RegisterScreen = lazy(() => import('./screens/auth/RegisterScreen'))
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
const BusinessTypeSelection = lazy(() => import('./screens/onboarding/BusinessTypeSelection'))

// Landing pages
const LandingPage = lazy(() => import('./landing/pages/LandingPage'))
const DemoPage = lazy(() => import('./landing/pages/DemoPage'))
const RegionSelect = lazy(() => import('./landing/pages/RegionSelect'))
const AlgeriaFlow = lazy(() => import('./landing/pages/AlgeriaFlow'))
const PricingPage = lazy(() => import('./landing/pages/PricingPage'))
const SubscriptionPage = lazy(() => import('./landing/pages/SubscriptionPage'))
const BillingPage = lazy(() => import('./landing/pages/BillingPage'))
const PaymentPage = lazy(() => import('./landing/pages/PaymentPage'))
const AccountOptionsPage = lazy(() => import('./landing/pages/AccountOptionsPage'))
const AlgeriaCallback = lazy(() => import('./landing/pages/AlgeriaCallback'))
const HfsqlSetupPage = lazy(() => import('./landing/pages/HfsqlSetupPage'))
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

  return (
      <div className="relative min-h-screen">
        {!isOnline && <OfflineBanner />}
        <UpdateBanner />
      <Routes>
        {/* Public landing routes */}
        <Route path="/" element={
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <LandingPage />
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/demo" element={
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <DemoPage />
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/register" element={
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <RegionSelect />
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/register/algeria" element={
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <AlgeriaFlow />
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/register/algeria/callback" element={
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <AlgeriaCallback />
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/register/pricing" element={
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <PricingPage />
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/register/subscribe" element={
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <SubscriptionPage />
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/register/billing" element={
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <BillingPage />
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/register/payment" element={
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <PaymentPage />
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/register/account-options" element={
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <AccountOptionsPage />
            </Suspense>
          </ErrorBoundary>
        } />
        <Route path="/register/hfsql-setup" element={
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <HfsqlSetupPage />
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
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
