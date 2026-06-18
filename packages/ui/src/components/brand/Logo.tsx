import brandIcon from '../../../../assets/branding/icon.png'
import { cn } from '../../lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={brandIcon}
      alt=""
      className={cn('h-5 w-5 shrink-0 object-contain', className)}
      aria-hidden="true"
    />
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
          Venue<span className="text-brand-secondary">404</span>
        </span>
      )}
    </div>
  )
}
