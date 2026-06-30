import { useState, useRef, useEffect, useMemo } from 'react'
import type { ChangeEvent } from 'react'
import { ChevronDown, Clock } from 'lucide-react'

interface TimeSelectProps {
  label: string
  name: string
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  helperText?: string
}

export function TimeSelect({ label, name, value, onChange, required, helperText }: TimeSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Generate 30-min intervals
  const timeOptions = useMemo(() => {
    const options = []
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        // Format for backend (HH:mm:00)
        const hh = h.toString().padStart(2, '0')
        const mm = m.toString().padStart(2, '0')
        const backendValue = `${hh}:${mm}:00`

        // Format for display (hh:mm A)
        const ampm = h >= 12 ? 'PM' : 'AM'
        const displayH = h % 12 === 0 ? 12 : h % 12
        const displayHh = displayH.toString().padStart(2, '0')
        const displayLabel = `${displayHh}:${mm} ${ampm}`

        options.push({ value: backendValue, label: displayLabel })
      }
    }
    return options
  }, [])

  // Find currently selected label
  const selectedOption = timeOptions.find(o => {
    // value could be "09:00", "09:00:00"
    if (!value) return false
    return value.startsWith(o.value.slice(0, 5)) // match "09:00"
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Auto scroll to selected option on open
  useEffect(() => {
    if (isOpen && selectedOption && dropdownRef.current) {
      const dropdown = dropdownRef.current.querySelector('.dropdown-scroll-container')
      const selectedEl = dropdown?.querySelector('.selected-time') as HTMLElement
      if (dropdown && selectedEl) {
        // Scroll so selected is in middle
        dropdown.scrollTop = selectedEl.offsetTop - (dropdown.clientHeight / 2) + (selectedEl.clientHeight / 2)
      }
    }
  }, [isOpen, selectedOption])

  return (
    <div className="space-y-1 relative" ref={dropdownRef}>
      <label className="text-sm font-medium text-zinc-700 block mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {/* Hidden input for FormData compatibility */}
      <input type="hidden" name={name} value={value || ''} required={required} />

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 px-3 py-2 bg-white rounded-md border border-zinc-200 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-left transition-shadow"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-400" />
          <span className={selectedOption ? 'text-zinc-900 font-medium' : 'text-zinc-500'}>
            {selectedOption ? selectedOption.label : 'Select a time…'}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="dropdown-scroll-container absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-md shadow-lg max-h-[260px] overflow-y-auto">
          {timeOptions.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange({ target: { name, value: opt.value } } as unknown as ChangeEvent<HTMLInputElement>)
                setIsOpen(false)
              }}
              className={`px-3 py-2.5 cursor-pointer text-sm hover:bg-brand/5 hover:text-brand transition-colors ${
                selectedOption?.value === opt.value ? 'selected-time bg-brand/10 text-brand font-semibold' : 'text-zinc-700'
              }`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
      
      {helperText && <p className="text-xs text-zinc-500 mt-1">{helperText}</p>}
    </div>
  )
}
