import { createClient } from '../client'

export const venueEndpoints = (client: ReturnType<typeof createClient>) => ({
  getVenue: (id: string) => client.get<unknown>(`/api/venues/${id}`),
  createVenue: (body: unknown) => client.post<unknown>('/api/venues/', body),
  search: (params: Record<string, string | number>) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return client.get<unknown[]>(`/api/search/?${qs}`)
  },
})
