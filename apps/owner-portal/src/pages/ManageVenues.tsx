import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, StatusBadge, Button, SectionHeader, Skeleton } from '@venue404/ui'
import { Plus, MapPin, Users, Calendar, Settings, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@venue404/api-client'
import { venueEndpoints } from '@venue404/api-client'

export default function ManageVenues() {
  const [filter, setFilter] = useState('all')
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const client = createClient()
        const data = await venueEndpoints(client).getMyVenues()
        setVenues(data)
      } catch (err) {
        console.error("Failed to fetch venues", err)
      } finally {
        setLoading(false)
      }
    }
    fetchVenues()
  }, [])

  const filteredVenues = filter === 'all' 
    ? venues 
    : venues.filter(v => v.status === filter)

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SectionHeader 
          title="My Venues" 
          description="Manage your listed properties and their settings." 
        />
        <Link to="/venues/new">
          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add new venue
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="border-b border-zinc-200 mb-6">
        <nav className="-mb-px flex w-full overflow-x-auto no-scrollbar" aria-label="Tabs">
          {['all', 'approved', 'pending_approval', 'draft', 'rejected', 'suspended'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`flex-1 whitespace-nowrap py-3 border-b-2 font-medium text-sm transition-all ${
                filter === status 
                  ? 'border-brand-500 text-brand-600' 
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300'
              }`}
            >
              {status === 'all' ? 'All Venues' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </nav>
      </div>

      {/* Venues Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden flex flex-col h-[380px]">
              <Skeleton className="h-48 w-full rounded-none" />
              <div className="p-5 flex-1 flex flex-col space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <div className="bg-zinc-50/50 p-3 border-t border-zinc-200 mt-auto flex gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredVenues.length === 0 ? (
        <Card>
          <div className="p-12 text-center">
            <h3 className="text-lg font-medium text-zinc-900">No venues found</h3>
            <p className="mt-2 text-sm text-zinc-500">
              {filter === 'all' 
                ? "You haven't listed any venues yet. Create your first one." 
                : `No venues with status '${filter}'.`}
            </p>
            {filter === 'all' && (
              <Link to="/venues/new" className="mt-4 inline-block">
                <Button variant="primary">Create Venue</Button>
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredVenues.map(venue => {
            const coverPhoto = venue.photos?.find((p: any) => p.is_cover)?.image_url || venue.photos?.[0]?.image_url
            
            const isWizardCompleted = venue.last_completed_step >= 8
            const targetUrl = venue.status === 'draft' && !isWizardCompleted
              ? `/venues/new?id=${venue.id}&step=${(venue.last_completed_step || 0) + 1}`
              : `/venues/${venue.id}/overview`

            return (
              <Card key={venue.id} className="overflow-hidden flex flex-col h-full transition-all hover:shadow-md hover:border-zinc-300">
                {/* Image Header */}
                <div className="h-48 bg-zinc-100 relative border-b border-zinc-200 flex items-center justify-center">
                {coverPhoto ? (
                  <img src={coverPhoto} alt={venue.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-10 w-10 text-zinc-300" />
                )}
                <div className="absolute top-3 left-3 flex gap-2">
                  {venue.venue_type && (
                    <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-1 rounded-md uppercase tracking-wider">
                      {venue.venue_type.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <div className="absolute top-3 right-3">
                  <StatusBadge 
                    label={venue.status.replace('_', ' ').toUpperCase()} 
                    variant={
                      venue.status === 'approved' ? 'success' :
                      venue.status === 'pending_approval' ? 'pending' :
                      venue.status === 'draft' ? 'neutral' :
                      venue.status === 'rejected' ? 'danger' : 'warning'
                    }
                  />
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-semibold text-zinc-900 truncate">{venue.name}</h3>
                
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{venue.city}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 shrink-0" />
                    <span>Up to {venue.max_capacity}</span>
                  </div>
                </div>


              </div>

              {/* Action Footer */}
              <div className="bg-zinc-50/50 p-3 border-t border-zinc-200 mt-auto flex gap-2">
                {venue.status === 'draft' && !isWizardCompleted ? (
                  <Link to={targetUrl} className="flex-1">
                    <Button variant="primary" className="w-full flex items-center justify-center gap-2">
                      <Settings className="h-4 w-4" />
                      Continue Setup
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to={`/venues/${venue.id}/overview`} className="flex-1">
                      <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
                        <Settings className="h-4 w-4" />
                        Manage Venue
                      </Button>
                    </Link>
                    {venue.status === 'approved' && (
                      <Link to={`/venues/${venue.id}/bookings`} className="flex-1">
                        <Button variant="primary" className="w-full flex items-center justify-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Manage Bookings
                        </Button>
                      </Link>
                    )}
                  </>
                )}
              </div>
            </Card>
          )})}
        </div>
      )}
    </div>
  )
}
