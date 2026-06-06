import { createClient } from '../client'

export type AdminUserStatus = 'active' | 'suspended' | 'pending' | 'rejected'
export type AdminUserRole = 'customer' | 'venue_owner' | 'super_admin'

export type AdminUserSummary = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  status: AdminUserStatus
  roles: AdminUserRole[]
  created_at: string
  is_super_admin: boolean
}

export type AdminUserStats = {
  total: number
  active: number
  suspended: number
  pending: number
  rejected: number
}

export type OwnerApprovalBody = {
  reason?: string
}

export type AdminUserListResponse = {
  items: AdminUserSummary[]
  total: number
  page: number
  page_size: number
  total_pages: number
  stats: AdminUserStats
}

export type ListUsersParams = {
  page?: number
  page_size?: number
  search?: string
  status?: AdminUserStatus
  role?: AdminUserRole
}

export type SuspendUserBody = {
  reason: string
}

export type ReactivateUserBody = {
  reason?: string
}

function buildQS(params: ListUsersParams = {}): string {
  const qs = new URLSearchParams()
  if (params.page)      qs.set('page',      String(params.page))
  if (params.page_size) qs.set('page_size', String(params.page_size))
  if (params.search)    qs.set('search',    params.search)
  if (params.status)    qs.set('status',    params.status)
  if (params.role)      qs.set('role',      params.role)
  const str = qs.toString()
  return str ? `?${str}` : ''
}

export type AdminAction = {
  id: string
  admin_id: string
  action_type: string
  target_type: string
  target_id: string
  reason: string | null
  created_at: string
}

export type AdminActionListResponse = {
  items: AdminAction[]
  total: number
}

export const adminActionEndpoints = (client: ReturnType<typeof createClient>) => ({
  listActions: (params: { limit?: number; target_type?: string } = {}): Promise<AdminActionListResponse> => {
    const qs = new URLSearchParams()
    if (params.limit)       qs.set('limit',       String(params.limit))
    if (params.target_type) qs.set('target_type', params.target_type)
    const q = qs.toString()
    return client.get<AdminActionListResponse>(`/api/admin/actions${q ? `?${q}` : ''}`)
  },
})

export const adminUserEndpoints = (client: ReturnType<typeof createClient>) => ({
  listUsers: (params: ListUsersParams = {}): Promise<AdminUserListResponse> =>
    client.get<AdminUserListResponse>(`/api/admin/users${buildQS(params)}`),

  getUser: (userId: string): Promise<AdminUserSummary> =>
    client.get<AdminUserSummary>(`/api/admin/users/${userId}`),

  suspendUser: (userId: string, body: SuspendUserBody): Promise<void> =>
    client.patch<void>(`/api/admin/users/${userId}/suspend`, body),

  reactivateUser: (userId: string, body: ReactivateUserBody = {}): Promise<void> =>
    client.patch<void>(`/api/admin/users/${userId}/reactivate`, body),

  approveOwner: (userId: string, body: OwnerApprovalBody = {}): Promise<void> =>
    client.patch<void>(`/api/admin/venue-owners/${userId}/approve`, body),

  rejectOwner: (userId: string, body: OwnerApprovalBody = {}): Promise<void> =>
    client.patch<void>(`/api/admin/venue-owners/${userId}/reject`, body),
})
