import { NavLink } from 'react-router-dom'
import {
  ShoppingCartIcon,
  CubeIcon,
  TruckIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  UsersIcon,
  ArchiveBoxIcon,
  ClockIcon,
  BanknotesIcon,
  TableCellsIcon,
  FireIcon,
  MapPinIcon,
  CalendarDaysIcon,
  BuildingStorefrontIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import {
  ShoppingCartIcon as ShoppingCartSolid,
  CubeIcon as CubeSolid,
  TruckIcon as TruckSolid,
  ChartBarIcon as ChartBarSolid,
  Cog6ToothIcon as Cog6ToothSolid,
  UsersIcon as UsersSolid,
  ArchiveBoxIcon as ArchiveBoxSolid,
  ClockIcon as ClockSolid,
  BanknotesIcon as BankNotesSolid,
  TableCellsIcon as TableCellsSolid,
  FireIcon as FireSolid,
  MapPinIcon as MapPinSolid,
  CalendarDaysIcon as CalendarDaysSolid,
  BuildingStorefrontIcon as BuildingStorefrontSolid,
  WrenchScrewdriverIcon as WrenchScrewdriverSolid,
} from '@heroicons/react/24/solid'
import { useAuthStore } from '../stores/authStore'
import { useDeviceModulesStore } from '../stores/deviceModulesStore'
import { useTrialStore } from '../stores/trialStore'
import { hasModule, getExtraModuleRoutes } from '../utils/businessTypes'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'

function NavItem({ path, label, Icon, ActiveIcon }) {
  return (
    <NavLink
      to={path}
      end={path === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors
         ${isActive ? 'bg-white/20 text-white shadow-sm' : 'text-green-100/90 hover:bg-white/10 hover:text-white'}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? <ActiveIcon className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
          <span className="text-start">{label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function DesktopNav() {
  const { t } = useTranslation()
  const businessType = useAuthStore((s) => s.businessType)
  const hasModuleOnDevice = useDeviceModulesStore(s => s.hasModuleOnDevice)
  useDeviceModulesStore(s => s._v)
  const isExpired = useTrialStore(s => s.isExpired())
  const remainingDays = useTrialStore(s => s.remainingDays())
  const trial = useTrialStore(s => s.trial)

  const ALL_PRIMARY = [
    { path: '/app/', module: 'pos', label: t('nav.pos'), Icon: ShoppingCartIcon, ActiveIcon: ShoppingCartSolid },
    { path: '/app/inventory', module: 'inventory', label: t('nav.inventory'), Icon: CubeIcon, ActiveIcon: CubeSolid },
    { path: '/app/purchases', module: 'purchases', label: t('nav.purchases'), Icon: TruckIcon, ActiveIcon: TruckSolid },
    { path: '/app/debts', module: 'debts', label: t('nav.debts'), Icon: BanknotesIcon, ActiveIcon: BankNotesSolid },
    { path: '/app/reports', module: 'reports', label: t('nav.reports'), Icon: ChartBarIcon, ActiveIcon: ChartBarSolid },
  ]

  const ALL_SECONDARY = [
    { path: '/app/customers', module: 'customers', label: t('nav.customers'), Icon: UsersIcon, ActiveIcon: UsersSolid },
    { path: '/app/holds', module: 'holds', label: t('nav.holds'), Icon: ArchiveBoxIcon, ActiveIcon: ArchiveBoxSolid },
    { path: '/app/sessions', module: 'sessions', label: t('nav.sessions'), Icon: ClockIcon, ActiveIcon: ClockSolid },
    { path: '/app/settings', module: 'settings', label: t('nav.settings'), Icon: Cog6ToothIcon, ActiveIcon: Cog6ToothSolid },
    { path: '/app/tables', module: 'tables', label: t('nav.tables'), Icon: TableCellsIcon, ActiveIcon: TableCellsSolid },
    { path: '/app/kitchen', module: 'kitchen', label: t('nav.kitchen'), Icon: FireIcon, ActiveIcon: FireSolid },
    { path: '/app/delivery', module: 'delivery', label: t('nav.delivery'), Icon: MapPinIcon, ActiveIcon: MapPinSolid },
    { path: '/app/appointments', module: 'appointments', label: t('nav.appointments'), Icon: CalendarDaysIcon, ActiveIcon: CalendarDaysSolid },
    { path: '/app/work-orders', module: 'work_orders', label: t('nav.workOrders'), Icon: WrenchScrewdriverIcon, ActiveIcon: WrenchScrewdriverSolid },
    { path: '/app/branches', module: 'branches', label: t('nav.branches'), Icon: BuildingStorefrontIcon, ActiveIcon: BuildingStorefrontSolid },
  ]

  const primary = ALL_PRIMARY.filter(item => hasModuleOnDevice(businessType, item.module, hasModule))
  const secondary = ALL_SECONDARY.filter(item => hasModuleOnDevice(businessType, item.module, hasModule))
  const extra = getExtraModuleRoutes(businessType).filter(r => hasModuleOnDevice(businessType, r.module, hasModule))

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:shrink-0 lg:h-screen lg:sticky lg:top-0
                      bg-gradient-to-b from-green-700 via-green-600 to-emerald-600 dark:from-green-900 dark:via-green-800 dark:to-emerald-800 border-e border-white/15 dark:border-white/5">
      <div className="p-4 border-b border-white/15 dark:border-white/5 bg-gradient-to-b from-white/10 to-transparent">
        <div className="text-lg font-extrabold text-white">
          {t('app.name')}
        </div>
        <div className="text-xs text-green-200/80 mt-1">
          {t('app.desktopSubtitle')}
        </div>
      </div>

      {primary.length > 0 && (
        <nav className="p-3 space-y-1">
          {primary.map((item) => <NavItem key={item.path} path={item.path} label={item.label} Icon={item.Icon} ActiveIcon={item.ActiveIcon} />)}
        </nav>
      )}

      {secondary.length > 0 && (
        <>
          <div className="px-4 pt-2">
            <div className="text-xs font-bold text-green-200/80 uppercase">
              {t('common.more')}
            </div>
          </div>

          <nav className="p-3 space-y-1">
            {secondary.map((item) => <NavItem key={item.path} path={item.path} label={item.label} Icon={item.Icon} ActiveIcon={item.ActiveIcon} />)}
          </nav>
        </>
      )}

      {extra.length > 0 && (
        <>
          <div className="px-4 pt-2">
            <div className="text-xs font-bold text-green-200/80 uppercase">
              {t('nav.tools')}
            </div>
          </div>
          <nav className="p-3 space-y-1">
            {extra.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors
                   ${isActive ? 'bg-white/20 text-white shadow-sm' : 'text-green-100/90 hover:bg-white/10 hover:text-white'}`
                }
              >
                <span className="text-start">{t(item.labelKey)}</span>
              </NavLink>
            ))}
          </nav>
        </>
      )}

      {trial && (
        <div className="px-3 pt-2">
          <NavLink
            to="/register/pricing"
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold bg-white/15 hover:bg-white/25 text-white transition-colors"
          >
            {isExpired ? (
              <span className="flex items-center gap-2">{t('trial.expired')} ↑</span>
            ) : (
              <span className="flex items-center gap-2">{t('trial.upgrade')} ({remainingDays}d) ↑</span>
            )}
          </NavLink>
        </div>
      )}
      <div className="mt-auto p-4 border-t border-white/15">
        <LanguageSwitcher compact />
      </div>
    </aside>
  )
}


