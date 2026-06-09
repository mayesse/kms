export default function FormInput({
  label, value, onChange, type = 'text', placeholder = '', required = false,
  error, dir = 'rtl', disabled = false, autoFocus = false
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type={type}
        className="input-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => { if (type === 'number') e.target.select() }}
        step={type === 'number' ? 'any' : undefined}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoFocus={autoFocus}
        dir={dir}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
