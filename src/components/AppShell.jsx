import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BottomNav from './BottomNav'
import DesktopNav from './DesktopNav'
import TrialBanner from './TrialBanner'

export default function AppShell() {
  const { i18n } = useTranslation()
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir={dir}>
      <TrialBanner />
      <div className="lg:flex">
        <DesktopNav />
        <div className="min-w-0 flex-1">
          {/* Mobile: leave room for bottom nav */}
          <div className="pb-20 lg:pb-0">
            <Outlet />
          </div>
        </div>
      </div>

      {/* Mobile only */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  )
}

