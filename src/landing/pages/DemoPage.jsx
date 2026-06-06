import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { BUSINESS_TYPES } from '../../utils/businessTypes'
import { enterDemoMode, exitDemoMode } from '../hooks/useDemoMode'
import { useAuthStore } from '../../stores/authStore'

export default function DemoPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleStart = async () => {
    if (!selected) return
    setLoading(true)
    try {
      enterDemoMode(selected)
      await useAuthStore.getState().initialize()
      navigate('/app/', { replace: true })
    } catch (e) {
      toast.error(String(e))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <div className="text-5xl mb-3">👑</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            {t('businessTypes.title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            {t('demo.subtitle')}
          </p>
        </motion.div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto px-1">
          {BUSINESS_TYPES.map((bt) => (
            <motion.button
              key={bt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelected(selected === bt.id ? null : bt.id)}
              className={`w-full text-start p-4 rounded-2xl border-2 transition-all flex items-center gap-4
                ${selected === bt.id
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-md'
                  : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/80 hover:border-emerald-200 dark:hover:border-emerald-700'
                }`}
            >
              <span className="text-3xl shrink-0">{bt.icon}</span>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-50 text-sm">
                  {bt.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                  {bt.description}
                </p>
              </div>
              {selected === bt.id && (
                <span className="ms-auto shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">✓</span>
              )}
            </motion.button>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6 space-y-3">
          <button
            onClick={handleStart}
            disabled={!selected || loading}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('demo.loading')}
              </span>
            ) : (
              t('businessTypes.start')
            )}
          </button>
          <button onClick={() => navigate('/')} className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
            {t('common.cancel')}
          </button>
        </motion.div>
      </div>
    </div>
  )
}
