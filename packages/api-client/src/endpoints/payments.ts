import { createClient } from '../client'

export type PaymentIntent = {
  payment_id: string
  booking_id: string
  client_secret: string | null
  amount_paise: number
  currency: string
  status: string
}

export type CreatePaymentIntentRequest = {
  payment_type?: 'advance' | 'balance'
}

export type Payment = {
  id: string
  booking_id: string
  amount_paise: number
  currency: string
  status: string
  stripe_payment_intent_id: string
}

export type RefundResult = {
  booking_id: string
  refunded_paise: number
  status: string
}

export const paymentEndpoints = (client: ReturnType<typeof createClient>) => ({
  /** Create a Stripe PaymentIntent for a booking's token advance or balance. */
  createPaymentIntent: (bookingId: string, params: CreatePaymentIntentRequest) =>
    client.post<PaymentIntent>('/api/payments/', { booking_id: bookingId, payment_type: params.payment_type || 'advance' }),
  /** Owner/admin full refund of a booking's captured payment. */
  refund: (bookingId: string, reason?: string) =>
    client.post<RefundResult>('/api/payments/refund', { booking_id: bookingId, reason }),
  /** All payment attempts for a booking. */
  getByBooking: (bookingId: string) =>
    client.get<Payment[]>(`/api/payments/${bookingId}`),
})
