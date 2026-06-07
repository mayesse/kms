import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { createTrial } from '../../repositories/trialRepository'

function validateAlgerianPhone(phone) {
  const cleaned = phone.replace(/[\s\-\.]/g, '').replace(/^(\+213|00213|0)/, '')
  return /^[567]\d{7,8}$/.test(cleaned)
}

export default function AlgeriaFlow() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState('form')
  const [loading, setLoading] = useState(false)
  const [showGoogleWarning, setShowGoogleWarning] = useState(false)

  const [form, setForm] = useState({
    storeName: '',
    ownerName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    acceptTerms: false,
  })

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.storeName.trim() || !form.email.trim() || !form.password || !form.phone.trim()) {
      toast.error(t('onboarding.algeriaAdditional.phoneRequired'))
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (!validateAlgerianPhone(form.phone)) {
      toast.error(t('onboarding.algeriaAdditional.invalidPhone'))
      return
    }
    if (!form.acceptTerms) {
      toast.error('Please accept the terms and conditions')
      return
    }

    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            store_name: form.storeName,
            owner_name: form.ownerName || form.storeName,
            phone: form.phone,
            registration_method: 'email',
          },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('No user returned')

      const { error: profileError } = await supabase.from('store_profiles').insert({
        id: authData.user.id,
        store_name: form.storeName,
        owner_name: form.ownerName || form.storeName,
        phone: form.phone,
        registration_method: 'email',
        business_type: 'retail',
        currency: 'DZD',
      })

      if (profileError) throw profileError

      await createTrial(authData.user.id)

      toast.success(t('onboarding.algeriaAdditional.registrationSuccess'))
      navigate('/register/account-options')
    } catch (err) {
      toast.error(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setShowGoogleWarning(false)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/register/algeria/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (error) throw error
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-lg mx-auto px-4 py-12 sm:py-20">
        <Link
          to="/register"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-8 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          {t('common.back')}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-5xl block mb-5">🇩🇿</span>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('onboarding.algeria.title')}
          </h1>
          <p className="mt-3 text-gray-500 dark:text-gray-400 text-lg">
            {t('onboarding.algeria.subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-4" dir="rtl">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                اسم المتجر *
              </label>
              <input
                type="text"
                value={form.storeName}
                onChange={(e) => update('storeName', e.target.value)}
                placeholder="مثلاً: سوبرماركت السلام"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                اسم المالك
              </label>
              <input
                type="text"
                value={form.ownerName}
                onChange={(e) => update('ownerName', e.target.value)}
                placeholder="الاسم الكامل"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                البريد الإلكتروني *
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="مثال@example.com"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                dir="ltr"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                كلمة المرور *
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="6 أحرف على الأقل"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                dir="ltr"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                تأكيد كلمة المرور *
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                placeholder="أعد إدخال كلمة المرور"
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                dir="ltr"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                رقم الهاتف *
              </label>
              <div className="flex gap-2">
                <span className="inline-flex items-center px-4 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 text-sm font-medium shrink-0">
                  +213
                </span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="555 XX XX XX"
                  className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                  dir="ltr"
                  required
                />
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.acceptTerms}
                onChange={(e) => update('acceptTerms', e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                required
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                أوافق على{' '}
                <a href="#" className="text-emerald-600 dark:text-emerald-400 hover:underline">الشروط والأحكام</a>
                {' '}و{' '}
                <a href="#" className="text-emerald-600 dark:text-emerald-400 hover:underline">سياسة الخصوصية</a>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('onboarding.algeriaAdditional.creatingAccount')}
                </span>
              ) : (
                'إنشاء حساب ←'
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-50 dark:bg-gray-800 text-gray-400">
                {t('onboarding.algeriaAdditional.or')}
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowGoogleWarning(true)}
            className="w-full py-3 px-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {t('onboarding.algeriaAdditional.googleSignIn')}
          </button>

          <p className="text-center text-sm text-gray-500 mt-6 pb-4">
            لديك حساب؟
            <Link to="/app/auth/login" className="text-emerald-600 dark:text-emerald-400 font-semibold me-1">
              تسجيل الدخول
            </Link>
          </p>
        </motion.div>
      </div>

      {showGoogleWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6"
          >
            <span className="text-3xl block mb-3">⚠️</span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('onboarding.algeria.title')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {t('onboarding.algeriaAdditional.googleWarning')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowGoogleWarning(false)}
                className="flex-1 py-2.5 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleGoogleSignIn}
                className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors"
              >
                {t('onboarding.algeriaAdditional.googleSignIn')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
