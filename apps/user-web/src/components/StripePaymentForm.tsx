import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { Button, Alert } from '@venue404/ui'

// Loaded once and reused across mounts.
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!,
)

type Props = {
  clientSecret: string
  /** Amount label shown on the pay button, e.g. "₹5,000". */
  payLabel: string
  onSuccess: () => void
  onCancel: () => void
}

function InnerCheckoutForm({
  payLabel,
  onSuccess,
  onCancel,
}: Props) {
  const stripe = useStripe()
  const elements = useElements()

  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      setError('Payment system not ready')
      return
    }

    setProcessing(true)
    setError(null)

    // `redirect: 'if_required'` keeps the SPA in control so we can route to
    // the result page ourselves and poll for the webhook to flip the booking
    // to fully_paid / confirmed.
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    setProcessing(false)

    if (stripeError) {
      setError(stripeError.message || 'Payment failed')
    } else {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* The PaymentElement adapts to whatever payment methods are enabled in
          the Stripe dashboard (cards, UPI, wallets) for the intent currency. */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="flex gap-3">
        <Button
          type="submit"
          variant="primary"
          disabled={!stripe || processing}
          className="flex-1 py-3.5"
        >
          {processing ? 'Processing…' : `Pay ${payLabel}`}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={processing}
          className="flex-1 py-3.5"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function StripePaymentForm(props: Props) {
  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret: props.clientSecret }}
    >
      <InnerCheckoutForm {...props} />
    </Elements>
  )
}
