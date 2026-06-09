import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

export default function FloatingDemoButton() {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 260, damping: 20 }}
      className="fixed bottom-6 end-6 z-40"
    >
      <Link
        to="/demo"
        className="flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all"
      >
        <span className="w-2 h-2 rounded-full bg-white animate-ping absolute -top-1 -end-1" />
        <span>{t('landing.hero.ctaDemo')}</span>
      </Link>
    </motion.div>
  )
}
