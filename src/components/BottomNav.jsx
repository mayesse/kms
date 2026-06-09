import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  ShoppingCartIcon,
  CubeIcon,
  TruckIcon,
  BanknotesIcon,
  ChartBarIcon,
  TableCellsIcon,
  FireIcon,
  MapPinIcon,
  CalendarDaysIcon,
  BuildingStorefrontIcon,
  BeakerIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import {
  ShoppingCartIcon as ShoppingCartSolid,
  CubeIcon as CubeSolid,
  TruckIcon as TruckSolid,
  BanknotesIcon as BankNotesSolid,
  ChartBarIcon as ChartBarSolid,
  TableCellsIcon as TableCellsSolid,
  FireIcon as FireSolid,
  MapPinIcon as MapPinSolid,
  CalendarDaysIcon as CalendarDaysSolid,
  BuildingStorefrontIcon as BuildingStorefrontSolid,
  BeakerIcon as BeakerSolid,
  WrenchScrewdriverIcon as WrenchScrewdriverSolid,
} from '@heroicons/react/24/solid'
import { useAuthStore } from '../stores/authStore'
import { useDeviceModulesStore } from '../stores/deviceModulesStore'
import { hasModule } from '../utils/businessTypes'
import { useTranslation } from 'react-i18next'

export default function BottomNav() {
  const { t } = useTranslation()
  const [cartCount, setCartCount] = useState(0)
  useEffect(() => {
    import('../stores/posStore').then(mod => {
      const update = () => setCartCount(mod.usePosStore.getState().cart.length)
      update()
      return mod.usePosStore.subscribe(update)
    })
  }, [])
  const businessType = useAuthStore((s) => s.businessType)
  const hasModuleOnDevice = useDeviceModulesStore(s => s.hasModuleOnDevice)
  useDeviceModulesStore(s => s._v)

  const ALL_TABS = [
    { path: '/app/', module: 'pos', label: t('nav.pos'), Icon: ShoppingCartIcon, ActiveIcon: ShoppingCartSolid, id: 'nav-pos' },
    { path: '/app/inventory', module: 'inventory', label: t('nav.inventory'), Icon: CubeIcon, ActiveIcon: CubeSolid, id: 'nav-inventory' },
    { path: '/app/purchases', module: 'purchases', label: t('nav.purchases'), Icon: TruckIcon, ActiveIcon: TruckSolid, id: 'nav-purchases' },
    { path: '/app/debts', module: 'debts', label: t('nav.debts'), Icon: BanknotesIcon, ActiveIcon: BankNotesSolid, id: 'nav-debts' },
    { path: '/app/reports', module: 'reports', label: t('nav.reports'), Icon: ChartBarIcon, ActiveIcon: ChartBarSolid, id: 'nav-reports' },
    { path: '/app/batches', module: 'batches', label: t('nav.batches'), Icon: BeakerIcon, ActiveIcon: BeakerSolid, id: 'nav-batches' },
    { path: '/app/tables', module: 'tables', label: t('nav.tables'), Icon: TableCellsIcon, ActiveIcon: TableCellsSolid, id: 'nav-tables' },
    { path: '/app/kitchen', module: 'kitchen', label: t('nav.kitchen'), Icon: FireIcon, ActiveIcon: FireSolid, id: 'nav-kitchen' },
    { path: '/app/delivery', module: 'delivery', label: t('nav.delivery'), Icon: MapPinIcon, ActiveIcon: MapPinSolid, id: 'nav-delivery' },
    { path: '/app/appointments', module: 'appointments', label: t('nav.appointments'), Icon: CalendarDaysIcon, ActiveIcon: CalendarDaysSolid, id: 'nav-appointments' },
    { path: '/app/work-orders', module: 'work_orders', label: t('nav.workOrders'), Icon: WrenchScrewdriverIcon, ActiveIcon: WrenchScrewdriverSolid, id: 'nav-work-orders' },
    { path: '/app/services', module: 'services', label: t('nav.services'), Icon: WrenchScrewdriverIcon, ActiveIcon: WrenchScrewdriverSolid, id: 'nav-services' },
    { path: '/app/branches', module: 'branches', label: t('nav.branches'), Icon: BuildingStorefrontIcon, ActiveIcon: BuildingStorefrontSolid, id: 'nav-branches' },
  ]

  const tabs = ALL_TABS.filter(tab => hasModuleOnDevice(businessType, tab.module, hasModule))

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-gray-800
                    border-t border-gray-200 dark:border-gray-700
                    safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.length === 0 && null}
        {tabs.map(({ path, label, Icon, ActiveIcon, id }) => (
          <NavLink
            key={path}
            to={path}
            id={id}
            end={path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 w-full h-full
               transition-colors ${isActive ? 'text-green-600' : 'text-gray-500 dark:text-gray-400'}`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  {isActive ? (
                    <ActiveIcon className="h-6 w-6" />
                  ) : (
                    <Icon className="h-6 w-6" />
                  )}
                  {path === '/' && cartCount > 0 && (
                    <span className="absolute -top-1 -end-2 min-w-[18px] h-[18px]
                                     bg-red-500 text-white text-[10px] font-bold
                                     rounded-full flex items-center justify-center px-1">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
