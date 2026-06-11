import { createBrowserRouter, Outlet } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { OwnerLayout } from './components/OwnerLayout'

import Dashboard from './pages/Dashboard'
import ManageVenues from './pages/ManageVenues'
import Bookings from './pages/Bookings'

import Login from './pages/Login'
import Register from './pages/Register'
import RegisterSuccess from './pages/RegisterSuccess'
import LoginSuccess from './pages/LoginSuccess'
import PendingApproval from './pages/PendingApproval'
import Rejected from './pages/Rejected'

import CreateVenueWizard from './pages/venues/CreateVenueWizard'
import VenueOverview from './pages/venues/VenueOverview'
import VenueEdit from './pages/venues/VenueEdit'

// Placeholders for future pages
const Placeholder = ({ title }: { title: string }) => (
  <div className="p-6">
    <h2 className="text-xl font-semibold mb-4">{title}</h2>
    <p className="text-muted-foreground">This page is under construction.</p>
  </div>
)

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/register/success', element: <RegisterSuccess /> },
  { path: '/login/success', element: <LoginSuccess /> },
  { path: '/pending-approval', element: <PendingApproval /> },
  { path: '/rejected', element: <Rejected /> },
  { path: '/403', element: <div>Access denied. You need a venue owner account.</div> },

  {
    path: '/',
    element: (
      <ProtectedRoute>
        <OwnerLayout pageTitle="BookMyVenue Owner">
          <Outlet />
        </OwnerLayout>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      
      // Venues
      { path: 'venues', element: <ManageVenues /> },
      { path: 'venues/new', element: <CreateVenueWizard /> },
      { path: 'venues/:venueId/overview', element: <VenueOverview /> },
      { path: 'venues/:venueId/edit/*', element: <VenueEdit /> },
      { path: 'venues/:venueId/calendar', element: <Placeholder title="Venue Calendar" /> },
      { path: 'venues/:venueId/bookings', element: <Placeholder title="Venue Bookings Queue" /> },

      // Bookings
      { path: 'bookings', element: <Bookings /> },
      { path: 'bookings/:bookingId', element: <Placeholder title="Booking Detail" /> },

      // Financials
      {
        path: 'financials',
        children: [
          { index: true, element: <Placeholder title="Financials Overview" /> },
          { path: 'ledger', element: <Placeholder title="Ledger" /> },
          { path: 'payouts', element: <Placeholder title="Payouts" /> }
        ]
      },

      // Notifications
      { path: 'notifications', element: <Placeholder title="Notifications" /> },

      // Settings
      {
        path: 'settings',
        children: [
          { index: true, element: <Placeholder title="Settings Overview" /> },
          { path: 'profile', element: <Placeholder title="Profile Settings" /> },
          { path: 'account', element: <Placeholder title="Account Settings" /> }
        ]
      }
    ]
  }
])
