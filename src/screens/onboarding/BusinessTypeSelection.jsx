import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { BUSINESS_TYPES } from '../../utils/businessTypes'
import { useTranslation } from 'react-i18next'

export default function BusinessTypeSelection() {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const setBusinessType = useAuthStore(s => s.setBusinessType)
  const navigate = useNavigate()

  const handleConfirm = async () => {
    if (!selected) return
    setSaving(true)
    const result = await setBusinessType(selected)
    setSaving(false)
    if (result.success) {
      toast.success(t('businessTypes.selected', { name: BUSINESS_TYPES.find(bt => bt.id === selected).label }))
      navigate('/app/', { replace: true })
    } else {
      toast.error(result.error || t('common.error'))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-900" dir="rtl">
      <div className="max-w-lg mx-auto px-4 pt-10 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="text-5xl mb-3">👑</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            {t('businessTypes.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
            {t('businessTypes.subtitle')}
          </p>
        </motion.div>

        <div className="space-y-3">
          {BUSINESS_TYPES.map((bt, i) => (
            <motion.button
              key={bt.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setSelected(bt.id)}
              className={`w-full text-start relative overflow-hidden rounded-2xl border-2 p-4 transition-all active:scale-[0.98] ${
                selected === bt.id
                  ? `${bt.borderLight} ${bt.bgLight} shadow-md`
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${bt.color} flex items-center justify-center text-2xl shadow-sm shrink-0`}>
                  {bt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base text-gray-900 dark:text-gray-50">{bt.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{bt.description}</p>
                </div>
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selected === bt.id ? 'border-green-600 bg-green-600' : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selected === bt.id && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              {selected === bt.id && (
                <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${bt.color} opacity-60`} />
              )}
            </motion.button>
          ))}
        </div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          onClick={handleConfirm}
          disabled={!selected || saving}
          className="btn-primary mt-6"
        >
          {saving ? t('common.loading') : t('businessTypes.start')}
        </motion.button>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
          {t('businessTypes.contactToChange')}
        </p>
      </div>
    </div>
  )
}

