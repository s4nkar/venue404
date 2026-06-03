import { cn } from '../../lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600',
        className,
      )}
    >
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-white" aria-hidden="true">
        <path
          d="M2 6.5L8 2l6 4.5V14a1 1 0 01-1 1H3a1 1 0 01-1-1V6.5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M6 15v-5h4v5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

type LogoProps = {
  className?: string
  textClassName?: string
  showText?: boolean
  /** 'light' = dark text (for light backgrounds), 'dark' = white text (for dark backgrounds) */
  variant?: 'light' | 'dark'
}

export function Logo({ className, textClassName, showText = true, variant = 'light' }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <BrandMark />
      {showText && (
        <span
          className={cn(
            'text-[15px] font-semibold tracking-tight',
            variant === 'light' ? 'text-zinc-900' : 'text-white',
            textClassName,
          )}
        >
          Venue<span className="text-blue-500">404</span>
        </span>
      )}
    </div>
  )
}
