import { createClient } from '../client'

export const venueEndpoints = (client: ReturnType<typeof createClient>) => ({
  getVenueCategories: () => client.get<import('./adminCategories').VenueCategory[]>('/api/venues/categories'),
  getVenue: (id: string) => client.get<any>(`/api/venues/${id}`),
  createVenue: (body: unknown) => client.post<any>('/api/venues/', body),
  updateVenue: (id: string, body: unknown) => client.patch<any>(`/api/venues/${id}`, body),
  addVenuePhoto: (id: string, body: FormData) => client.post<any>(`/api/venues/${id}/photos`, body),
  deleteVenuePhoto: (venueId: string, photoId: string) => client.delete<any>(`/api/venues/${venueId}/photos/${photoId}`),
  bulkUpdateVenuePhotos: (id: string, body: unknown) => client.put<any>(`/api/venues/${id}/photos/bulk-update`, body),
  getMyVenues: () => client.get<any[]>('/api/venues/my/venues'),
  getMyVenue: (id: string) => client.get<any>(`/api/venues/my/venues/${id}`),
  getVenueBookings: (id: string) => client.get<any[]>(`/api/venues/${id}/bookings`),
  getPendingVenueBookings: (id: string) => client.get<any[]>(`/api/venues/${id}/bookings/pending`),
  updateCancellationPolicy: (id: string, body: unknown) => client.put<any>(`/api/venues/${id}/cancellation-policy`, body),
  getPlatformAmenities: () => client.get<any[]>('/api/venues/amenities'),
  updateVenueAmenities: (id: string, body: unknown) => client.put<any>(`/api/venues/${id}/amenities`, body),
  getVenueAvailability: (id: string) => client.get<any[]>(`/api/venues/${id}/availability`),
  bulkUpdateVenueAvailability: (id: string, body: unknown) => client.put<any[]>(`/api/venues/${id}/availability`, body),
  getBlockedDates: (id: string) => client.get<any[]>(`/api/venues/${id}/blocked-dates`),
  createBlockedDate: (id: string, body: unknown) => client.post<any>(`/api/venues/${id}/blocked-dates`, body),
  deleteBlockedDate: (venueId: string, blockedId: string) => client.delete<any>(`/api/venues/${venueId}/blocked-dates/${blockedId}`),
  submitVenue: (id: string) => client.post<any>(`/api/venues/${id}/submit`, {}),
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

