import { cn } from '../../lib/utils'

export interface NotificationView {
  id: string
  title: string
  body: string
  read_at: string | null
  created_at: string
}

interface NotificationItemProps {
  notification: NotificationView
  onRead?: (id: string) => void
}

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const unread = notification.read_at == null
  return (
    <button
      type="button"
      onClick={() => unread && onRead?.(notification.id)}
      className={cn(
        'flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left transition-colors',
        unread ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-zinc-50',
      )}
    >
      <div className="flex w-full items-center gap-2">
        {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden />}
        <span className={cn('text-sm', unread ? 'font-semibold' : 'font-medium text-zinc-700')}>
          {notification.title}
        </span>
      </div>
      <span className="text-xs text-zinc-500">{notification.body}</span>
    </button>
  )
}
