import { createClient } from '../client'

export const bookingEndpoints = (client: ReturnType<typeof createClient>) => ({
  getBooking: (id: string) => client.get<unknown>(`/api/bookings/${id}`),
  createBooking: (body: unknown) => client.post<unknown>('/api/bookings/', body),
})
