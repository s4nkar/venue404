import type { BookingOut } from '../../types'

type Props = {
  booking: BookingOut
}

type TimelineStep = {
  label: string
  completed: boolean
}

export function BookingTimelineCard({
  booking,
}: Props) {
  const now = new Date()

  const eventStarted =
    now >= new Date(booking.starts_at)

  const advancePaid =
    booking.amount_paid_paise >=
    booking.advance_due_paise

  const acceptedStatuses = [
    'owner_accepted',
    'confirmed',
    'completed',
  ]

  const confirmedStatuses = [
    'confirmed',
    'completed',
  ]

  const steps: TimelineStep[] = [
    {
      label: 'Requested',
      completed: true,
    },

    {
      label: 'Accepted',
      completed:
        acceptedStatuses.includes(
          booking.status,
        ),
    },

    {
      label: 'Advance Paid',
      completed: advancePaid,
    },

    {
      label: 'Confirmed',
      completed:
        confirmedStatuses.includes(
          booking.status,
        ),
    },

    {
      label: 'Event Day',
      completed: eventStarted,
    },

    {
      label: 'Completed',
      completed:
        booking.status === 'completed',
    },
  ]

  const currentStepIndex =
    steps.findIndex(
      (step) => !step.completed,
    )

  return (
    <div className="rounded-2xl border border-zinc-200 shadow-sm bg-white p-6">
      <div className="space-y-8">
        <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
          Booking Timeline
        </div>

        <div className="space-y-0">
          {steps.map((step, index) => {
            const isCompleted =
              step.completed

            const isCurrent =
              index ===
              currentStepIndex

            const isLast =
              index ===
              steps.length - 1

            return (
              <div
                key={step.label}
                className="flex gap-4"
              >
                {/* Timeline rail */}
                <div className="flex flex-col items-center">
                  <div
                    className={[
                      'h-4 w-4 rounded-full transition-all',

                      isCompleted
                        ? 'bg-green-500'
                        : 'bg-zinc-200',

                      isCurrent
                        ? 'ring-4 ring-green-100'
                        : '',
                    ].join(' ')}
                  />

                  {!isLast && (
                    <div
                      className={[
                        'w-px flex-1 min-h-[48px]',

                        isCompleted
                          ? 'bg-green-200'
                          : 'bg-zinc-200',
                      ].join(' ')}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="pb-8">
                  <div
                    className={[
                      'font-medium',

                      isCompleted
                        ? 'text-zinc-900'
                        : 'text-zinc-500',
                    ].join(' ')}
                  >
                    {step.label}
                  </div>

                  <div className="mt-1 text-sm text-zinc-500">
                    {getStepDescription(
                      step.label,
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {booking.confirmed_at && (
          <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
            <div className="text-sm font-medium text-green-800">
              Booking confirmed
            </div>

            <div className="mt-1 text-xs text-green-700">
              Your booking has been
              confirmed and reserved.
            </div>
          </div>
        )}

        {booking.cancelled_at && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <div className="text-sm font-medium text-red-800">
              Booking cancelled
            </div>

            <div className="mt-1 text-xs text-red-700">
              This booking is no
              longer active.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function getStepDescription(
  label: string,
): string {
  switch (label) {
    case 'Requested':
      return 'Booking request submitted.'

    case 'Accepted':
      return 'Venue owner accepted the request.'

    case 'Advance Paid':
      return 'Advance payment received.'

    case 'Confirmed':
      return 'Booking reservation confirmed.'

    case 'Event Day':
      return 'Event date has arrived.'

    case 'Completed':
      return 'Booking lifecycle completed.'

    default:
      return ''
  }
}
