import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ApprovalConfigClient from './ApprovalConfigClient'

export const dynamic = 'force-dynamic'

export default async function ApprovalConfigPage() {
  const serverClient = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return <div className="p-8 text-gray-500">Tidak terautentikasi.</div>

  const { data: myProfile } = await admin
    .from('profiles')
    .select('id, org_id, role')
    .eq('id', user.id)
    .single()

  if (!myProfile?.org_id) return <div className="p-8 text-gray-500">Profil tidak ditemukan.</div>

  const orgId = myProfile.org_id as string

  // Fetch existing approval flows for this org
  const { data: flows } = await admin
    .from('leave_approval_flows')
    .select('id, org_id, division, position, level, role_label, approver_user_id, is_active, created_at')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('division')
    .order('position')
    .order('level')

  // Fetch all active employees for approver dropdown
  const { data: employees } = await admin
    .from('profiles')
    .select('id, full_name, position, division')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('full_name')

  // Fetch positions from positions table
  const { data: positions } = await admin
    .from('positions')
    .select('name, label')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('level', { ascending: false })

  type PositionRow = {
    name: string
    label: string
  }

  type FlowRow = {
    id: string
    org_id: string
    division: string
    position: string
    level: number
    role_label: string
    approver_user_id: string | null
    is_active: boolean
    created_at: string
  }

  type EmployeeRow = {
    id: string
    full_name: string
    position: string | null
    division: string | null
  }

  return (
    <ApprovalConfigClient
      orgId={orgId}
      flows={(flows as unknown as FlowRow[]) ?? []}
      employees={(employees as unknown as EmployeeRow[]) ?? []}
      positions={(positions as unknown as PositionRow[]) ?? []}
    />
  )
}
