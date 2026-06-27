import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createClient, paymentEndpoints } from '@venue404/api-client'
import type { BookingOut, PaymentIntentResponse } from '../types'
import { Button, Alert } from '@venue404/ui'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!)

type Props = {
  booking: BookingOut
  paymentType?: 'advance' | 'balance'
  isFullPayment?: boolean
  onSuccess: () => void
  onCancel: () => void
}

function InnerCheckoutForm({
  booking,
  paymentType = 'advance',
  isFullPayment = false,
  onSuccess,
  onCancel,
}: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const queryClient = useQueryClient()

  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [succeeded, setSucceeded] = useState(false)

  const paymentMutation = useMutation({
    mutationFn: () =>
      paymentEndpoints(createClient()).createPaymentIntent(booking.id, {
        payment_type: paymentType,
      }),

    onSuccess: async (data: PaymentIntentResponse) => {
      if (!stripe || !elements || !data.client_secret) {
        setError('Payment system not ready')
        return
      }

      setProcessing(true)
      setError(null)

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        data.client_secret,
        { payment_method: { card: elements.getElement(CardElement)! } }
      )

      setProcessing(false)

      if (stripeError) {
        setError(stripeError.message || 'Payment failed')
      } else if (paymentIntent?.status === 'succeeded') {
        setSucceeded(true)
        queryClient.invalidateQueries({ queryKey: ['booking', booking.id] })
        onSuccess()
      }
    },
  })

  const buttonText = isFullPayment
    ? `Pay Full Amount • ${booking.display?.quoted_price || ''}`
    : paymentType === 'balance'
      ? `Pay Remaining Balance • ${booking.display?.balance_due || ''}`
      : `Pay Advance • ${booking.display?.advance_due || ''}`

  return (
    <div className="space-y-6 pt-2">
      <div className="border border-zinc-200 rounded-xl p-4 bg-white">
        <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}
      {succeeded && <Alert variant="success">Payment Successful!</Alert>}

      <div className="flex gap-3">
        <Button
          onClick={() => paymentMutation.mutate()}
          disabled={!stripe || processing || succeeded}
          className="flex-1"
        >
          {processing ? 'Processing...' : succeeded ? 'Payment Done' : buttonText}
        </Button>
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={processing || succeeded}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

export function PaymentForm(props: Props) {
  return (
    <Elements stripe={stripePromise}>
      <InnerCheckoutForm {...props} />
    </Elements>
  )
}
