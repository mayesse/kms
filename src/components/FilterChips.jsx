export default function FilterChips({ options, value, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all
                     active:scale-95 ${
                       value === option.value
                         ? 'bg-green-600 text-white'
                         : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                     }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
