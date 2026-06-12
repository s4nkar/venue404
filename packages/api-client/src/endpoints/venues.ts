import { createClient } from '../client'

export const venueEndpoints = (client: ReturnType<typeof createClient>) => ({
  getVenue: (id: string) => client.get<any>(`/api/venues/${id}`),
  createVenue: (body: unknown) => client.post<any>('/api/venues/', body),
  search: (params: Record<string, any>) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return client.get<any>(`/api/search/?${qs}`)
  },
  getCancellationPolicy: (id: string) =>
    client.get<any>(`/api/venues/${id}/cancellation-policy`),
  getCalendar: (id: string, params: { start_date: string; end_date: string }) => {
    const qs = new URLSearchParams(params).toString()
    return client.get<any>(`/api/availability/venues/${id}/calendar?${qs}`)
  },
  getDateAvailability: (id: string, booking_date: string) =>
    client.get<any>(`/api/availability/venues/${id}/date/${booking_date}`),
  getQuote: (id: string, params: { starts_at: string; ends_at: string; booking_type: string }) => {
    const qs = new URLSearchParams(params).toString()
    return client.get<any>(`/api/availability/venues/${id}/quote?${qs}`)
  },
  validateSlot: (
    id: string,
    params: {
      booking_type: string
      starts_at?: string | null
      ends_at?: string | null
      booking_date?: string | null
      guest_count?: number
    }
  ) => {
    const query: Record<string, string> = {}
    if (params.starts_at) query.starts_at = params.starts_at
    if (params.ends_at) query.ends_at = params.ends_at
    if (params.booking_date) query.booking_date = params.booking_date
    if (params.guest_count) query.guest_count = String(params.guest_count)
    const qs = new URLSearchParams(query).toString()
    return client.post<any>(
      `/api/availability/venues/${id}/validate?booking_type=${params.booking_type}&${qs}`,
      {}
    )
  },
})

