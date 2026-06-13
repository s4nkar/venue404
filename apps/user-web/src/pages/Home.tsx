import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { createClient, venueEndpoints } from '@venue404/api-client'
import { useAuth } from '../lib/AuthContext'

import { HomeNavbar }  from '../components/home/HomeNavbar'
import { HeroSearch }  from '../components/home/HeroSearch'
import { VenueGrid }   from '../components/home/VenueGrid'
import { TrustStrip }  from '../components/home/TrustStrip'
import { HomeFooter }  from '../components/home/HomeFooter'
import type { SearchResult } from '../types'

export default function Home() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // ── Search state (mirrors URL params) ────────────────────────────────────
  const [q,         setQ]         = useState(searchParams.get('q')          ?? '')
  const [city,      setCity]      = useState(searchParams.get('city')       ?? '')
  const [venueType, setVenueType] = useState(searchParams.get('venue_type') ?? '')

  // ── Results state ─────────────────────────────────────────────────────────
  const [venues,  setVenues]  = useState<SearchResult[]>([])
  const [total,   setTotal]   = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchVenues = useCallback(async (params: URLSearchParams) => {
    setLoading(true)
    setError(null)
    try {
      const client = createClient()
      const query: Record<string, any> = { page: 1, page_size: 100 }
      if (params.get('q'))          query.q          = params.get('q')
      if (params.get('city'))       query.city       = params.get('city')
      if (params.get('venue_type')) query.venue_type = params.get('venue_type')

      const data = await venueEndpoints(client).search(query)
      setVenues(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch (err: any) {
      setError(err.message ?? 'Failed to load venues')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVenues(searchParams)
  }, [searchParams, fetchVenues])

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

  const hasFilters = !!(q || city || venueType)

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      <HomeNavbar
        isLoggedIn={!!user}
        onSignOut={signOut}
      />

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
        loading={loading}
        error={error}
        hasFilters={hasFilters}
        onVenueClick={(id) => navigate(`/venues/${id}`)}
        onRetry={() => fetchVenues(searchParams)}
        onClearFilters={handleClearFilters}
      />

      <TrustStrip />
      <HomeFooter />
    </div>
  )
}