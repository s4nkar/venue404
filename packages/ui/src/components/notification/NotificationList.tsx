import { NotificationItem, NotificationView } from './NotificationItem'

interface NotificationListProps {
  notifications: NotificationView[]
  onRead?: (id: string) => void
  emptyLabel?: string
}

export function NotificationList({ notifications, onRead, emptyLabel = 'No notifications yet' }: NotificationListProps) {
  if (notifications.length === 0) {
    return <p className="px-3 py-6 text-center text-sm text-zinc-400">{emptyLabel}</p>
  }
  return (
    <div className="flex flex-col gap-1">
      {notifications.map((n) => (
        <NotificationItem key={n.id} notification={n} onRead={onRead} />
      ))}
    </div>
  )
}
