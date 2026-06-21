import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient, notificationEndpoints } from '@venue404/api-client'
import { Navbar } from '../components/Navbar'
import { NotificationList, LoadingScreen, ErrorState, Button, Card } from '@venue404/ui'

export default function Notifications() {
  const client = createClient()
  const queryClient = useQueryClient()

  const { data: notifications = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationEndpoints(client).list(),
    staleTime: 30 * 1000, // 30 seconds
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationEndpoints(client).markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <Navbar />
        <LoadingScreen />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-8">
          <ErrorState
            title="Failed to load notifications"
            message="We had trouble retrieving your notifications. Please try again."
            action={
              <Button onClick={() => void refetch()} variant="primary">
                Retry
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
              Notifications
            </h1>
            <p className="mt-2 text-zinc-500">
              Stay updated with booking requests, confirmations, and billing reminders.
            </p>
          </div>
        </div>

        <Card className="overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <NotificationList
            notifications={notifications}
            onRead={(id) => markReadMutation.mutate(id)}
            emptyLabel="No notifications yet. We'll update you here when things change!"
          />
        </Card>
      </div>
    </div>
  )
}
