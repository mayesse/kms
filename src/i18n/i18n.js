import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ar from './ar'
import en from './en'
import fr from './fr'
import de from './de'
import it from './it'

const saved = localStorage.getItem('lang')
const fallback = saved || 'ar'

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
    fr: { translation: fr },
    de: { translation: de },
    it: { translation: it },
  },
  lng: fallback,
  fallbackLng: 'ar',
  interpolation: {
    prefix: '{',
    suffix: '}',
  },
})

// Persist language change
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('lang', lng)
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.lang = lng
})

// Set initial dir
document.documentElement.dir = fallback === 'ar' ? 'rtl' : 'ltr'
document.documentElement.lang = fallback

export default i18n
