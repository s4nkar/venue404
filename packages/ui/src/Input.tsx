import React from 'react'
import { InfoTooltip } from './Tooltip'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string | React.ReactNode
  helperText?: string | React.ReactNode
  suffix?: string | React.ReactNode
  info?: string | React.ReactNode
}

export default function Input({ label, helperText, suffix, info, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="flex items-center text-sm font-medium text-zinc-700 mb-1">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
          {info && <InfoTooltip content={info} />}
        </label>
      )}
      <div className="relative">
        <input {...props} className={`w-full ${suffix ? 'pr-20' : ''} ${props.className || ''}`} />
        {suffix && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <span className="text-sm text-zinc-400 whitespace-nowrap">{suffix}</span>
          </div>
        )}
      </div>
      {helperText && <p className="text-xs text-zinc-500 mt-1">{helperText}</p>}
    </div>
  )
}
