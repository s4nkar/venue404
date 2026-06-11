import { createClient } from '../client'

export type Notification = {
  id: string
  user_id: string
  booking_id: string | null
  type: string
  title: string
  body: string
  read_at: string | null
  created_at: string
}

export const notificationEndpoints = (client: ReturnType<typeof createClient>) => ({
  list: () => client.get<Notification[]>('/api/notifications/'),
  markRead: (id: string) => client.patch<void>(`/api/notifications/${id}/read`, {}),
})
