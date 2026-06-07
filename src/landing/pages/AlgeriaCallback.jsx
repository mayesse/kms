import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { createTrial } from '../../repositories/trialRepository'

export default function AlgeriaCallback() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [status, setStatus] = useState('processing')

  useEffect(() => {
    async function handleCallback() {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) {
        setStatus('error')
        return
      }

      const { data: existing } = await supabase
        .from('store_profiles')
        .select('id')
        .eq('id', session.user.id)
        .single()

      if (!existing) {
        const { error: profileError } = await supabase.from('store_profiles').insert({
          id: session.user.id,
          store_name: session.user.email?.split('@')[0] || 'My Store',
          registration_method: 'google',
          business_type: 'retail',
          currency: 'DZD',
        })
        if (profileError) {
          setStatus('error')
          return
        }
        await createTrial(session.user.id)
      }

      setStatus('success')
      setTimeout(() => navigate('/app/onboarding/business-type'), 1500)
    }
    handleCallback()
  }, [navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="text-center">
        {status === 'processing' && (
          <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto" />
        )}
        {status === 'success' && (
          <>
            <span className="text-4xl">✅</span>
            <p className="mt-4 text-emerald-700 dark:text-emerald-300 font-medium">
              {t('onboarding.algeriaAdditional.accountReady')}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('onboarding.algeriaAdditional.accountReadyDesc')}
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <span className="text-4xl">❌</span>
            <p className="mt-4 text-red-600 dark:text-red-400 font-medium">Something went wrong</p>
            <button onClick={() => navigate('/register/algeria')} className="mt-4 text-emerald-600 hover:underline">
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  )
}
