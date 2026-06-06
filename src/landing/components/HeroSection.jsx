import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, EnvelopeIcon, LockClosedIcon, ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../../stores/authStore'

const screenshots = [
  { src: '/screenshots/ssposgrocery.PNG', label: 'POS' },
  { src: '/screenshots/سوبرماركت.PNG', label: 'سوبرماركت' },
  { src: '/screenshots/بقالة.PNG', label: 'بقالة' },
  { src: '/screenshots/مطعم.PNG', label: 'مطعم' },
  { src: '/screenshots/مقهى.PNG', label: 'مقهى' },
  { src: '/screenshots/وجبات سريعة.PNG', label: 'وجبات سريعة' },
  { src: '/screenshots/مخبزة و باتيسري.PNG', label: 'مخبزة و باتيسري' },
  { src: '/screenshots/صيدلية.PNG', label: 'صيدلية' },
  { src: '/screenshots/غيار سيارات.PNG', label: 'غيار سيارات' },
  { src: '/screenshots/ملابس.PNG', label: 'ملابس' },
  { src: '/screenshots/الكترونيات.PNG', label: 'الكترونيات' },
  { src: '/screenshots/جملة.PNG', label: 'جملة' },
  { src: '/screenshots/خضر وفواكه.PNG', label: 'خضر وفواكه' },
  { src: '/screenshots/خدمات صالونات عياديات.PNG', label: 'خدمات' },
  { src: '/screenshots/reparation.PNG', label: 'صيانة' },
  { src: '/screenshots/بائع متجول.PNG', label: 'بائع متجول' },
  { src: '/screenshots/محاسبة وفواتير.PNG', label: 'محاسبة' },
  { src: '/screenshots/امتياز وفروع.PNG', label: 'امتياز وفروع' },
]

export default function HeroSection() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const login = useAuthStore(s => s.login)
  const [current, setCurrent] = useState(0)
  const [lightbox, setLightbox] = useState(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % screenshots.length)
    }, 3000)
    return () => clearInterval(timerRef.current)
  }, [])

  const openLightbox = (index) => {
    setLightbox(index)
    clearInterval(timerRef.current)
  }

  const closeLightbox = () => {
    setLightbox(null)
  }

  const prevLightbox = (e) => {
    e.stopPropagation()
    setLightbox((prev) => (prev - 1 + screenshots.length) % screenshots.length)
  }

  const nextLightbox = (e) => {
    e.stopPropagation()
    setLightbox((prev) => (prev + 1) % screenshots.length)
  }

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950/20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -end-40 w-96 h-96 bg-emerald-200/30 dark:bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -start-40 w-80 h-80 bg-emerald-300/20 dark:bg-emerald-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/3 start-1/4 w-64 h-64 bg-emerald-100/20 dark:bg-emerald-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-start">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight"
            >
              {t('landing.hero.title')}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
              className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed"
            >
              {t('landing.hero.subtitle')}
            </motion.p>

            {/* Login form */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease: 'easeOut' }}
              onSubmit={async (e) => {
                e.preventDefault()
                if (!loginEmail || !loginPassword) return
                setLoginLoading(true)
                const result = await login(loginEmail, loginPassword)
                setLoginLoading(false)
                if (result.success) {
                  navigate('/app/')
                } else {
                  toast.error(result.error || t('common.error'))
                }
              }}
              className="mt-6 w-full max-w-sm mx-auto lg:mx-0"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                <div className="relative">
                  <EnvelopeIcon className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder={t('auth.email')}
                    className="w-full h-11 pe-4 ps-10 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                    dir="ltr"
                    required
                  />
                </div>
                <div className="relative">
                  <LockClosedIcon className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder={t('auth.password')}
                    className="w-full h-11 pe-4 ps-10 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                    dir="ltr"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full h-11 inline-flex items-center justify-center gap-2 text-base font-semibold text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-xl transition-colors"
                >
                  <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
                  {loginLoading ? t('common.loading') : t('landing.hero.ctaLogin')}
                </button>
              </div>
            </motion.form>

            {/* Register + Demo buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' }}
              className="mt-4 flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start"
            >
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-colors shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
              >
                {t('landing.hero.ctaStart')}
              </Link>
              <Link
                to="/demo"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-500 rounded-xl transition-colors shadow-sm"
              >
                {t('landing.hero.ctaDemo')}
              </Link>
            </motion.div>

            {/* Download links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
              className="mt-4 flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start"
            >
              <Link
                to="/download"
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                {t('landing.hero.ctaDownload')}
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 aspect-[4/3]">
              {screenshots.map((img, index) => (
                <button
                  key={index}
                  onClick={() => openLightbox(index)}
                  className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer"
                  style={{ opacity: index === current ? 1 : 0 }}
                >
                  <img
                    src={img.src}
                    alt={img.label}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
              <div className="absolute bottom-3 start-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg px-3 py-1.5">
                <p className="text-gray-800 dark:text-gray-200 text-xs font-medium">{screenshots[current].label}</p>
              </div>
              <div className="absolute bottom-3 end-3 flex gap-1.5">
                {screenshots.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrent(index)}
                    className={`w-2 h-2 rounded-full transition-all ${index === current ? 'bg-emerald-500 w-4' : 'bg-white/60 hover:bg-white/80'}`}
                  />
                ))}
              </div>
            </div>
            <div className="absolute -bottom-4 -end-4 w-24 h-24 bg-emerald-400/20 rounded-full blur-2xl" />
            <div className="absolute -top-4 -start-4 w-20 h-20 bg-emerald-300/20 rounded-full blur-2xl" />
          </motion.div>
        </div>
      </div>
{lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 end-4 z-10 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          <button
            onClick={prevLightbox}
            className="absolute start-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <ChevronLeftIcon className="h-8 w-8" />
          </button>

          <img
            src={screenshots[lightbox].src}
            alt={screenshots[lightbox].label}
            className="max-h-[90vh] max-w-[95vw] rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            onClick={nextLightbox}
            className="absolute end-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <ChevronRightIcon className="h-8 w-8" />
          </button>

          <div className="absolute bottom-6 start-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
            <p className="text-white text-sm font-medium">{screenshots[lightbox].label}</p>
          </div>
        </div>
      )}
    </section>
  )
}
