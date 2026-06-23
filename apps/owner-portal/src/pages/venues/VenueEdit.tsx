import { useState, useEffect } from 'react'
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom'
import { Card, SectionHeader, Button, Input, LocationPickerMap } from '@venue404/ui'
import { ArrowLeft } from 'lucide-react'
import * as Icons from 'lucide-react'
import { createClient, venueEndpoints } from '@venue404/api-client'
import { INDIAN_STATES } from '../../lib/constants'
import { StateSelect } from '../../components/StateSelect'
import { DurationInput } from '../../components/DurationInput'
import { TimeSelect } from '../../components/TimeSelect'

export default function VenueEdit() {
  const { venueId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  
  const [venue, setVenue] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [localPhotos, setLocalPhotos] = useState<any[]>([])
  const [blockedDates, setBlockedDates] = useState<any[]>([])

  const [allowFullDay, setAllowFullDay] = useState(false)
  const [allowTimeSlot, setAllowTimeSlot] = useState(false)

  const [platformAmenities, setPlatformAmenities] = useState<any[]>([])
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [venueCategories, setVenueCategories] = useState<any[]>([])

  // E.g. /venues/123/edit/pricing -> 'pricing'
  const editSection = location.pathname.split('/').pop() || 'details'

  useEffect(() => {
    if (venue?.photos) {
      setLocalPhotos([...venue.photos].sort((a: any, b: any) => a.sort_order - b.sort_order))
    }
    if (venue?.allowed_booking_types) {
      setAllowFullDay(venue.allowed_booking_types.includes('full_day'))
      setAllowTimeSlot(venue.allowed_booking_types.includes('time_slot'))
    }
    if (venue?.amenities) {
      setSelectedAmenities(venue.amenities.map((a: any) => a.id))
    }
  }, [venue])

  useEffect(() => {
    async function loadAmenities() {
      if (editSection !== 'amenities') return
      try {
        const client = createClient()
        const data = await venueEndpoints(client).getPlatformAmenities()
        setPlatformAmenities(data)
      } catch (err) {
        console.error('Failed to load amenities', err)
      }
    }
    loadAmenities()
  }, [editSection])

  useEffect(() => {
    async function loadBlockedDates() {
      if (!venueId || location.pathname.split('/').pop() !== 'blocked-dates') return
      try {
        const client = createClient()
        const data = await venueEndpoints(client).getBlockedDates(venueId)
        setBlockedDates(data)
      } catch (err) {
        console.error("Failed to load blocked dates", err)
      }
    }
    loadBlockedDates()
  }, [venueId, location.pathname])

  const makeCover = (index: number) => {
    const newPhotos = [...localPhotos]
    const [item] = newPhotos.splice(index, 1)
    newPhotos.unshift(item)
    setLocalPhotos(newPhotos)
  }

  const movePhoto = (index: number, direction: number) => {
    const newPhotos = [...localPhotos]
    const item = newPhotos.splice(index, 1)[0]
    newPhotos.splice(index + direction, 0, item)
    setLocalPhotos(newPhotos)
  }

  const titleMap: Record<string, string> = {
    'details': 'Basic Details',
    'photos': 'Manage Photos',
    'amenities': 'Amenities',
    'operating-hours': 'Operating Hours',
    'booking-settings': 'Booking Settings',
    'pricing': 'Pricing',
    'policies': 'Cancellation Policies',
    'blocked-dates': 'Blocked Dates'
  }

  useEffect(() => {
    async function loadVenue() {
      if (!venueId) return
      try {
        const client = createClient()
        const data = await venueEndpoints(client).getMyVenue(venueId)
        setVenue(data)
      } catch (err) {
        console.error("Failed to fetch venue", err)
      } finally {
        setLoading(false)
      }
    }
    loadVenue()
  }, [venueId])

  useEffect(() => {
    async function loadCategories() {
      if (editSection !== 'details') return
      try {
        const client = createClient()
        const data = await venueEndpoints(client).getVenueCategories()
        setVenueCategories(data)
      } catch (err) {
        console.error('Failed to load categories', err)
      }
    }
    loadCategories()
  }, [editSection])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!venueId || !venue) return

    setSaving(true)
    const formData = new FormData(e.currentTarget)
    const updates: any = {}

    // Extract form data based on current section
    if (editSection === 'details') {
      const minCapStr = formData.get('min_capacity') as string
      const maxCapStr = formData.get('max_capacity') as string
      
      if (minCapStr && maxCapStr) {
        if (parseInt(minCapStr, 10) > parseInt(maxCapStr, 10)) {
          alert("Min Capacity cannot exceed Max Capacity.")
          setSaving(false)
          return
        }
      }

      updates.name = formData.get('name')
      updates.description = formData.get('description')
      updates.category_id = formData.get('category_id')
      updates.min_capacity = minCapStr ? parseInt(minCapStr, 10) : null
      updates.max_capacity = parseInt(maxCapStr, 10)
      updates.city = formData.get('city')
      updates.state = formData.get('state')
      updates.country = formData.get('country') || 'India'
      updates.postal_code = formData.get('postal_code')
      updates.latitude = venue.latitude
      updates.longitude = venue.longitude
      updates.address_line1 = formData.get('address_line1')
      updates.address_line2 = formData.get('address_line2')
    } else if (editSection === 'operating-hours') {
      const ot = formData.get('open_time') as string
      const ct = formData.get('close_time') as string
      const spansNextDay = formData.get('spans_next_day') === 'on'
      
      if (!spansNextDay) {
        if (ct <= ot) {
          alert("Closing time must be after opening time unless 'Closes next day' is checked.")
          setSaving(false)
          return
        }
      }

      updates.open_time = ot.split(':').length === 2 ? ot + ':00' : ot
      updates.close_time = ct.split(':').length === 2 ? ct + ':00' : ct
      updates.spans_next_day = spansNextDay
    } else if (editSection === 'booking-settings') {
      const allowFullDay = formData.get('allow_full_day') === 'on'
      const allowTimeSlot = formData.get('allow_time_slot') === 'on'
      
      const newAllowedTypes = []
      if (allowFullDay) newAllowedTypes.push('full_day')
      if (allowTimeSlot) newAllowedTypes.push('time_slot')

      if (newAllowedTypes.length === 0) {
        alert("You must allow at least one booking type.")
        setSaving(false)
        return
      }
      updates.allowed_booking_types = newAllowedTypes

      let calculatedPricingMode = 'mixed'
      if (allowFullDay && !allowTimeSlot) calculatedPricingMode = 'flat'
      if (!allowFullDay && allowTimeSlot) calculatedPricingMode = 'hourly'

      updates.pricing_mode = calculatedPricingMode

      const minDurStr = formData.get('min_booking_duration_minutes') as string
      const maxDurStr = formData.get('max_booking_duration_minutes') as string

      if (minDurStr && maxDurStr) {
        if (parseInt(minDurStr, 10) > parseInt(maxDurStr, 10)) {
          alert("Min Booking Duration cannot exceed Max Booking Duration.")
          setSaving(false)
          return
        }
      }

      updates.min_booking_duration_minutes = parseInt(minDurStr, 10)
      updates.max_booking_duration_minutes = parseInt(maxDurStr, 10)
      updates.slot_interval_minutes = parseInt(formData.get('slot_interval_minutes') as string, 10)
      updates.pre_buffer_minutes = parseInt(formData.get('pre_buffer_minutes') as string, 10)
      updates.post_buffer_minutes = parseInt(formData.get('post_buffer_minutes') as string, 10)
      updates.owner_action_window_hours = parseInt(formData.get('owner_action_window_hours') as string, 10)
    } else if (editSection === 'pricing') {
      updates.starting_price_paise = parseInt(formData.get('base_price') as string || '0', 10) * 100
      updates.hourly_rate_paise = parseInt(formData.get('hourly_rate') as string || '0', 10) * 100
      updates.advance_pct = parseFloat(formData.get('advance_pct') as string)
      updates.balance_due_days_before_event = parseInt(formData.get('balance_due') as string, 10)
    }

    try {
      const client = createClient()
      
      if (editSection === 'policies') {
        const t1h = formData.get('tier_1_hours') as string
        const t1p = formData.get('tier_1_refund_pct') as string
        const t2h = formData.get('tier_2_hours') as string
        const t2p = formData.get('tier_2_refund_pct') as string
        const t3h = formData.get('tier_3_hours') as string
        const t3p = formData.get('tier_3_refund_pct') as string

        // Pairing checks
        if ((t1h && !t1p) || (!t1h && t1p)) {
          alert("Tier 1: Hours and Refund % must both be filled or both be empty.")
          setSaving(false)
          return
        }
        if ((t2h && !t2p) || (!t2h && t2p)) {
          alert("Tier 2: Hours and Refund % must both be filled or both be empty.")
          setSaving(false)
          return
        }
        if ((t3h && !t3p) || (!t3h && t3p)) {
          alert("Tier 3: Hours and Refund % must both be filled or both be empty.")
          setSaving(false)
          return
        }

        // Descending checks
        const t1hv = t1h ? parseInt(t1h, 10) : null
        const t2hv = t2h ? parseInt(t2h, 10) : null
        const t3hv = t3h ? parseInt(t3h, 10) : null

        if (t1hv !== null && t2hv !== null && t1hv <= t2hv) {
          alert("Tier 1 hours must be strictly greater than Tier 2 hours.")
          setSaving(false)
          return
        }
        if (t2hv !== null && t3hv !== null && t2hv <= t3hv) {
          alert("Tier 2 hours must be strictly greater than Tier 3 hours.")
          setSaving(false)
          return
        }

        const policyPayload: any = {
          no_show_refund_pct: parseFloat(formData.get('no_show_refund_pct') as string || '0'),
          platform_fee_refundable: false,
          notes: formData.get('notes') as string || null,
        }
        
        if (t1h && t1p) {
          policyPayload.tier_1_hours = parseInt(t1h, 10)
          policyPayload.tier_1_refund_pct = parseFloat(t1p)
        }
        
        if (t2h && t2p) {
          policyPayload.tier_2_hours = parseInt(t2h, 10)
          policyPayload.tier_2_refund_pct = parseFloat(t2p)
        }
        
        if (t3h && t3p) {
          policyPayload.tier_3_hours = parseInt(t3h, 10)
          policyPayload.tier_3_refund_pct = parseFloat(t3p)
        }

        await venueEndpoints(client).updateCancellationPolicy(venueId, policyPayload)
        
        // Also update the overdue_advance_refund_pct which belongs to the venue
        const venueUpdates = {
          overdue_advance_refund_pct: parseFloat(formData.get('overdue_advance_refund_pct') as string || '0')
        }
        const updatedVenue = await venueEndpoints(client).updateVenue(venueId, venueUpdates)
        setVenue(updatedVenue)
      } else if (editSection === 'photos') {
        const payload = {
          photos: localPhotos.map((p, i) => ({
            photo_id: p.id,
            sort_order: i,
            is_cover: i === 0
          }))
        }
        await venueEndpoints(client).bulkUpdateVenuePhotos(venueId, payload)
        setVenue({ ...venue, photos: localPhotos })
      } else if (editSection === 'amenities') {
        await venueEndpoints(client).updateVenueAmenities(venueId, { amenity_ids: selectedAmenities })
        const currentPlatformAmenities = platformAmenities.length ? platformAmenities : []
        const updatedAmenities = selectedAmenities.map(id => currentPlatformAmenities.find(pa => pa.id === id)).filter(Boolean)
        setVenue({ ...venue, amenities: updatedAmenities })
      } else if (editSection === 'blocked-dates') {
        // Blocked dates are managed immediately via inline actions. No overarching save needed.
      } else {
        const updated = await venueEndpoints(client).updateVenue(venueId, updates)
        setVenue(updated)
      }
      
      // Navigate back to overview after success
      navigate(`/venues/${venueId}/overview`)
    } catch (err) {
      console.error("Failed to update venue", err)
      alert("Failed to save changes. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-zinc-500">Loading venue data...</div>
  }

  if (!venue) {
    return <div className="text-center py-12 text-zinc-500">Venue not found.</div>
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      <Link to={`/venues/${venueId}/overview`} className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Overview
      </Link>
      
      <SectionHeader 
        title={`Edit ${titleMap[editSection] || 'Venue'}`} 
        description="Update your venue settings below. Changes take effect immediately." 
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-8">
          
          {editSection === 'details' && (
            <div className="space-y-6">
              <Input label="Venue Name" name="name" defaultValue={venue.name} required />
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Venue Category<span className="text-red-500 ml-1">*</span></label>
                <select name="category_id" defaultValue={venue.category?.id} required
                  disabled={venueCategories.length === 0}
                  className="w-full h-10 px-3 py-2 rounded-md border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand disabled:opacity-50">
                  <option value="">{venueCategories.length === 0 ? 'Loading categories…' : 'Select a category…'}</option>
                  {venueCategories.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon ? `${cat.icon} ` : ''}{cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
                <textarea 
                  name="description"
                  rows={4}
                  defaultValue={venue.description || ''}
                  className="w-full px-3 py-2 rounded-md border border-zinc-200"
                />
              </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input label="Min Capacity" name="min_capacity" type="number" min={1} defaultValue={venue.min_capacity || ''} />
                  <Input label="Max Capacity" name="max_capacity" type="number" min={1} defaultValue={venue.max_capacity} required />
                </div>

              <div className="space-y-4 pt-4 border-t border-zinc-100">
                <h4 className="font-medium text-zinc-900">Location</h4>
                <Input label="Address Line 1" name="address_line1" value={venue.address_line1 || ''} onChange={e => setVenue(prev => ({...prev, address_line1: e.target.value}))} required />
                <Input label="Address Line 2" name="address_line2" value={venue.address_line2 || ''} onChange={e => setVenue(prev => ({...prev, address_line2: e.target.value}))} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="City" name="city" value={venue.city || ''} onChange={e => setVenue(prev => ({...prev, city: e.target.value}))} required />
                  <StateSelect 
                    value={venue.state} 
                    onChange={(val) => setVenue(prev => ({ ...prev, state: val }))} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Country" name="country" value="India" disabled required />
                  <Input label="Postal Code" name="postal_code" value={venue.postal_code || ''} onChange={e => setVenue(prev => ({...prev, postal_code: e.target.value}))} />
                </div>
                <div className="pt-2">
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Pinpoint Location on Map</label>
                  <LocationPickerMap
                    latitude={venue.latitude}
                    longitude={venue.longitude}
                    onChange={(lat, lng, addr) => {
                      setVenue(prev => {
                        const update = { ...prev, latitude: lat, longitude: lng }
                        if (addr) {
                          if (addr.address_line1) update.address_line1 = addr.address_line1
                          if (addr.address_line2) update.address_line2 = addr.address_line2
                          if (addr.city) update.city = addr.city
                          if (addr.state) update.state = addr.state
                          if (addr.country) update.country = addr.country
                          if (addr.postal_code) update.postal_code = addr.postal_code
                        }
                        return update
                      })
                    }}
                  />
                  <p className="text-xs text-zinc-500 mt-1">Click on the map to set the exact coordinates of your venue.</p>
                </div>
              </div>
            </div>
          )}

          {editSection === 'booking-settings' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-zinc-900">Allowed Booking Types</h4>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                    <input 
                      type="checkbox" 
                      name="allow_full_day" 
                      checked={allowFullDay}
                      onChange={e => setAllowFullDay(e.target.checked)}
                      className="rounded text-brand focus:ring-brand" 
                    />
                    Full Day
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                    <input 
                      type="checkbox" 
                      name="allow_time_slot" 
                      checked={allowTimeSlot}
                      onChange={e => setAllowTimeSlot(e.target.checked)}
                      className="rounded text-brand focus:ring-brand" 
                    />
                    Time Slot
                  </label>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-zinc-100">
                <h4 className="font-medium text-zinc-900">Booking Limits & Buffers</h4>
                <div className="space-y-6 max-w-3xl">
                  <div className="grid md:grid-cols-2 gap-12">
                    <DurationInput label="Min Booking Duration" name="min_booking_duration_minutes" defaultValue={venue.min_booking_duration_minutes} required />
                    <DurationInput label="Max Booking Duration" name="max_booking_duration_minutes" defaultValue={venue.max_booking_duration_minutes} required />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-12 pt-4 border-t border-zinc-50">
                    <DurationInput label="Slot Interval" name="slot_interval_minutes" defaultValue={venue.slot_interval_minutes} required helperText="e.g. 30 means bookings start at :00 and :30" />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-12 pt-4 border-t border-zinc-50">
                    <DurationInput label="Pre-Buffer (Setup time)" name="pre_buffer_minutes" defaultValue={venue.pre_buffer_minutes} required helperText="Gap required before a booking" />
                    <DurationInput label="Post-Buffer (Teardown time)" name="post_buffer_minutes" defaultValue={venue.post_buffer_minutes} required helperText="Gap required after a booking" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-zinc-100">
                <h4 className="font-medium text-zinc-900">Approval Window</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Owner Action Window (Hours)" name="owner_action_window_hours" type="number" min={24} max={72} defaultValue={venue.owner_action_window_hours} required helperText="How long you have to accept/reject a pending request before it auto-cancels." />
                </div>
              </div>
            </div>
          )}

          {editSection === 'pricing' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-zinc-900">Pricing</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className={!allowFullDay ? 'opacity-50 pointer-events-none' : ''}>
                    <Input label="Base Price (₹) (Full Day)" name="base_price" type="number" min={0} defaultValue={(venue.starting_price_paise || 0) / 100} disabled={!allowFullDay} required={allowFullDay} />
                  </div>
                  <div className={!allowTimeSlot ? 'opacity-50 pointer-events-none' : ''}>
                    <Input label="Hourly Rate (₹) (Time Slot)" name="hourly_rate" type="number" min={0} defaultValue={(venue.hourly_rate_paise || 0) / 100} disabled={!allowTimeSlot} required={allowTimeSlot} />
                  </div>
                </div>
                <p className="text-sm text-zinc-500 italic mt-2">Prices will only be applied if the corresponding booking type is enabled in Booking Settings.</p>
              </div>

              <div className="space-y-4 pt-6 border-t border-zinc-100">
                <h4 className="font-medium text-zinc-900">Payment Terms</h4>
                <Input label="Token Advance (%)" name="advance_pct" type="number" step="0.01" min={0.01} max={100} defaultValue={venue.advance_pct} required />
                <Input label="Balance Due (Days before event)" name="balance_due" type="number" min={1} defaultValue={venue.balance_due_days_before_event} required />
              </div>
            </div>
          )}

          {editSection === 'photos' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <div>
                  <h4 className="font-medium text-zinc-900">Venue Photos</h4>
                  <p className="text-sm text-zinc-500">Manage the photos displayed for your venue. The first photo is the cover.</p>
                </div>
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple
                    onChange={async (e) => {
                      const files = e.target.files
                      if (!files || files.length === 0 || !venueId) return
                      
                      setSaving(true)
                      try {
                        const newPhotos: any[] = []
                        const client = createClient()
                        
                        // Upload all selected files sequentially to avoid overwhelming the server/Cloudinary
                        for (let i = 0; i < files.length; i++) {
                          const formData = new FormData()
                          formData.append('file', files[i])
                          const newPhoto = await venueEndpoints(client).addVenuePhoto(venueId, formData)
                          newPhotos.push(newPhoto)
                        }
                        
                        // Update local venue state
                        setVenue((prev: any) => ({
                          ...prev,
                          photos: [...(prev.photos || []), ...newPhotos]
                        }))
                      } catch (err) {
                        console.error('Failed to upload photos', err)
                        alert('Upload failed for one or more images. Ensure they are valid images.')
                      } finally {
                        setSaving(false)
                        e.target.value = '' // reset input
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                    disabled={saving}
                  />
                  <Button variant="secondary" type="button" disabled={saving}>
                    {saving ? 'Uploading...' : 'Upload Photos'}
                  </Button>
                </div>
              </div>

              {(!localPhotos || localPhotos.length === 0) ? (
                <div className="text-center py-12 border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50">
                  <p className="text-sm text-zinc-500">No photos uploaded yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {localPhotos.map((photo: any, index: number) => (
                    <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-zinc-200 aspect-video bg-zinc-100 flex flex-col">
                      <img src={photo.image_url} className="w-full h-full object-cover" alt="Venue" />
                      
                      {index === 0 && (
                        <div className="absolute top-2 left-2 bg-brand text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                          Cover
                        </div>
                      )}

                      {/* Controls overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        <div className="flex justify-between items-start">
                          {index !== 0 ? (
                             <button type="button" onClick={() => makeCover(index)} className="text-[10px] uppercase font-bold tracking-wider bg-white/90 text-zinc-900 px-2 py-1 rounded hover:bg-white transition-colors">Make Cover</button>
                          ) : <div/>}
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm("Are you sure you want to delete this photo?")) return
                              if (!venueId) return
                              setSaving(true)
                              try {
                                const client = createClient()
                                await venueEndpoints(client).deleteVenuePhoto(venueId, photo.id)
                                setLocalPhotos(prev => prev.filter((p: any) => p.id !== photo.id))
                                setVenue((prev: any) => ({
                                  ...prev,
                                  photos: prev.photos.filter((p: any) => p.id !== photo.id)
                                }))
                              } catch (err) {
                                console.error('Failed to delete photo', err)
                                alert('Deletion failed.')
                              } finally {
                                setSaving(false)
                              }
                            }}
                            className="bg-red-600 text-white p-1.5 rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                            disabled={saving}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                        <div className="flex justify-center gap-2">
                          {index > 0 && (
                            <button type="button" onClick={() => movePhoto(index, -1)} className="text-xs bg-white/90 text-zinc-900 px-2 py-1 rounded hover:bg-white transition-colors font-medium">
                               &larr; Move
                            </button>
                          )}
                          {index < localPhotos.length - 1 && (
                            <button type="button" onClick={() => movePhoto(index, 1)} className="text-xs bg-white/90 text-zinc-900 px-2 py-1 rounded hover:bg-white transition-colors font-medium">
                               Move &rarr;
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {editSection === 'amenities' && (
            <div className="space-y-4">
              <h4 className="font-medium text-zinc-900">Select Amenities</h4>
              {platformAmenities.length === 0 ? (
                <p className="text-sm text-zinc-500">Loading amenities...</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {platformAmenities.map(amenity => {
                    const Icon = (Icons as any)[amenity.icon || 'Check'] || Icons.Check
                    const isSelected = selectedAmenities.includes(amenity.id)
                    
                    return (
                      <label 
                        key={amenity.id} 
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'border-brand bg-brand/5' : 'border-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAmenities(prev => [...prev, amenity.id])
                            } else {
                              setSelectedAmenities(prev => prev.filter(id => id !== amenity.id))
                            }
                          }}
                          className="rounded text-brand focus:ring-brand sr-only" 
                        />
                        <Icon className={`h-5 w-5 ${isSelected ? 'text-brand' : 'text-zinc-400'}`} />
                        <span className={`text-sm font-medium ${isSelected ? 'text-brand-hover' : 'text-zinc-700'}`}>
                          {amenity.name}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {editSection === 'policies' && (
            <div className="space-y-6">
              <p className="text-sm text-zinc-600 mb-6">
                Define your cancellation refund tiers. The hours must be in descending order (e.g. 168 hours = 7 days, 72 hours = 3 days).
              </p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 items-end bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                  <Input label="Tier 1: Cancel before (Hours)" name="tier_1_hours" type="number" min={1} defaultValue={venue.cancellation_policy?.tier_1_hours || ''} placeholder="e.g. 168" />
                  <Input label="Refund %" name="tier_1_refund_pct" type="number" step="0.01" min="0" max="100" defaultValue={venue.cancellation_policy?.tier_1_refund_pct || ''} placeholder="e.g. 100" />
                </div>

                <div className="grid grid-cols-2 gap-4 items-end bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                  <Input label="Tier 2: Cancel before (Hours)" name="tier_2_hours" type="number" min={1} defaultValue={venue.cancellation_policy?.tier_2_hours || ''} placeholder="e.g. 72" />
                  <Input label="Refund %" name="tier_2_refund_pct" type="number" step="0.01" min="0" max="100" defaultValue={venue.cancellation_policy?.tier_2_refund_pct || ''} placeholder="e.g. 50" />
                </div>

                <div className="grid grid-cols-2 gap-4 items-end bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                  <Input label="Tier 3: Cancel before (Hours) (Optional)" name="tier_3_hours" type="number" min={1} defaultValue={venue.cancellation_policy?.tier_3_hours || ''} placeholder="e.g. 24" />
                  <Input label="Refund % (Optional)" name="tier_3_refund_pct" type="number" step="0.01" min="0" max="100" defaultValue={venue.cancellation_policy?.tier_3_refund_pct || ''} placeholder="e.g. 25" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-zinc-100">
                <Input label="No Show Refund (%)" name="no_show_refund_pct" type="number" step="0.01" min="0" max="100" required defaultValue={venue.cancellation_policy?.no_show_refund_pct || '0'} />
                <Input label="Overdue Advance Refund (%)" name="overdue_advance_refund_pct" type="number" step="0.01" min="0" max="100" required defaultValue={venue.overdue_advance_refund_pct || '0'} />
              </div>
              <div>
                <p className="text-xs text-zinc-500 mt-1">Refund given if you (the owner) fail to accept/reject a booking request in time.</p>
              </div>

              <div className="pt-4 border-t border-zinc-100">
                <label className="block text-sm font-medium text-zinc-700 mb-1">Additional Policy Notes (Optional)</label>
                <textarea 
                  name="notes"
                  defaultValue={venue.cancellation_policy?.notes || ''}
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  placeholder="e.g. In case of severe weather, full refunds are provided regardless of the cancellation window."
                />
              </div>
            </div>
          )}

          {editSection === 'operating-hours' && (
            <div className="space-y-6">
              <div className="space-y-6">
                <h4 className="font-medium text-zinc-900">Base Schedule</h4>
                <div className="grid grid-cols-2 gap-4">
                  <TimeSelect label="Opening Time" name="open_time" value={venue.open_time || ''} onChange={e => setVenue(prev => ({...prev, open_time: e.target.value}))} required />
                  <TimeSelect label="Closing Time" name="close_time" value={venue.close_time || ''} onChange={e => setVenue(prev => ({...prev, close_time: e.target.value}))} required />
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                  <input type="checkbox" name="spans_next_day" defaultChecked={venue.spans_next_day} className="rounded text-brand focus:ring-brand" />
                  Operating hours span into the next day (e.g., closes after midnight)
                </label>
              </div>
            </div>
          )}

          {editSection === 'blocked-dates' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-zinc-100">
                <div>
                  <h4 className="font-medium text-zinc-900">Manage Blocked Dates</h4>
                  <p className="text-sm text-zinc-500">Add dates when your venue is unavailable (e.g. maintenance, private event).</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                <Input label="Starts At" name="block_starts_at" type="datetime-local" />
                <Input label="Ends At" name="block_ends_at" type="datetime-local" />
                <Input label="Reason (Optional)" name="block_reason" placeholder="e.g. Maintenance" />
                <Button 
                  variant="secondary"
                  type="button"
                  onClick={async () => {
                    const starts_at = (document.querySelector('input[name="block_starts_at"]') as HTMLInputElement).value
                    const ends_at = (document.querySelector('input[name="block_ends_at"]') as HTMLInputElement).value
                    const reason = (document.querySelector('input[name="block_reason"]') as HTMLInputElement).value
                    if (!starts_at || !ends_at) {
                      alert('Please select both start and end times.')
                      return
                    }
                    if (new Date(ends_at) <= new Date(starts_at)) {
                      alert('End time must be after start time.')
                      return
                    }

                    setSaving(true)
                    try {
                      const client = createClient()
                      const payload = {
                        starts_at: new Date(starts_at).toISOString(),
                        ends_at: new Date(ends_at).toISOString(),
                        reason: reason || null
                      }
                      const newBlock = await venueEndpoints(client).createBlockedDate(venueId!, payload)
                      setBlockedDates(prev => [...prev, newBlock].sort((a,b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()))
                      // Clear inputs
                      ;(document.querySelector('input[name="block_starts_at"]') as HTMLInputElement).value = ''
                      ;(document.querySelector('input[name="block_ends_at"]') as HTMLInputElement).value = ''
                      ;(document.querySelector('input[name="block_reason"]') as HTMLInputElement).value = ''
                    } catch (err: any) {
                      console.error('Failed to create block', err)
                      alert(err.message || 'Failed to add blocked date.')
                    } finally {
                      setSaving(false)
                    }
                  }}
                  disabled={saving}
                >
                  {saving ? 'Adding...' : 'Add Block'}
                </Button>
              </div>

              {blockedDates.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 bg-zinc-50 rounded-lg border border-zinc-200">
                  No upcoming blocked dates.
                </div>
              ) : (
                <div className="space-y-3">
                  {blockedDates.map(block => (
                    <div key={block.id} className="flex justify-between items-center p-4 bg-white border border-zinc-200 rounded-lg shadow-sm">
                      <div>
                        <div className="font-medium text-zinc-900">
                          {new Date(block.starts_at).toLocaleString()} - {new Date(block.ends_at).toLocaleString()}
                        </div>
                        {block.reason && <div className="text-sm text-zinc-500 mt-1">Reason: {block.reason}</div>}
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm('Are you sure you want to delete this block?')) return
                          setSaving(true)
                          try {
                            const client = createClient()
                            await venueEndpoints(client).deleteBlockedDate(venueId!, block.id)
                            setBlockedDates(prev => prev.filter(b => b.id !== block.id))
                          } catch (err) {
                            console.error('Failed to delete block', err)
                            alert('Deletion failed.')
                          } finally {
                            setSaving(false)
                          }
                        }}
                        className="text-red-600 hover:text-red-700 p-2"
                        disabled={saving}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        <div className="flex justify-end gap-3">
          <Link to={`/venues/${venueId}/overview`}>
            <Button variant="ghost" type="button">Back</Button>
          </Link>
          {editSection !== 'blocked-dates' && (
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
