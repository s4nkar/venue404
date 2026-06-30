import { createClient } from '../client'

export const bookingEndpoints = (client: ReturnType<typeof createClient>) => ({
  getBooking: (id: string) => client.get<any>(`/api/bookings/${id}`),
  createBooking: (body: unknown) => client.post<any>('/api/bookings/', body),
  listBookings: () => client.get<any[]>('/api/bookings/'),
  getOwnerBookings: (params?: { tab?: string, venue_id?: string, search?: string }) => {
    const qs = new URLSearchParams()
    if (params?.tab) qs.append('tab', params.tab)
    if (params?.venue_id) qs.append('venue_id', params.venue_id)
    if (params?.search) qs.append('search', params.search)
    const qsStr = qs.toString()
    return client.get<any[]>(`/api/bookings/owner${qsStr ? `?${qsStr}` : ''}`)
  },
  getCancellationPreview: (bookingId: string) =>
    client.get<any>(`/api/bookings/${bookingId}/cancellation-preview`),
  cancelBooking: (bookingId: string) =>
    client.post<any>(`/api/bookings/${bookingId}/cancel`, {}),
  acceptBooking: (bookingId: string) =>
    client.post<any>(`/api/bookings/${bookingId}/accept`, {}),
  rejectBooking: (bookingId: string, reason: string) =>
    client.post<any>(`/api/bookings/${bookingId}/reject`, { reason }),
  extendBalanceDeadline: (bookingId: string, new_due_date: string) =>
    client.post<any>(`/api/bookings/${bookingId}/extend-balance-deadline`, { new_due_date }),
  cancelForfeit: (bookingId: string) =>
    client.post<any>(`/api/bookings/${bookingId}/cancel-forfeit`, {}),
  cancelGoodwill: (bookingId: string) =>
    client.post<any>(`/api/bookings/${bookingId}/cancel-goodwill`, {}),
  updateOwnerNotes: (bookingId: string, notes: string | null) =>
    client.patch<any>(`/api/bookings/${bookingId}/owner-notes`, { notes }),
})

