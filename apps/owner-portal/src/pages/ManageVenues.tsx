import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, StatusBadge, Button, SectionHeader } from '@venue404/ui'
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
      <div className="flex gap-2 border-b border-zinc-200 pb-2 overflow-x-auto">
        {['all', 'approved', 'pending_approval', 'draft', 'rejected', 'suspended'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              filter === status 
                ? 'bg-zinc-100 text-zinc-900' 
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            {status === 'all' ? 'All Venues' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Venues Grid */}
      {loading ? (
        <div className="text-center py-12 text-zinc-500">Loading venues...</div>
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
            return (
            <Link key={venue.id} to={`/venues/${venue.id}/overview`} className="block group">
              <Card className="overflow-hidden flex flex-col h-full transition-all group-hover:shadow-md group-hover:border-zinc-300">
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
              <div className="bg-zinc-50/50 p-3 border-t border-zinc-200 mt-auto">
                <div className="block">
                  <Button variant="secondary" className="w-full flex items-center justify-center gap-2 pointer-events-none">
                    <Settings className="h-4 w-4" />
                    Manage
                  </Button>
                </div>
              </div>
            </Card>
            </Link>
          )})}
        </div>
      )}
    </div>
  )
}
