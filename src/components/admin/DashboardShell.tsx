'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import InspectBanner from './InspectBanner'

interface Props {
  profile: {
    full_name: string
    role: string
    position?: string | null
    org_id?: string | null
    avatar_url?: string | null
    organizations?: { name: string; company_code: string; app_name: string } | null
  }
  viewingOrg?: { id: string; name: string } | null
  children: React.ReactNode
}

export default function DashboardShell({ profile, viewingOrg, children }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const isInspecting = !!viewingOrg

  return (
    <div className="flex h-screen bg-gray-50/80 overflow-hidden">
      <div className={`transition-all duration-300 shrink-0 ${collapsed ? 'w-16' : 'w-64'}`}>
        <Sidebar profile={profile} collapsed={collapsed} isInspecting={isInspecting} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isInspecting && <InspectBanner orgName={viewingOrg!.name} />}
        <Navbar
          onToggle={() => setCollapsed(!collapsed)}
          collapsed={collapsed}
          profile={profile}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
