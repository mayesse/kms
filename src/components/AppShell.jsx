import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BottomNav from './BottomNav'
import DesktopNav from './DesktopNav'
import TrialBanner from './TrialBanner'
import Titlebar from './Titlebar'
import { isElectron } from '../lib/adapters/storageConfig'

export default function AppShell() {
  const { i18n } = useTranslation()
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
  const electron = isElectron()
  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${electron ? 'pt-[38px]' : ''}`} dir={dir}>
      <Titlebar />
      <TrialBanner />
      <div className="lg:flex">
        <DesktopNav />
        <div className="min-w-0 flex-1">
          <div className="pb-20 lg:pb-0">
            <Outlet />
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  )
}

