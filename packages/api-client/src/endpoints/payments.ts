import { createClient } from '../client'

export const paymentEndpoints = (client: ReturnType<typeof createClient>) => ({
  createPayment: (body: unknown) => client.post<unknown>('/api/payments/', body),
})
