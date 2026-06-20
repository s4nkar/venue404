import { ReactNode } from 'react'
import { cn } from './lib/utils'

type Variant = 'success' | 'destructive' | 'warning' | 'info'

interface AlertProps {
  children: ReactNode
  variant?: Variant
  className?: string
}

const variantStyles: Record<Variant, string> = {
  success: 'bg-emerald-50 border-emerald-100 text-emerald-700',
  destructive: 'bg-red-50 border-red-100 text-red-700',
  warning: 'bg-amber-50 border-amber-100 text-amber-700',
  info: 'bg-zinc-50 border-zinc-100 text-zinc-700',
}

export default function Alert({ children, variant = 'info', className = '' }: AlertProps) {
  return (
    <div className={cn('rounded-xl border px-4 py-4 text-sm', variantStyles[variant], className)}>
      {children}
    </div>
  )
}
