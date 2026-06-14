import { useNavigate } from 'react-router-dom'

import {
  Button,
  Card,
} from '@venue404/ui'

import { useAuth } from '../lib/AuthContext'
import { Navbar } from '../components/Navbar'



export default function Profile() {
  const navigate = useNavigate()

  const { user, signOut } = useAuth()

  const profile = {
    full_name: user?.full_name ?? 'User',
    email: user?.email ?? '',
    role: user?.role ?? 'customer',
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}

        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
            Profile
          </h1>

          <p className="mt-2 text-zinc-500">
            Manage your account information.
          </p>
        </div>

        <div className="space-y-6">
          {/* Account Summary */}

          <Card className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700">
                {profile.full_name[0]}
              </div>

              <h2 className="mt-5 text-xl font-semibold text-zinc-900">
                {profile.full_name}
              </h2>

              <p className="mt-1 text-zinc-500">
                {profile.email}
              </p>

              <span className="mt-5 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                Customer
              </span>
            </div>
          </Card>

          {/* Personal Information */}

          <Card className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-zinc-900">
                Personal Information
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                Update your display name.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Full Name
                </label>

                <input
                  defaultValue={profile.full_name}
                  className="
                    w-full
                    rounded-xl
                    border
                    border-zinc-300
                    px-4
                    py-3
                    text-sm
                    outline-none
                    transition
                    focus:border-zinc-900
                  "
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                >
                  Cancel
                </Button>

                <Button>
                  Save Changes
                </Button>
              </div>
            </div>
          </Card>

          {/* Read Only Info */}

          <Card className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-zinc-900">
                Account Details
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                Read-only account information.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Email Address
                </div>

                <div className="mt-1 text-sm text-zinc-900">
                  {profile.email}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Account Role
                </div>

                <div className="mt-1 text-sm text-zinc-900">
                  Customer
                </div>
              </div>
            </div>
          </Card>

          {/* Account Actions */}

          <Card className="rounded-3xl border border-red-100 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">
                  Account
                </h3>

                <p className="mt-1 text-sm text-zinc-500">
                  Sign out from your account on this device.
                </p>
              </div>

              <Button
                variant="secondary"
                onClick={signOut}
              >
                Sign Out
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

