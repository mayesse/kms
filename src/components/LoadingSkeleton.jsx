export default function LoadingSkeleton({ count = 5, height = 'h-16' }) {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className={`${height} bg-gray-200 dark:bg-gray-700 rounded-xl`} />
      ))}
    </div>
  )
}
