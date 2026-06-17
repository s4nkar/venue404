import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { AppShell, Logo, type NavItemConfig } from '@venue404/ui'
import {
  LayoutDashboard, Building2, CalendarDays, Wallet, Bell, Settings
} from 'lucide-react'

const NAV: NavItemConfig[] = [
  { label: 'Dashboard',     href: '/',               icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'My Venues',     href: '/venues',         icon: <Building2 className="h-4 w-4" /> },
  { label: 'Bookings',      href: '/bookings',       icon: <CalendarDays className="h-4 w-4" /> },
  { label: 'Financials',    href: '/financials',     icon: <Wallet className="h-4 w-4" /> },
]

type OwnerLayoutProps = {
  pageTitle: string
  pageSubtitle?: string
  children: React.ReactNode
}

export function OwnerLayout({ pageTitle, pageSubtitle, children }: OwnerLayoutProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <AppShell
      navItems={NAV}
      activePath={location.pathname}
      onNavigate={navigate}
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
      brand={<Logo variant="dark" />}
      user={user ? {
        name: user.profile.full_name ?? user.email ?? 'Owner',
        email: user.email ?? '',
        role: 'Venue Owner',
      } : undefined}
      onSignOut={handleSignOut}
    >
      {children}
    </AppShell>
  )
}
