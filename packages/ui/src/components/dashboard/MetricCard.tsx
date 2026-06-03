import { cn } from '../../lib/utils'

export type MetricCardAccent = 'blue' | 'amber' | 'emerald' | 'violet' | 'rose'

const accentMap: Record<MetricCardAccent, { icon: string; value: string; badge: string }> = {
  blue:    { icon: 'bg-blue-50 text-blue-600',    value: 'text-zinc-900', badge: 'bg-blue-50 text-blue-600' },
  amber:   { icon: 'bg-amber-50 text-amber-600',  value: 'text-zinc-900', badge: 'bg-amber-50 text-amber-600' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', value: 'text-zinc-900', badge: 'bg-emerald-50 text-emerald-600' },
  violet:  { icon: 'bg-violet-50 text-violet-600', value: 'text-zinc-900', badge: 'bg-violet-50 text-violet-600' },
  rose:    { icon: 'bg-rose-50 text-rose-600',    value: 'text-zinc-900', badge: 'bg-rose-50 text-rose-600' },
}

export type DashboardMetric = {
  label: string
  value: string
  description?: string
  trend?: string
  trendUp?: boolean
  icon?: React.ReactNode
  accent?: MetricCardAccent
}

type MetricCardProps = DashboardMetric & {
  className?: string
  onClick?: () => void
}

export function MetricCard({
  label,
  value,
  description,
  trend,
  trendUp,
  icon,
  accent = 'blue',
  className,
  onClick,
}: MetricCardProps) {
  const colors = accentMap[accent]

  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-200 bg-white p-5 shadow-sm',
        onClick && 'cursor-pointer transition-shadow duration-150 hover:shadow-md press',
        className,
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500">{label}</p>
          <p className={cn('mt-2 text-2xl font-semibold tabular-nums tracking-tight', colors.value)}>
            {value}
          </p>
          {description && (
            <p className="mt-0.5 text-xs text-zinc-400 truncate">{description}</p>
          )}
        </div>

        {icon && (
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', colors.icon)}>
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <svg
            className={cn('h-3.5 w-3.5', trendUp ? 'text-emerald-500' : 'text-red-500', !trendUp && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          <span className={cn('text-xs font-medium', trendUp ? 'text-emerald-600' : 'text-red-600')}>
            {trend}
          </span>
        </div>
      )}
    </div>
  )
}
