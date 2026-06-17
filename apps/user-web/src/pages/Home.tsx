import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { createClient, venueEndpoints } from '@venue404/api-client'

import { HomeNavbar } from '../components/home/HomeNavbar'
import { HeroSearch } from '../components/home/HeroSearch'
import { CategorySection } from '../components/home/CategorySection'
import { TrendingVenuesSection } from '../components/home/TrendingVenuesSection'
import { VenueGrid } from '../components/home/VenueGrid'
import { TrustStrip } from '../components/home/TrustStrip'
import { HomeFooter } from '../components/home/HomeFooter'
import {
  ProgrammeMetrics,
  WhyVenue404,
  DeepResearchSection,
  IntelligentPlatform,
} from '../components/home/HomeLandingSections'

async function searchVenues(params: URLSearchParams) {
  const client = createClient()
  const query: Record<string, any> = { page: 1, page_size: 100 }
  if (params.get('q')) query.q = params.get('q')
  if (params.get('city')) query.city = params.get('city')
  if (params.get('venue_type')) query.venue_type = params.get('venue_type')
  if (params.get('capacity')) query.capacity = Number(params.get('capacity'))
  return venueEndpoints(client).search(query)
}

export default function Home() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const [city, setCity] = useState(searchParams.get('city') ?? '')
  const [venueType, setVenueType] = useState(searchParams.get('venue_type') ?? '')
  const [capacity, setCapacity] = useState(searchParams.get('capacity') ?? '')

  const hasFilters = !!(q || city || venueType || capacity)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['venues', 'search', searchParams.toString()],
    queryFn: () => searchVenues(searchParams),
  })

  // Always fetch unfiltered venues for the trending section
  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ['venues', 'trending'],
    queryFn: () => venueEndpoints(createClient()).search({ page: 1, page_size: 8 }),
    enabled: !hasFilters,
    staleTime: 5 * 60 * 1000,
  })

  const venues = data?.items ?? []
  const total = data?.total ?? null
  const trendingVenues = trendingData?.items ?? []

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (q) next.q = q
    if (city) next.city = city
    if (venueType) next.venue_type = venueType
    if (capacity) next.capacity = capacity
    setSearchParams(next)
  }

  function handleCategoryClick(type: string) {
    setVenueType(type)
    const next = new URLSearchParams()
    next.set('venue_type', type)
    setSearchParams(next)
  }

  function handleVenueTypeChange(type: string) {
    setVenueType(type)
    const next = new URLSearchParams(searchParams)
    if (type) next.set('venue_type', type)
    else next.delete('venue_type')
    setSearchParams(next)
  }

  function handleCapacityChange(value: string) {
    setCapacity(value)
    const next = new URLSearchParams(searchParams)
    if (value) next.set('capacity', value)
    else next.delete('capacity')
    setSearchParams(next)
  }

  function handleClearFilters() {
    setQ(''); setCity(''); setVenueType(''); setCapacity('')
    setSearchParams({})
  }

  function handleViewAll() {
    // View all → clear filters, show full results
    handleClearFilters()
    // small scroll to results
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }

  return (
    <div className="min-h-screen bg-white">
      <HomeNavbar />

      {/* ── Hero (full on landing, compact on search) ──────────────────── */}
      <HeroSearch
        q={q}
        city={city}
        venueType={venueType}
        capacity={capacity}
        hasFilters={hasFilters}
        onQChange={setQ}
        onCityChange={setCity}
        onCapacityChange={handleCapacityChange}
        onSubmit={handleSearchSubmit}
        onCategoryClick={handleCategoryClick}
        onClearFilters={handleClearFilters}
      />

      {hasFilters ? (
        /* ── Search results ──────────────────────────────────────────── */
        <VenueGrid
          venues={venues}
          total={total}
          loading={isLoading}
          error={isError ? ((error as any)?.message ?? 'Failed to load venues.') : null}
          hasFilters={hasFilters}
          venueType={venueType}
          capacity={capacity}
          onVenueClick={(id) => navigate(`/venues/${id}`)}
          onRetry={refetch}
          onClearFilters={handleClearFilters}
          onVenueTypeChange={handleVenueTypeChange}
          onCapacityChange={handleCapacityChange}
        />
      ) : (
        /* ── Landing page sections ───────────────────────────────────── */
        <>
          <CategorySection onCategoryClick={handleCategoryClick} />



          <ProgrammeMetrics />

          <WhyVenue404 />

          <TrendingVenuesSection
            venues={trendingVenues}
            loading={trendingLoading}
            onVenueClick={(id) => navigate(`/venues/${id}`)}
            onViewAll={handleViewAll}
          />

          <DeepResearchSection />

          <IntelligentPlatform />

          <TrustStrip />
        </>
      )}

      <HomeFooter />
    </div>
  )
}
