import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { createClient, venueEndpoints } from '@venue404/api-client'
import { HomeNavbar }  from '../components/home/HomeNavbar'
import { HeroSearch }  from '../components/home/HeroSearch'
import { VenueGrid }   from '../components/home/VenueGrid'
import { TrustStrip }  from '../components/home/TrustStrip'
import { HomeFooter }  from '../components/home/HomeFooter'


async function searchVenues(params: URLSearchParams) {
  const client = createClient()
  const query: Record<string, any> = { page: 1, page_size: 100 }
  if (params.get('q'))          query.q          = params.get('q')
  if (params.get('city'))       query.city       = params.get('city')
  if (params.get('venue_type')) query.venue_type = params.get('venue_type')
  if (params.get('capacity'))   query.capacity   = Number(params.get('capacity'))
  return venueEndpoints(client).search(query)
}

export default function Home() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // ── Search state (mirrors URL params) ────────────────────────────────────
  const [q,         setQ]         = useState(searchParams.get('q')          ?? '')
  const [city,      setCity]      = useState(searchParams.get('city')       ?? '')
  const [venueType, setVenueType] = useState(searchParams.get('venue_type') ?? '')
  const [capacity,  setCapacity]  = useState(searchParams.get('capacity')   ?? '')

  const hasFilters = !!(q || city || venueType || capacity)

  // TanStack Query — key includes serialised URL params, auto-refetches on change
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['venues', 'search', searchParams.toString()],
    queryFn:  () => searchVenues(searchParams),
  })

  const venues = data?.items ?? []
  const total  = data?.total ?? null

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (q)         next.q          = q
    if (city)      next.city       = city
    if (venueType) next.venue_type = venueType
    if (capacity)  next.capacity   = capacity
    setSearchParams(next)
  }

  const handleCategoryClick = (type: string) => {
    const next = new URLSearchParams(searchParams)
    const newType = venueType === type ? '' : type
    setVenueType(newType)
    if (newType) next.set('venue_type', newType)
    else next.delete('venue_type')
    setSearchParams(next)
  }

  const handleVenueTypeChange = (type: string) => {
    setVenueType(type)
    const next = new URLSearchParams(searchParams)
    if (type) next.set('venue_type', type)
    else next.delete('venue_type')
    setSearchParams(next)
  }

  const handleCapacityChange = (value: string) => {
    setCapacity(value)
    const next = new URLSearchParams(searchParams)
    if (value) next.set('capacity', value)
    else next.delete('capacity')
    setSearchParams(next)
  }

  const handleClearFilters = () => {
    setQ('')
    setCity('')
    setVenueType('')
    setCapacity('')
    setSearchParams({})
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      <HomeNavbar />

      <HeroSearch
        q={q}
        city={city}
        venueType={venueType}
        hasFilters={hasFilters}
        onQChange={setQ}
        onCityChange={setCity}
        onSubmit={handleSearchSubmit}
        onCategoryClick={handleCategoryClick}
        onClearFilters={handleClearFilters}
      />

      <VenueGrid
        venues={venues}
        total={total}
        loading={isLoading}
        error={isError ? (typeof (error as any)?.message === 'string' ? (error as any).message : 'Failed to load venues. Please try again.') : null}
        hasFilters={hasFilters}
        venueType={venueType}
        capacity={capacity}
        onVenueClick={(id) => navigate(`/venues/${id}`)}
        onRetry={() => refetch()}
        onClearFilters={handleClearFilters}
        onVenueTypeChange={handleVenueTypeChange}
        onCapacityChange={handleCapacityChange}
      />

      <TrustStrip />
      <HomeFooter />
    </div>
  )
}
