import { cn } from '../../lib/utils'

type ActivityItemProps = {
  title: string
  description?: string
  timestamp?: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  className?: string
}

export function ActivityItem({ title, description, timestamp, icon, badge, className }: ActivityItemProps) {
  return (
    <div className={cn('flex items-center gap-3 py-2.5', className)}>
      {icon && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-900 truncate">{title}</p>
          {badge}
        </div>
        {description && (
          <p className="text-xs text-zinc-400 truncate">{description}</p>
        )}
      </div>
      {timestamp && (
        <time className="shrink-0 text-[11px] text-zinc-400">{timestamp}</time>
      )}
    </div>
  )
}
