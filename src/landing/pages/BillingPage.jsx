import { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function BillingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [form, setForm] = useState({
    companyName: '',
    address: '',
    email: '',
    phone: '',
    taxId: '',
  })

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.companyName.trim() || !form.address.trim() || !form.email.trim() || !form.phone.trim()) return
    const params = searchParams.toString()
    navigate(`/register/payment?${params}`)
  }

  const fields = [
    { key: 'companyName', type: 'text', required: true },
    { key: 'address', type: 'text', required: true },
    { key: 'email', type: 'email', required: true },
    { key: 'phone', type: 'tel', required: true },
    { key: 'taxId', type: 'text', required: false },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-lg mx-auto px-4 py-12 sm:py-20">
        <Link
          to="/register/subscribe"
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('onboarding.billing.title')}
          </h1>
          <p className="mt-3 text-gray-500 dark:text-gray-400 text-lg">
            {t('onboarding.billing.subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t(`onboarding.billing.${field.key}`)}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  type={field.type}
                  value={form[field.key]}
                  onChange={update(field.key)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow"
                  required={field.required}
                />
              </div>
            ))}
            <button
              type="submit"
              className="w-full py-3 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors shadow-sm mt-2"
            >
              {t('onboarding.billing.next')}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
