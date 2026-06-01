import { createClient } from '../client'

export const authEndpoints = (client: ReturnType<typeof createClient>) => ({
  register: (body: { email: string; password: string; full_name: string }) =>
    client.post<{ access_token: string; token_type: string }>('/api/auth/register', body),
  login: (body: { email: string; password: string }) =>
    client.post<{ access_token: string; token_type: string }>('/api/auth/login', body),
})
