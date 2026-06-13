import { createClient } from '../client'

export const bookingEndpoints = (client: ReturnType<typeof createClient>) => ({
  getBooking: (id: string) => client.get<any>(`/api/bookings/${id}`),
  createBooking: (body: unknown) => client.post<any>('/api/bookings/', body),
  listBookings: () => client.get<any[]>('/api/bookings/'),
  getCancellationPreview: (bookingId: string) =>
    client.get<any>(`/api/bookings/${bookingId}/cancellation-preview`),
  cancelBooking: (bookingId: string) =>
    client.post<any>(`/api/bookings/${bookingId}/cancel`, {}),
})

