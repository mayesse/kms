import { useTranslation } from 'react-i18next'
import { LanguageIcon } from '@heroicons/react/24/outline'

const LANGUAGES = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
]

export default function LanguageSwitcher({ compact }) {
  const { i18n } = useTranslation()
  const current = i18n.language

  if (compact) {
    return (
      <select
        value={current}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1 border-0 cursor-pointer focus:ring-2 focus:ring-green-500"
        dir="ltr"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <LanguageIcon className="h-5 w-5 text-gray-500" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.language')}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => i18n.changeLanguage(l.code)}
            className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all active:scale-[0.97] ${
              current === l.code
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}
