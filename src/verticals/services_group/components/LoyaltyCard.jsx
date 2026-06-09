import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

export default function LoyaltyCard({ customer = null, stamps = 0, requiredStamps = 10, reward = 'خدمة مجانية', onRedeem }) {
  const { t } = useTranslation()
  const progress = Math.min(stamps / requiredStamps, 1)

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 rounded-2xl p-4 text-white shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider opacity-80">بطاقة الولاء</p>
          <p className="text-lg font-bold">{customer?.name || 'العميل'}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">
          ⭐
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5 mb-3">
        {Array.from({ length: requiredStamps }, (_, i) => (
          <div key={i}
            className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
              i < stamps
                ? 'bg-white text-amber-600 shadow-md scale-100'
                : 'bg-white/20 text-white/40'
            }`}>
            {i < stamps ? '✓' : (i + 1)}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="opacity-80">{stamps} / {requiredStamps} طوابع</span>
        <span className="opacity-80">{Math.round(progress * 100)}%</span>
      </div>

      <div className="mt-2 h-1.5 rounded-full bg-white/20 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }}
          className="h-full rounded-full bg-white transition-all" />
      </div>

      {stamps >= requiredStamps && (
        <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          onClick={() => onRedeem?.()}
          className="mt-3 w-full py-2 rounded-xl bg-white text-amber-700 text-sm font-bold active:scale-95 transition-transform">
          استبدل: {reward}
        </motion.button>
      )}
    </motion.div>
  )
}
