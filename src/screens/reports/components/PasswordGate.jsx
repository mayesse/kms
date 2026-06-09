import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../stores/authStore'
import { useReportsStore } from '../../../stores/reportsStore'
import { settingsRepository } from '../../../repositories/settingsRepository'
import { LockClosedIcon } from '@heroicons/react/24/solid'
import { useTranslation } from 'react-i18next'

export default function PasswordGate() {
  const { t } = useTranslation()
  const storeId = useAuthStore(s => s.storeId)
  const setAuthenticated = useReportsStore(s => s.setAuthenticated)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const valid = await settingsRepository.verifyReportsPassword(storeId, password)
      if (valid) {
        setAuthenticated()
      } else {
        setShake(true)
        setTimeout(() => setShake(false), 500)
        toast.error(t('reports.passwordWrong'))
      }
    } catch {
      toast.error(t('common.error'))
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4" dir="rtl">
      <motion.div
        animate={shake ? { x: [0, -10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-full max-w-sm shadow-lg text-center"
      >
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <LockClosedIcon className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-6">{t('reports.passwordTitle')}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="input-field text-center text-2xl tracking-widest"
            autoFocus
            dir="ltr"
            placeholder="••••"
          />
          <button type="submit" disabled={loading || !password} className="btn-primary">
            {loading ? t('common.loading') : t('common.confirm')}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
