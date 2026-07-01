export type { VenueCategory } from './endpoints/adminCategories'

export interface VenuePhoto {
  id: string
  image_url: string
  sort_order: number
  is_cover: boolean
}

export interface Amenity {
  id: string
  name: string
  icon: string | null
}

export interface CancellationPolicy {
  tier_1_hours?: number | null
  tier_1_refund_pct?: number | null
  tier_2_hours?: number | null
  tier_2_refund_pct?: number | null
  tier_3_hours?: number | null
  tier_3_refund_pct?: number | null
  no_show_refund_pct?: number
  platform_fee_refundable?: boolean
  notes?: string | null
}

export interface Venue {
  id: string
  name: string
  slug?: string
  description?: string | null
  status: string
  is_active?: boolean
  category?: { id: string; slug?: string; label: string; icon?: string | null; banner_image?: string | null } | null
  category_id?: string
  photos?: VenuePhoto[]
  amenities?: Amenity[]
  address_line1?: string | null
  address_line2?: string | null
  city?: string
  state?: string
  country?: string
  postal_code?: string | null
  latitude?: number | null
  longitude?: number | null
  timezone?: string
  min_capacity?: number | null
  max_capacity?: number
  open_time?: string
  close_time?: string
  spans_next_day?: boolean
  allowed_booking_types?: string[]
  min_booking_duration_minutes?: number
  max_booking_duration_minutes?: number
  slot_interval_minutes?: number
  pre_buffer_minutes?: number
  post_buffer_minutes?: number
  pricing_mode?: string
  starting_price_paise?: number | null
  hourly_rate_paise?: number | null
  advance_pct?: number
  balance_due_days_before_event?: number
  owner_action_window_hours?: number
  overdue_advance_refund_pct?: number
  cancellation_policy?: CancellationPolicy | null
  last_completed_step?: number
  rejection_reason?: string | null
  deleted_at?: string | null
}

export interface Booking {
  id: string
  venue_id: string
  venue_name?: string
  venue_cover_image?: string | null
  status: string
  payment_status?: string | null
  booking_type: string
  booking_date?: string | null
  starts_at?: string | null
  ends_at?: string | null
  guest_count?: number | null
  event_type?: string | null
  user_notes?: string | null
  owner_notes?: string | null
  user_id?: string
  user_full_name?: string | null
  user_email?: string | null
  hold_expires_at?: string | null
  created_at: string
  updated_at?: string | null
}

export interface VenueAvailability {
  day_of_week: number
  is_available: boolean
  opens_at: string | null
  closes_at: string | null
  spans_next_day: boolean
}

export interface BlockedDate {
  id: string
  starts_at: string
  ends_at: string
  reason: string | null
}
