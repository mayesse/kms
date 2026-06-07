import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../stores/authStore'
import FormInput from '../../components/FormInput'
import { useTranslation } from 'react-i18next'
import { getAppSource } from '../../lib/adapters/storageConfig'

export default function LoginRegisterScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const isLoading = useAuthStore((s) => s.isLoading)
  const [tab, setTab] = useState('login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [storeName, setStoreName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('+213')

  const formatPhone = (value) => {
    const cleaned = value.replace(/[^\d+]/g, '')
    if (!cleaned.startsWith('+213')) return '+213'
    const digits = cleaned.slice(4).replace(/\D/g, '').slice(0, 9)
    let formatted = '+213'
    for (let i = 0; i < digits.length; i++) {
      if (i === 2 || i === 5) formatted += ' '
      formatted += digits[i]
    }
    return formatted
  }
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const appSource = getAppSource()

  const validateLogin = () => {
    const errors = {}
    if (!email.trim()) errors.email = t('auth.emailRequired')
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = t('auth.invalidEmail')
    if (!password) errors.password = t('auth.passwordRequired')
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateRegister = () => {
    const errors = {}
    if (!storeName.trim()) errors.storeName = t('auth.storeNameRequired')
    if (!email.trim()) errors.email = t('auth.emailRequired')
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = t('auth.invalidEmail')
    if (!phone.trim()) errors.phone = t('auth.phoneRequired')
    if (!password) errors.password = t('auth.passwordRequired')
    else if (password.length < 6) errors.password = t('auth.passwordMinLength')
    if (!confirmPassword) errors.confirmPassword = t('auth.confirmPasswordRequired')
    else if (password !== confirmPassword) errors.confirmPassword = t('auth.passwordsNotMatch')
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    if (!validateLogin()) return
    const result = await login(email, password)
    if (result.success) {
      navigate('/', { replace: true })
    } else {
      setError(result.error || t('common.error'))
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (!validateRegister()) return
    const result = await register(email, password, storeName, ownerName, phone, appSource)
    if (result.success) {
      if (result.needsEmailConfirm) {
        setError(t('auth.accountCreatedCheckEmail'))
      } else {
        navigate('/', { replace: true })
      }
    } else {
      setError(result.error || t('common.error'))
    }
  }

  const switchTab = (newTab) => {
    setTab(newTab)
    setError('')
    setFieldErrors({})
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col" dir="rtl">
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex-1 -mt-6 bg-white dark:bg-gray-800 rounded-t-3xl px-6 pt-8"
      >
        <div className="flex rounded-xl bg-gray-100 dark:bg-gray-700 p-1 mb-6">
          <button
            onClick={() => switchTab('login')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
              tab === 'login'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-50 shadow-sm'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {t('auth.login')}
          </button>
          <button
            onClick={() => switchTab('register')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
              tab === 'register'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-50 shadow-sm'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {t('auth.register')}
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg px-4 py-3 mb-4 text-center">
            {error}
          </div>
        )}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <FormInput
              label={t('auth.email')}
              value={email}
              onChange={setEmail}
              type="email"
              required
              autoFocus
              dir="ltr"
              error={fieldErrors.email}
            />
            <FormInput
              label={t('auth.password')}
              value={password}
              onChange={setPassword}
              type="password"
              required
              dir="ltr"
              error={fieldErrors.password}
            />
            <button type="submit" disabled={isLoading} className="btn-primary mt-6">
              {isLoading ? t('common.loading') : t('auth.loginBtn')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <FormInput
              label={t('auth.storeName')}
              value={storeName}
              onChange={setStoreName}
              required
              autoFocus
              error={fieldErrors.storeName}
            />
            <FormInput
              label={t('auth.ownerName')}
              value={ownerName}
              onChange={setOwnerName}
            />
            <FormInput
              label={t('auth.email')}
              value={email}
              onChange={setEmail}
              type="email"
              required
              dir="ltr"
              error={fieldErrors.email}
            />
            <FormInput
              label={t('auth.phoneNumber')}
              value={phone}
              onChange={(v) => setPhone(formatPhone(v))}
              type="tel"
              required
              dir="ltr"
              error={fieldErrors.phone}
            />
            <FormInput
              label={t('auth.password')}
              value={password}
              onChange={setPassword}
              type="password"
              required
              dir="ltr"
              error={fieldErrors.password}
            />
            <FormInput
              label={t('auth.confirmPassword')}
              value={confirmPassword}
              onChange={setConfirmPassword}
              type="password"
              required
              dir="ltr"
              error={fieldErrors.confirmPassword}
            />
            <button type="submit" disabled={isLoading} className="btn-primary mt-6">
              {isLoading ? t('common.loading') : t('auth.registerBtn')}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}
