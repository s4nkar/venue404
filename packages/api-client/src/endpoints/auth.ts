import { createClient } from '../client'

export type AuthUser = {
  id: string
  email: string | null
  profile: {
    full_name: string | null
    phone: string | null
    avatar_url: string | null
    status: 'active' | 'suspended'
  }
  roles: string[]
}

export const authEndpoints = (client: ReturnType<typeof createClient>) => ({
  me: () => client.get<AuthUser>('/api/auth/me'),
})
