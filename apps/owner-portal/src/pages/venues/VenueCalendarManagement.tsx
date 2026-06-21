import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, SectionHeader, Button, Input } from '@venue404/ui'
import { ArrowLeft, Loader2, Save, Trash2, Clock, Ban } from 'lucide-react'
import { createClient, venueEndpoints } from '@venue404/api-client'

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
]

type Availability = {
  day_of_week: number
  is_available: boolean
  opens_at: string | null
  closes_at: string | null
  spans_next_day: boolean
}

type BlockedDate = {
  id: string
  starts_at: string
  ends_at: string
  reason: string | null
}

export default function VenueCalendarManagement() {
  const { venueId } = useParams()
  const [activeTab, setActiveTab] = useState<'weekly' | 'blocked'>('weekly')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Weekly state
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [savingWeekly, setSavingWeekly] = useState(false)
  
  // Blocked dates state
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [addingBlock, setAddingBlock] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (!venueId) return
      setLoading(true)
      try {
        const client = createClient()
        const [availData, blockedData] = await Promise.all([
          venueEndpoints(client).getVenueAvailability(venueId),
          venueEndpoints(client).getBlockedDates(venueId)
        ])
        
        // Always show all 7 days; merge backend data over defaults
        const defaults: Availability[] = DAYS_OF_WEEK.map((_, idx) => ({
          day_of_week: idx,
          is_available: true,
          opens_at: '09:00:00',
          closes_at: '18:00:00',
          spans_next_day: false,
        }))

        const merged = defaults.map(def => {
          const existing = availData?.find((a: any) => a.day_of_week === def.day_of_week)
          return existing ? {
            day_of_week: existing.day_of_week,
            is_available: existing.is_available,
            opens_at: existing.opens_at,
            closes_at: existing.closes_at,
            spans_next_day: existing.spans_next_day,
          } : def
        })

        setAvailabilities(merged)
        
        if (blockedData) {
          setBlockedDates(blockedData)
        }
      } catch (err: any) {
        console.error("Failed to fetch calendar data", err)
        setError(err.message || 'Failed to load calendar data.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [venueId])

  const handleWeeklyChange = (index: number, field: keyof Availability, value: any) => {
    setAvailabilities(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const saveWeekly = async () => {
    if (!venueId) return
    setSavingWeekly(true)
    setError(null)

    // Validation for availability times
    for (const avail of availabilities) {
      if (avail.is_available) {
        if (!avail.opens_at || !avail.closes_at) {
          setError(`Opening and closing times are required for ${DAYS_OF_WEEK[avail.day_of_week]} if available.`)
          setSavingWeekly(false)
          return
        }
      }
    }

    try {
      const client = createClient()
      const data = await venueEndpoints(client).bulkUpdateVenueAvailability(venueId, {
        availabilities
      })
      // Re-merge returned data so all 7 days remain visible
      const defaults: Availability[] = DAYS_OF_WEEK.map((_, idx) => ({
        day_of_week: idx,
        is_available: true,
        opens_at: '09:00:00',
        closes_at: '18:00:00',
        spans_next_day: false,
      }))
      const merged = defaults.map(def => {
        const saved = data?.find((a: any) => a.day_of_week === def.day_of_week)
        return saved ? {
          day_of_week: saved.day_of_week,
          is_available: saved.is_available,
          opens_at: saved.opens_at,
          closes_at: saved.closes_at,
          spans_next_day: saved.spans_next_day,
        } : def
      })
      setAvailabilities(merged)
      alert("Weekly schedule saved successfully.")
    } catch (err: any) {
      setError(err.message || "Failed to save schedule")
    } finally {
      setSavingWeekly(false)
    }
  }

  const handleAddBlockedDate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!venueId) return
    const formData = new FormData(e.currentTarget)
    const starts_at = formData.get('starts_at') as string
    const ends_at = formData.get('ends_at') as string
    const reason = formData.get('reason') as string

    if (!starts_at || !ends_at) {
      setError("Start and end times are required")
      return
    }

    if (new Date(ends_at) <= new Date(starts_at)) {
      setError("End time must be strictly after start time")
      return
    }

    setAddingBlock(true)
    setError(null)
    try {
      const client = createClient()
      const newBlock = await venueEndpoints(client).createBlockedDate(venueId, {
        starts_at: new Date(starts_at).toISOString(),
        ends_at: new Date(ends_at).toISOString(),
        reason: reason || null
      })
      setBlockedDates(prev => [...prev, newBlock].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()))
      ;(e.target as HTMLFormElement).reset()
    } catch (err: any) {
      setError(err.message || "Failed to block date")
    } finally {
      setAddingBlock(false)
    }
  }

  const handleDeleteBlockedDate = async (id: string) => {
    if (!venueId || !window.confirm("Are you sure you want to unblock this date?")) return
    setError(null)
    try {
      const client = createClient()
      await venueEndpoints(client).deleteBlockedDate(venueId, id)
      setBlockedDates(prev => prev.filter(b => b.id !== id))
    } catch (err: any) {
      setError(err.message || "Failed to unblock date")
    }
  }

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand" /></div>
  }

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      <Link to={`/venues/${venueId}/overview`} className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Overview
      </Link>

      <SectionHeader 
        title="Calendar & Availability" 
        description="Manage your regular weekly hours and set specific dates when your venue is unavailable." 
      />

      {error && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 border-b border-zinc-200 mb-6">
        <button
          onClick={() => setActiveTab('weekly')}
          className={`pb-3 text-sm font-medium transition-colors relative ${
            activeTab === 'weekly' ? 'text-brand' : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Weekly Schedule
          </div>
          {activeTab === 'weekly' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('blocked')}
          className={`pb-3 text-sm font-medium transition-colors relative ${
            activeTab === 'blocked' ? 'text-brand' : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            Blocked Dates
          </div>
          {activeTab === 'blocked' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-full" />
          )}
        </button>
      </div>

      {/* Weekly Availability */}
      {activeTab === 'weekly' && (
        <div className="space-y-6">
          <div className="bg-zinc-50 rounded-xl border border-zinc-200 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-200 bg-zinc-100/50 font-medium text-sm text-zinc-700">
              <div className="col-span-3">Day</div>
              <div className="col-span-2 text-center">Available</div>
              <div className="col-span-3">Opening Time</div>
              <div className="col-span-3">Closing Time</div>
              <div className="col-span-1 text-center" title="Closes next day">+1d</div>
            </div>
            <div className="divide-y divide-zinc-200 bg-white">
              {availabilities.map((avail, index) => (
                <div key={avail.day_of_week} className={`grid grid-cols-12 gap-4 p-4 items-center ${!avail.is_available ? 'opacity-50 bg-zinc-50' : ''}`}>
                  <div className="col-span-3 font-medium text-zinc-900">
                    {DAYS_OF_WEEK[avail.day_of_week]}
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <input 
                      type="checkbox" 
                      checked={avail.is_available} 
                      onChange={(e) => handleWeeklyChange(index, 'is_available', e.target.checked)}
                      className="rounded text-brand focus:ring-brand w-4 h-4 cursor-pointer"
                    />
                  </div>
                  <div className="col-span-3">
                    <input 
                      type="time" 
                      value={avail.opens_at ? avail.opens_at.slice(0, 5) : ''} 
                      onChange={(e) => handleWeeklyChange(index, 'opens_at', e.target.value ? `${e.target.value}:00` : null)}
                      disabled={!avail.is_available}
                      className="w-full px-3 py-1.5 rounded-md border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-zinc-100 text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    <input 
                      type="time" 
                      value={avail.closes_at ? avail.closes_at.slice(0, 5) : ''} 
                      onChange={(e) => handleWeeklyChange(index, 'closes_at', e.target.value ? `${e.target.value}:00` : null)}
                      disabled={!avail.is_available}
                      className="w-full px-3 py-1.5 rounded-md border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-zinc-100 text-sm"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <input 
                      type="checkbox" 
                      checked={avail.spans_next_day} 
                      onChange={(e) => handleWeeklyChange(index, 'spans_next_day', e.target.checked)}
                      disabled={!avail.is_available}
                      className="rounded text-brand focus:ring-brand w-4 h-4 cursor-pointer"
                      title="Closes next day"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button variant="primary" onClick={saveWeekly} disabled={savingWeekly}>
              {savingWeekly ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {savingWeekly ? 'Saving...' : 'Save Weekly Schedule'}
            </Button>
          </div>
        </div>
      )}

      {/* Blocked Dates */}
      {activeTab === 'blocked' && (
        <div className="space-y-8">
          <Card className="p-6">
            <h4 className="font-medium text-zinc-900 mb-4">Add Blocked Date</h4>
            <form onSubmit={handleAddBlockedDate}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Input label="Starts At" name="starts_at" type="datetime-local" required />
                <Input label="Ends At" name="ends_at" type="datetime-local" required />
                <Input label="Reason (Optional)" name="reason" placeholder="e.g. Maintenance" />
              </div>
              <div className="mt-4 flex justify-end">
                <Button type="submit" variant="primary" disabled={addingBlock}>
                  {addingBlock ? 'Adding...' : 'Block Date'}
                </Button>
              </div>
            </form>
          </Card>

          <div>
            <h4 className="font-medium text-zinc-900 mb-4">Upcoming Blocked Dates</h4>
            {blockedDates.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 bg-zinc-50 rounded-lg border border-zinc-200">
                <Ban className="h-8 w-8 mx-auto text-zinc-300 mb-2" />
                <p>No upcoming blocked dates.</p>
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
                      onClick={() => handleDeleteBlockedDate(block.id)}
                      className="text-red-600 hover:text-red-700 p-2"
                      title="Unblock date"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
