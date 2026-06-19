import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Input, SectionHeader, LocationPickerMap } from '@venue404/ui'
import * as Icons from 'lucide-react'
import { createClient, venueEndpoints } from '@venue404/api-client'

const STEPS = [
  'Basic Details',
  'Photos',
  'Operating Hours',
  'Booking Settings',
  'Pricing',
  'Cancellation Policy',
  'Amenities',
  'Review & Submit'
]

export default function CreateVenueWizard() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Centralized state for the entire form
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    description: '',
    min_capacity: '',
    max_capacity: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    country: 'India',
    postal_code: '',
    latitude: null as number | null,
    longitude: null as number | null,
    open_time: '09:00',
    close_time: '23:00',
    min_booking_duration_minutes: 60,
    max_booking_duration_minutes: 1440,
    slot_interval_minutes: 30,
    pre_buffer_minutes: 30,
    post_buffer_minutes: 30,
    pricing_mode: 'flat',
    base_price: '',
    hourly_rate: '',
    advance_pct: 30,
    balance_due: 7,
    spans_next_day: false,
    allowed_booking_types: ['full_day', 'time_slot'],
    owner_action_window_hours: 48,
    overdue_advance_refund_pct: 0,
    tier_1_hours: '168', // 7 days
    tier_1_refund_pct: '100',
    tier_2_hours: '72', // 3 days
    tier_2_refund_pct: '50',
    tier_3_hours: '',
    tier_3_refund_pct: '',
    no_show_refund_pct: '0',
    notes: '',
  })

  const [photos, setPhotos] = useState<File[]>([])
  const [platformAmenities, setPlatformAmenities] = useState<any[]>([])
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])
  const [venueCategories, setVenueCategories] = useState<any[]>([])

  useEffect(() => {
    async function loadAmenities() {
      try {
        const client = createClient()
        const data = await venueEndpoints(client).getPlatformAmenities()
        setPlatformAmenities(data)
      } catch (err) {
        console.error('Failed to load amenities', err)
      }
    }
    async function loadCategories() {
      try {
        const client = createClient()
        const data = await venueEndpoints(client).getVenueCategories()
        setVenueCategories(data)
      } catch (err) {
        console.error('Failed to load categories', err)
      }
    }
    loadAmenities()
    loadCategories()
  }, [])

  useEffect(() => {
    const hasFullDay = formData.allowed_booking_types.includes('full_day')
    const hasTimeSlot = formData.allowed_booking_types.includes('time_slot')
    
    if (hasFullDay && !hasTimeSlot && formData.pricing_mode !== 'flat') {
      setFormData(prev => ({ ...prev, pricing_mode: 'flat' }))
    } else if (!hasFullDay && hasTimeSlot && formData.pricing_mode !== 'hourly') {
      setFormData(prev => ({ ...prev, pricing_mode: 'hourly' }))
    } else if (hasFullDay && hasTimeSlot && formData.pricing_mode !== 'mixed') {
      setFormData(prev => ({ ...prev, pricing_mode: 'mixed' }))
    }
  }, [formData.allowed_booking_types, formData.pricing_mode])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleBookingTypeToggle = (type: string) => {
    setFormData(prev => {
      const types = prev.allowed_booking_types as string[]
      return {
        ...prev,
        allowed_booking_types: types.includes(type)
          ? types.filter(t => t !== type)
          : [...types, type]
      }
    })
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(s => s + 1)
    } else {
      submitVenue()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1)
    } else {
      navigate('/venues')
    }
  }

  const submitVenue = async () => {
    setSubmitting(true)
    setError(null)

    // Build the CreateVenueRequest payload
    const payload = {
      name: formData.name,
      description: formData.description || null,
      category_id: formData.category_id,
      address_line1: formData.address_line1 || 'TBD',
      address_line2: formData.address_line2 || null,
      city: formData.city || 'TBD',
      state: formData.state || 'TBD',
      country: formData.country || 'India',
      postal_code: formData.postal_code || null,
      latitude: formData.latitude,
      longitude: formData.longitude,
      timezone: 'Asia/Kolkata',
      min_capacity: formData.min_capacity ? parseInt(formData.min_capacity.toString(), 10) : null,
      max_capacity: formData.max_capacity ? parseInt(formData.max_capacity.toString(), 10) : 100, // required
      open_time: `${formData.open_time}:00`,
      close_time: `${formData.close_time}:00`,
      spans_next_day: formData.spans_next_day,
      allowed_booking_types: formData.allowed_booking_types.length > 0 ? formData.allowed_booking_types : ['full_day', 'time_slot'],
      min_booking_duration_minutes: parseInt(formData.min_booking_duration_minutes.toString(), 10),
      max_booking_duration_minutes: parseInt(formData.max_booking_duration_minutes.toString(), 10),
      slot_interval_minutes: parseInt(formData.slot_interval_minutes.toString(), 10),
      pre_buffer_minutes: parseInt(formData.pre_buffer_minutes.toString(), 10),
      post_buffer_minutes: parseInt(formData.post_buffer_minutes.toString(), 10),
      pricing_mode: formData.pricing_mode,
      starting_price_paise: (formData.pricing_mode === 'flat' || formData.pricing_mode === 'mixed') ? parseInt(formData.base_price.toString() || '0', 10) * 100 : null,
      hourly_rate_paise: (formData.pricing_mode === 'hourly' || formData.pricing_mode === 'mixed') ? parseInt(formData.hourly_rate.toString() || '0', 10) * 100 : null,
      advance_pct: parseFloat(formData.advance_pct.toString()),
      balance_due_days_before_event: parseInt(formData.balance_due.toString(), 10),
      owner_action_window_hours: parseInt(formData.owner_action_window_hours.toString(), 10),
      overdue_advance_refund_pct: parseFloat(formData.overdue_advance_refund_pct.toString())
    }

    try {
      const client = createClient()
      const newVenue = await venueEndpoints(client).createVenue(payload)

      // Upload selected photos now that we have the venue ID
      if (photos.length > 0) {
        for (const file of photos) {
          try {
            const fd = new FormData()
            fd.append('file', file)
            await venueEndpoints(client).addVenuePhoto(newVenue.id, fd)
          } catch (err) {
            console.error('Failed to upload a photo', err)
          }
        }
      }

      // Submit Cancellation Policy
      try {
        const policyPayload: any = {
          no_show_refund_pct: parseFloat(formData.no_show_refund_pct.toString() || '0'),
          platform_fee_refundable: false,
          notes: formData.notes || null,
        }
        if (formData.tier_1_hours && formData.tier_1_refund_pct !== '') {
          policyPayload.tier_1_hours = parseInt(formData.tier_1_hours.toString(), 10)
          policyPayload.tier_1_refund_pct = parseFloat(formData.tier_1_refund_pct.toString())
        }
        if (formData.tier_2_hours && formData.tier_2_refund_pct !== '') {
          policyPayload.tier_2_hours = parseInt(formData.tier_2_hours.toString(), 10)
          policyPayload.tier_2_refund_pct = parseFloat(formData.tier_2_refund_pct.toString())
        }
        if (formData.tier_3_hours && formData.tier_3_refund_pct !== '') {
          policyPayload.tier_3_hours = parseInt(formData.tier_3_hours.toString(), 10)
          policyPayload.tier_3_refund_pct = parseFloat(formData.tier_3_refund_pct.toString())
        }
        
        await venueEndpoints(client).updateCancellationPolicy(newVenue.id, policyPayload)
      } catch (err) {
        console.error('Failed to set cancellation policy', err)
      }

      // Submit Amenities
      if (selectedAmenities.length > 0) {
        try {
          await venueEndpoints(client).updateVenueAmenities(newVenue.id, { amenity_ids: selectedAmenities })
        } catch (err) {
          console.error('Failed to set amenities', err)
        }
      }

      navigate(`/venues/${newVenue.id}/overview`)
    } catch (err: any) {
      console.error('Failed to create venue', err)
      setError(err.message || 'Failed to create venue. Check your inputs.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Wizard Header */}
      <div className="mb-8 flex items-center justify-between">
        <button 
          onClick={handleBack}
          className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <Icons.ArrowLeft className="h-4 w-4" />
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </button>
        <div className="text-sm font-medium text-zinc-500">
          Step {currentStep + 1} of {STEPS.length}
        </div>
      </div>

      <SectionHeader 
        title={STEPS[currentStep]} 
        description="Fill out the details below. You can save as a draft and return later." 
      />

      {/* Progress Bar */}
      <div className="flex flex-wrap items-center gap-y-4 gap-x-2 mb-8 mt-6 pb-2">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          return (
            <div key={step} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                isCompleted ? 'bg-emerald-500 text-white' :
                isCurrent ? 'bg-brand text-white' : 'bg-zinc-100 text-zinc-400'
              }`}>
                {isCompleted ? <Icons.Check className="h-3 w-3" /> : index + 1}
              </div>
              <span className={`text-sm font-medium ${isCurrent ? 'text-zinc-900' : 'text-zinc-400'}`}>
                {step}
              </span>
              {index < STEPS.length - 1 && (
                <Icons.ChevronRight className="h-4 w-4 text-zinc-200 mx-1" />
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Step Content */}
      <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
        <Card className="p-8">
          {currentStep === 0 && (
            <div className="space-y-6">
              <Input label="Venue Name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Skyline Rooftop" required />
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Venue Category<span className="text-red-500 ml-1">*</span></label>
                <select name="category_id" value={formData.category_id} onChange={handleChange} required
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
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 rounded-md border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                placeholder="Describe your venue..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Min Capacity" name="min_capacity" type="number" min={1} value={formData.min_capacity} onChange={handleChange} placeholder="e.g. 50" />
              <Input label="Max Capacity" name="max_capacity" type="number" min={1} required value={formData.max_capacity} onChange={handleChange} placeholder="e.g. 300" />
            </div>
            <div className="space-y-4 pt-4 border-t border-zinc-100">
              <h4 className="font-medium text-zinc-900">Location</h4>
              <Input label="Address Line 1" name="address_line1" required value={formData.address_line1} onChange={handleChange} placeholder="Street address" />
              <Input label="Address Line 2" name="address_line2" value={formData.address_line2} onChange={handleChange} placeholder="Suite, floor, etc. (optional)" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="City" name="city" required value={formData.city} onChange={handleChange} />
                <Input label="State" name="state" required value={formData.state} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Country" name="country" required value={formData.country} onChange={handleChange} />
                <Input label="Postal Code" name="postal_code" value={formData.postal_code} onChange={handleChange} />
              </div>
              <div className="pt-2">
                <label className="block text-sm font-medium text-zinc-700 mb-1">Pinpoint Location on Map</label>
                <LocationPickerMap
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onChange={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })}
                />
                <p className="text-xs text-zinc-500 mt-1">Click on the map to set the exact coordinates of your venue.</p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center py-12 border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50 relative">
              <h4 className="text-sm font-medium text-zinc-900">Upload Photos</h4>
              <p className="text-sm text-zinc-500 mt-1">Drag and drop images here, or click to browse.</p>
              <input 
                type="file" 
                multiple 
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files) {
                    setPhotos(prev => [...prev, ...Array.from(e.target.files!)])
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <Button variant="secondary" className="mt-4 pointer-events-none">Select Images</Button>
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {photos.map((file, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border border-zinc-200 aspect-video bg-zinc-100">
                    <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Preview" />
                    <button
                      type="button"
                      onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
            <div className="space-y-6">
              <Input label="Opening Time" name="open_time" type="time" required value={formData.open_time} onChange={handleChange} />
              <Input label="Closing Time" name="close_time" type="time" required value={formData.close_time} onChange={handleChange} />
              <label className="flex items-center gap-2">
                <input type="checkbox" name="spans_next_day" checked={formData.spans_next_day} onChange={handleChange} className="rounded text-brand focus:ring-brand" />
                <span className="text-sm text-zinc-700">Closes next day</span>
              </label>
              <p className="text-sm text-zinc-500 italic mt-4">Per-day overrides can be set after creating the venue.</p>
            </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="space-y-2 mb-6">
              <h4 className="font-medium text-zinc-900">Allowed Booking Types</h4>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                  <input type="checkbox" checked={formData.allowed_booking_types.includes('full_day')} onChange={() => handleBookingTypeToggle('full_day')} className="rounded text-brand focus:ring-brand" />
                  Full Day
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                  <input type="checkbox" checked={formData.allowed_booking_types.includes('time_slot')} onChange={() => handleBookingTypeToggle('time_slot')} className="rounded text-brand focus:ring-brand" />
                  Time Slot
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Input label="Min Booking Duration (min)" name="min_booking_duration_minutes" type="number" min={1} required value={formData.min_booking_duration_minutes} onChange={handleChange} />
                <Input label="Max Booking Duration (min)" name="max_booking_duration_minutes" type="number" min={1} required value={formData.max_booking_duration_minutes} onChange={handleChange} />
            </div>
            <Input label="Slot Interval (min)" name="slot_interval_minutes" type="number" min={1} required value={formData.slot_interval_minutes} onChange={handleChange} helperText="e.g. 30 means bookings start at :00 and :30" />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Pre-Buffer (Setup time in min)" name="pre_buffer_minutes" type="number" min={0} required value={formData.pre_buffer_minutes} onChange={handleChange} helperText="Gap required before a booking" />
              <Input label="Post-Buffer (Teardown time in min)" name="post_buffer_minutes" type="number" min={0} required value={formData.post_buffer_minutes} onChange={handleChange} helperText="Gap required after a booking" />
            </div>
            <Input label="Owner Action Window (Hours)" name="owner_action_window_hours" type="number" min={24} max={72} required value={formData.owner_action_window_hours} onChange={handleChange} helperText="How long you have to accept/reject a pending request before it auto-cancels." />
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Pricing Mode<span className="text-red-500 ml-1">*</span></label>
              <select name="pricing_mode" value={formData.pricing_mode} onChange={handleChange} required className="w-full h-10 px-3 py-2 rounded-md border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand">
                <option value="flat">Flat Rate (Per Day)</option>
                <option value="hourly">Hourly Rate</option>
                <option value="mixed">Mixed (Both)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Base Price (₹)" name="base_price" type="number" min={0} required={formData.pricing_mode !== 'hourly'} disabled={formData.pricing_mode === 'hourly'} value={formData.base_price} onChange={handleChange} placeholder="e.g. 50000" />
              <Input label="Hourly Rate (₹)" name="hourly_rate" type="number" min={0} required={formData.pricing_mode !== 'flat'} disabled={formData.pricing_mode === 'flat'} value={formData.hourly_rate} onChange={handleChange} placeholder="e.g. 5000" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Token Advance (%)" name="advance_pct" type="number" min={0.01} max={100} step="0.01" required value={formData.advance_pct} onChange={handleChange} />
              <Input label="Balance Due (Days before event)" name="balance_due" type="number" min={1} required value={formData.balance_due} onChange={handleChange} />
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6">
            <p className="text-sm text-zinc-600 mb-6">
              Define your cancellation refund tiers. The hours must be in descending order (e.g. 168 hours = 7 days, 72 hours = 3 days).
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Tier 1: Cancel before (Hours)" name="tier_1_hours" type="number" min={1} value={formData.tier_1_hours} onChange={handleChange} placeholder="e.g. 168" />
              <Input label="Refund %" name="tier_1_refund_pct" type="number" step="0.01" min={0} max={100} value={formData.tier_1_refund_pct} onChange={handleChange} placeholder="e.g. 100" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Tier 2: Cancel before (Hours)" name="tier_2_hours" type="number" min={1} value={formData.tier_2_hours} onChange={handleChange} placeholder="e.g. 72" />
              <Input label="Refund %" name="tier_2_refund_pct" type="number" step="0.01" min={0} max={100} value={formData.tier_2_refund_pct} onChange={handleChange} placeholder="e.g. 50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Tier 3: Cancel before (Hours) (Optional)" name="tier_3_hours" type="number" min={1} value={formData.tier_3_hours} onChange={handleChange} placeholder="e.g. 24" />
              <Input label="Refund % (Optional)" name="tier_3_refund_pct" type="number" step="0.01" min={0} max={100} value={formData.tier_3_refund_pct} onChange={handleChange} placeholder="e.g. 25" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100">
              <Input label="No Show Refund (%)" name="no_show_refund_pct" type="number" step="0.01" min={0} max={100} required value={formData.no_show_refund_pct} onChange={handleChange} />
              <Input label="Overdue Advance Refund (%)" name="overdue_advance_refund_pct" type="number" step="0.01" min={0} max={100} required value={formData.overdue_advance_refund_pct} onChange={handleChange} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 mt-1">Refund given if you (the owner) fail to accept/reject a booking request in time.</p>
            </div>
            <div className="pt-4 border-t border-zinc-100">
              <label className="block text-sm font-medium text-zinc-700 mb-1">Additional Policy Notes (Optional)</label>
              <textarea 
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                placeholder="e.g. In case of severe weather, full refunds are provided regardless of the cancellation window."
              />
            </div>
          </div>
        )}

        {currentStep === 6 && (
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

        {currentStep === 7 && (
          <div className="space-y-6">
            <div className="p-6 bg-brand-light text-brand-hover rounded-xl text-center border border-brand-muted/30">
              <Icons.Check className="h-12 w-12 mx-auto text-brand mb-4" />
              <h3 className="text-xl font-semibold">Your Workspace is Ready!</h3>
              <p className="mt-2 text-sm max-w-sm mx-auto">Review your details. Once submitted, your venue draft workspace will be created. You can continue fine-tuning your photos and policies there before officially submitting it for admin approval.</p>
            </div>
          </div>
        )}
        </Card>

        {/* Footer Actions */}
        <div className="mt-8 flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={handleBack} className={currentStep === 0 ? 'invisible' : ''}>
            Previous Step
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {currentStep === STEPS.length - 1 ? (submitting ? 'Creating...' : 'Create Draft Workspace') : 'Continue'}
          </Button>
        </div>
      </form>
    </div>
  )
}
