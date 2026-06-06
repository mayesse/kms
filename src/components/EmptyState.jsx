import { motion } from 'framer-motion'

export default function EmptyState({ icon, title, subtitle, actionLabel, onAction }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 gap-4"
    >
      <div className="text-6xl text-gray-300 dark:text-gray-600">{icon || '📦'}</div>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
        {title}
      </h3>
      {subtitle && (
        <p className="text-sm text-gray-500 text-center max-w-xs">{subtitle}</p>
      )}
      {actionLabel && (
        <button onClick={onAction} className="btn-primary w-auto px-6">
          {actionLabel}
        </button>
      )}
    </motion.div>
  )
}
