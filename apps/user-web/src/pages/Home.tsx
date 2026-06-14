import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { createClient, venueEndpoints } from '@venue404/api-client'
import { useAuth } from '../lib/AuthContext'

import { Navbar }  from '../components/Navbar'
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
  return venueEndpoints(client).search(query)
}

export default function Home() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // ── Search state (mirrors URL params) ────────────────────────────────────
  const [q,         setQ]         = useState(searchParams.get('q')          ?? '')
  const [city,      setCity]      = useState(searchParams.get('city')       ?? '')
  const [venueType, setVenueType] = useState(searchParams.get('venue_type') ?? '')


// TanStack Query — key includes serialised URL params, auto-refetches on change
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['venues', 'search', searchParams.toString()],
    queryFn:  () => searchVenues(searchParams),
  })

  const venues     = data?.items ?? []
  const total      = data?.total ?? null
  const hasFilters = !!(q || city || venueType)

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (q)         next.q          = q
    if (city)      next.city       = city
    if (venueType) next.venue_type = venueType
    setSearchParams(next)
  }

  const handleCategoryClick = (type: string) => {
    const next = new URLSearchParams(searchParams)
    if (venueType === type) {
      setVenueType('')
      next.delete('venue_type')
    } else {
      setVenueType(type)
      next.set('venue_type', type)
    }
    setSearchParams(next)
  }

  const handleClearFilters = () => {
    setQ('')
    setCity('')
    setVenueType('')
    setSearchParams({})
  }


  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

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
        error={isError ? (error as Error).message : null}
        hasFilters={hasFilters}
        onVenueClick={(id) => navigate(`/venues/${id}`)}
        onRetry={() => refetch()}
        onClearFilters={handleClearFilters}
      />

      <TrustStrip />
      <HomeFooter />
    </div>
  )
}