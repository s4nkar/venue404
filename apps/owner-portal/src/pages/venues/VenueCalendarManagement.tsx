import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, SectionHeader, Button, Input, Skeleton } from '@venue404/ui'
import { ArrowLeft, ArrowRight, Loader2, Save, Trash2, Clock, Ban } from 'lucide-react'
import { createClient, venueEndpoints } from '@venue404/api-client'
import { TimeSelect } from '../../components/TimeSelect'

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
  
  const [startsTime, setStartsTime] = useState('09:00:00')
  const [endsTime, setEndsTime] = useState('17:00:00')

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
        
        if (!avail.spans_next_day) {
          const openStr = avail.opens_at.slice(0, 5)
          const closeStr = avail.closes_at.slice(0, 5)
          if (closeStr <= openStr) {
            setError(`For ${DAYS_OF_WEEK[avail.day_of_week]}, closing time must be after opening time. If you intend to close the next day, please check the 'Closes next day' box.`)
            setSavingWeekly(false)
            return
          }
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

  const handleAddBlockedDate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!venueId) return
    const formData = new FormData(e.target as HTMLFormElement)
    const starts_date = formData.get('starts_date') as string
    const starts_time = formData.get('starts_time') as string
    const ends_date = formData.get('ends_date') as string
    const ends_time = formData.get('ends_time') as string
    const reason = formData.get('reason') as string

    if (!starts_date || !starts_time || !ends_date || !ends_time) {
      setError("Start and end times are required")
      return
    }

    const starts_at = `${starts_date}T${starts_time}`
    const ends_at = `${ends_date}T${ends_time}`

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
    return (
      <div className="space-y-6 pb-12 max-w-5xl mx-auto pt-4">
        <Skeleton className="h-4 w-32 mb-6" />
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-4 border-b border-zinc-200 mb-6 pb-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="bg-zinc-50 rounded-xl border border-zinc-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-200">
            <Skeleton className="col-span-3 h-5 w-full" />
            <Skeleton className="col-span-2 h-5 w-full" />
            <Skeleton className="col-span-3 h-5 w-full" />
            <Skeleton className="col-span-3 h-5 w-full" />
            <Skeleton className="col-span-1 h-5 w-full" />
          </div>
          {[1,2,3,4,5,6,7].map(i => (
            <div key={i} className="grid grid-cols-12 gap-4 p-4 items-center border-b border-zinc-100 bg-white">
              <Skeleton className="col-span-3 h-5 w-24" />
              <div className="col-span-2 flex justify-center"><Skeleton className="h-4 w-4 rounded" /></div>
              <Skeleton className="col-span-3 h-9 w-full rounded-md" />
              <Skeleton className="col-span-3 h-9 w-full rounded-md" />
              <div className="col-span-1 flex justify-center"><Skeleton className="h-4 w-4 rounded" /></div>
            </div>
          ))}
        </div>
      </div>
    )
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
              <div className="grid grid-cols-1 md:grid-cols-2 items-start bg-zinc-50 rounded-lg border border-zinc-200 divide-y md:divide-y-0 md:divide-x divide-zinc-200">
                <div className="space-y-4 p-6">
                  <h5 className="text-sm font-medium text-zinc-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-500">1</span>
                    Start Range
                  </h5>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Date" name="starts_date" type="date" required />
                    <TimeSelect label="Time" name="starts_time" value={startsTime} onChange={(e) => setStartsTime(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-4 p-6">
                  <h5 className="text-sm font-medium text-zinc-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-500">2</span>
                    End Range
                  </h5>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Date" name="ends_date" type="date" required />
                    <TimeSelect label="Time" name="ends_time" value={endsTime} onChange={(e) => setEndsTime(e.target.value)} required />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2">
                  <Input label="Reason (Optional)" name="reason" placeholder="e.g. Maintenance, Private Event, Renovation" />
                </div>
                <Button type="submit" variant="primary" disabled={addingBlock} className="w-full h-[42px]">
                  {addingBlock ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
              <div className="space-y-4">
                {blockedDates.map(block => {
                  const start = new Date(block.starts_at)
                  const end = new Date(block.ends_at)
                  const dateOpts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }
                  const timeOpts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }
                  
                  return (
                    <div key={block.id} className="group flex flex-col md:flex-row justify-between md:items-center p-5 bg-white border border-zinc-200 rounded-xl shadow-sm hover:border-red-200 hover:shadow-md transition-all duration-300">
                      <div className="flex items-start gap-4">
                        <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-red-50 text-red-500 shrink-0">
                          <Ban className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-900 font-semibold mb-1">
                            <div className="flex items-center gap-1.5">
                              <span>{start.toLocaleString('en-US', dateOpts)}</span>
                              <span className="text-zinc-400 font-normal">at</span>
                              <span className="text-brand">{start.toLocaleString('en-US', timeOpts)}</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-zinc-300 hidden md:block" />
                            <div className="flex items-center gap-1.5">
                              <span>{end.toLocaleString('en-US', dateOpts)}</span>
                              <span className="text-zinc-400 font-normal">at</span>
                              <span className="text-brand">{end.toLocaleString('en-US', timeOpts)}</span>
                            </div>
                          </div>
                          
                          {block.reason ? (
                            <div className="text-sm text-zinc-500 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
                              <span>{block.reason}</span>
                            </div>
                          ) : (
                            <div className="text-sm text-zinc-400 italic flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-200"></span>
                              <span>No specific reason provided</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteBlockedDate(block.id)}
                        className="mt-4 md:mt-0 self-start md:self-center flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                        title="Unblock date"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Unblock</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
