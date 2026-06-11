import { createClient } from '../client'

export const venueEndpoints = (client: ReturnType<typeof createClient>) => ({
  getVenue: (id: string) => client.get<any>(`/api/venues/${id}`),
  createVenue: (body: unknown) => client.post<any>('/api/venues/', body),
  updateVenue: (id: string, body: unknown) => client.patch<any>(`/api/venues/${id}`, body),
  addVenuePhoto: (id: string, body: FormData) => client.post<any>(`/api/venues/${id}/photos`, body),
  deleteVenuePhoto: (venueId: string, photoId: string) => client.delete<any>(`/api/venues/${venueId}/photos/${photoId}`),
  bulkUpdateVenuePhotos: (id: string, body: unknown) => client.put<any>(`/api/venues/${id}/photos/bulk-update`, body),
  getMyVenues: () => client.get<any[]>('/api/venues/my/venues'),
  getMyVenue: (id: string) => client.get<any>(`/api/venues/my/venues/${id}`),
  updateCancellationPolicy: (id: string, body: unknown) => client.put<any>(`/api/venues/${id}/cancellation-policy`, body),
  getPlatformAmenities: () => client.get<any[]>('/api/venues/amenities'),
  updateVenueAmenities: (id: string, body: unknown) => client.put<any>(`/api/venues/${id}/amenities`, body),
  getBlockedDates: (id: string) => client.get<any[]>(`/api/venues/${id}/blocked-dates`),
  createBlockedDate: (id: string, body: unknown) => client.post<any>(`/api/venues/${id}/blocked-dates`, body),
  deleteBlockedDate: (venueId: string, blockedId: string) => client.delete<any>(`/api/venues/${venueId}/blocked-dates/${blockedId}`),
  submitVenue: (id: string) => client.post<any>(`/api/venues/${id}/submit`, {}),
  search: (params: Record<string, string | number>) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return client.get<any[]>(`/api/search/?${qs}`)
  },
})
