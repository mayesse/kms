import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import FormInput from '../../components/FormInput'
import { useTranslation } from 'react-i18next'

export default function LoginScreen() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useAuthStore((s) => s.login)
  const isLoading = useAuthStore((s) => s.isLoading)
  const session = useAuthStore((s) => s.session)
  const navigate = useNavigate()

  useEffect(() => {
    if (session) navigate('/app/', { replace: true })
  }, [session, navigate])

  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await login(email, password)
    if (result.success) {
      navigate('/app/', { replace: true })
    } else {
      toast.error(result.error || t('common.error'))
    }
  }

  const handleGoogleSignIn = async () => {
    const result = await signInWithGoogle()
    if (result.success && result.url) {
      window.location.href = result.url
    } else {
      toast.error(t('auth.googleSignInFailed'))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col" dir="rtl">
      {/* Brand Header */}
      <div className="bg-green-600 pt-16 pb-12 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-5xl mb-3">👑</div>
          <h1 className="text-2xl font-bold text-white">{t('app.name')}</h1>
          <p className="text-green-100 text-sm mt-1">{t('auth.posSystem')}</p>
        </motion.div>
      </div>

      {/* Login Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex-1 -mt-6 bg-white dark:bg-gray-800 rounded-t-3xl px-6 pt-8"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-6">
          {t('auth.login')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label={t('auth.email')}
            value={email}
            onChange={setEmail}
            type="email"
            required
            autoFocus
            dir="ltr"
          />
          <FormInput
            label={t('auth.password')}
            value={password}
            onChange={setPassword}
            type="password"
            required
            dir="ltr"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary mt-6"
          >
            {isLoading ? t('common.loading') : t('auth.loginBtn')}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400">{t('auth.orDivider')}</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold text-sm active:scale-[0.98] transition-transform hover:bg-gray-50 dark:hover:bg-gray-750"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t('auth.googleLogin')}
        </button>

        <p className="text-center text-sm text-gray-500 mt-6">
          {t('auth.noAccount')}{' '}
          <Link to="/app/auth/register" className="text-green-600 font-semibold">
            {t('auth.registerBtn')}
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

