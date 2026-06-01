import React from 'react'

interface DatePickerProps {
  value?: string
  onChange?: (value: string) => void
  label?: string
}

export default function DatePicker({ value, onChange, label }: DatePickerProps) {
  return (
    <div>
      {label && <label>{label}</label>}
      <input type="date" value={value} onChange={(e) => onChange?.(e.target.value)} />
    </div>
  )
}
