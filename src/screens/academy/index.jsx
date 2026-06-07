import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const TABS = [
  { key: 'students', path: '/app/academy/students', icon: '👨‍🎓' },
  { key: 'schedule', path: '/app/academy/schedule', icon: '📅' },
  { key: 'teachers', path: '/app/academy/teachers', icon: '👩‍🏫' },
  { key: 'billing', path: '/app/academy/billing', icon: '💰' },
  { key: 'courses', path: '/app/academy/courses', icon: '📚' },
  { key: 'reports', path: '/app/academy/reports', icon: '📊' },
]

export default function AcademyLayout() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('academy.title')}</h1>
        </div>
        <div className="flex overflow-x-auto gap-1 px-2 pb-1 scrollbar-none">
          {TABS.map(tab => (
            <NavLink
              key={tab.key}
              to={tab.path}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <span>{tab.icon}</span>
              <span>{t(`academy.${tab.key}`)}</span>
            </NavLink>
          ))}
        </div>
      </header>
      <main className="p-4 pb-24">
        <Outlet />
      </main>
    </div>
  )
}
