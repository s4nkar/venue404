import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import {
  createClient,
  bookingEndpoints,
} from '@venue404/api-client'

import type {
  BookingOut,
  CancellationPreviewOut,
} from '../../types'

import {
  formatPrice,
} from '../../utils'

type Props = {
  booking: BookingOut
  open: boolean
  onClose: () => void
}

export function CancellationPreviewModal({
  booking,
  open,
  onClose,
}: Props) {
  const client = createClient()

  const queryClient =
    useQueryClient()

  const previewQuery = useQuery({
    queryKey: [
      'cancel-preview',
      booking.id,
    ],

    queryFn: () =>
      bookingEndpoints(client)
        .getCancellationPreview(
          booking.id,
        ),

    enabled: open,
  })

  const cancelMutation =
    useMutation({
      mutationFn: () =>
        bookingEndpoints(client)
          .cancelBooking(
            booking.id,
          ),

      onSuccess: async () => {
        await queryClient.invalidateQueries(
          {
            queryKey: [
              'booking',
              booking.id,
            ],
          },
        )

        onClose()
      },
    })

  if (!open) {
    return null
  }

  const preview =
    previewQuery.data as
      | CancellationPreviewOut
      | undefined

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-xl">
          {/* Header */}
          <div className="border-b border-zinc-100 px-6 py-5">
            <h2 className="text-lg font-semibold text-zinc-900">
              Cancel Booking
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Review refund details
              before confirming.
            </p>
          </div>

          {/* Body */}
          <div className="p-6">
            {previewQuery.isLoading && (
              <div className="space-y-4">
                <div className="h-16 rounded-xl bg-zinc-100 animate-pulse" />
                <div className="h-16 rounded-xl bg-zinc-100 animate-pulse" />
                <div className="h-16 rounded-xl bg-zinc-100 animate-pulse" />
              </div>
            )}

            {previewQuery.isError && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="text-sm text-red-700">
                  Unable to calculate
                  cancellation refund.
                </p>
              </div>
            )}

            {preview && (
              <div className="space-y-4">
                <div className="rounded-xl bg-green-50 border border-green-100 p-4">
                  <div className="text-sm text-green-700">
                    Refund Amount
                  </div>

                  <div className="mt-1 text-2xl font-bold text-green-900">
                    {formatPrice(
                      preview.refund_amount_paise,
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-red-50 border border-red-100 p-4">
                  <div className="text-sm text-red-700">
                    Cancellation Fee
                  </div>

                  <div className="mt-1 text-2xl font-bold text-red-900">
                    {formatPrice(
                      preview.penalty_amount_paise,
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4">
                  <div className="text-sm text-zinc-500">
                    Applicable Policy
                  </div>

                  <div className="mt-1 font-medium text-zinc-900">
                    {preview.tier_matched ??
                      'No matching tier'}
                  </div>
                </div>

                <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                  <p className="text-sm text-amber-800">
                    This action cannot
                    be undone. Your
                    booking will be
                    cancelled
                    immediately.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-100 px-6 py-5">
            <button
              onClick={onClose}
              disabled={
                cancelMutation.isPending
              }
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Keep Booking
            </button>

            <button
              onClick={() =>
                cancelMutation.mutate()
              }
              disabled={
                cancelMutation.isPending
              }
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {cancelMutation.isPending
                ? 'Cancelling...'
                : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
