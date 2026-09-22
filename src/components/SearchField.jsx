import { useRef } from 'react'
import { Search, X } from 'lucide-react'

export default function SearchField({
  value,
  onValueChange,
  label,
  placeholder,
  className = '',
  ...inputProps
}) {
  const input = useRef(null)
  return (
    <div className={`search-field ${className}`}>
      <Search size={18} className="search-field-icon" aria-hidden="true" />
      <input
        {...inputProps}
        ref={input}
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
      {value && (
        <button
          type="button"
          className="search-field-clear"
          aria-label={`Clear ${label.toLowerCase()}`}
          onClick={() => {
            onValueChange('')
            input.current?.focus({ preventScroll: true })
          }}
        >
          <X size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
