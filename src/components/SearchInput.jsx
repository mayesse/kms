import { forwardRef } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

const SearchInput = forwardRef(({ value, onChange, placeholder, autoFocus = false, onEnter }, ref) => {
  return (
    <div className="relative">
      <input
        ref={ref}
        className="w-full h-11 pe-10 ps-4 rounded-xl
                   border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-800 text-base
                   text-gray-900 dark:text-gray-50
                   focus:outline-none focus:ring-2 focus:ring-green-500
                   placeholder:text-gray-400"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) onEnter(e.target.value) }}
        autoFocus={autoFocus}
        dir="rtl"
      />
      <MagnifyingGlassIcon className="absolute end-3 top-3 h-5 w-5 text-gray-400" />
    </div>
  )
})

SearchInput.displayName = 'SearchInput'
export default SearchInput
