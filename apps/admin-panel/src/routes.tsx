import { createBrowserRouter } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import VenueApprovals from './pages/VenueApprovals'
import Users from './pages/Users'

export const router = createBrowserRouter([
  { path: '/', element: <Dashboard /> },
  { path: '/approvals', element: <VenueApprovals /> },
  { path: '/users', element: <Users /> },
])
