import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
}

export default function Input({ label, helperText, ...props }: InputProps) {
  return (
    <div>
      {label && <label>{label}{props.required && <span className="text-red-500 ml-1">*</span>}</label>}
      <input {...props} />
      {helperText && <p className="text-xs text-zinc-500 mt-1">{helperText}</p>}
    </div>
  )
}
