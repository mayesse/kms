export default function Card({ children, className = '', onClick }) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200
                  dark:border-gray-700 p-4 shadow-sm ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
