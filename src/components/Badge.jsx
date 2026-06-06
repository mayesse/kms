const variants = {
  success: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

export default function Badge({ children, variant = 'neutral', className = '' }) {
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
