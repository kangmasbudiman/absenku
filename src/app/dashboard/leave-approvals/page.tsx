import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import LeaveApprovalClient from './LeaveApprovalClient'

export const dynamic = 'force-dynamic'

export default async function LeaveApprovalsPage() {
  const serverClient = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return <div className="p-8 text-gray-500">Tidak terautentikasi.</div>

  const { data: myProfile, error: profileError } = await admin
    .from('profiles')
    .select('id, org_id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Error fetching profile:', profileError)
    return <div className="p-8 text-red-500">Terjadi kesalahan saat memuat profil.</div>
  }

  if (!myProfile?.org_id) return <div className="p-8 text-gray-500">Profil tidak ditemukan atau org_id tidak valid.</div>

  const orgId = myProfile.org_id

  // Fetch all employees in the org to get their user ids
  const { data: employees, error: employeesError } = await admin
    .from('profiles')
    .select('id, full_name, division, position')
    .eq('org_id', orgId)

  if (employeesError) {
    console.error('Error fetching employees:', employeesError)
    return <div className="p-8 text-red-500">Terjadi kesalahan saat memuat data karyawan.</div>
  }

  const employeeIds = (employees ?? []).map((e: { id: string }) => e.id)

  // Fetch leave requests for org employees
  const { data: leaveRequests, error: leaveRequestsError } = await admin
    .from('leave_requests')
    .select('id, user_id, type, start_date, end_date, total_days, reason, status, reviewed_by, reviewed_at, review_notes, created_at')
    .in('user_id', employeeIds.length > 0 ? employeeIds : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: false })

  if (leaveRequestsError) {
    console.error('Error fetching leave requests:', leaveRequestsError)
    return <div className="p-8 text-red-500">Terjadi kesalahan saat memuat permohonan cuti.</div>
  }

  const requestIds = (leaveRequests ?? []).map((r: { id: string }) => r.id)

  // Fetch approval steps for those requests (separate query to avoid FK ambiguity)
  const { data: allSteps, error: stepsError } = await admin
    .from('leave_approval_steps')
    .select('id, leave_request_id, level, role_label, approver_user_id, status, acted_at, created_at')
    .in('leave_request_id', requestIds.length > 0 ? requestIds : ['00000000-0000-0000-0000-000000000000'])
    .order('level', { ascending: true })

  if (stepsError) {
    console.error('Error fetching approval steps:', stepsError)
    return <div className="p-8 text-red-500">Terjadi kesalahan saat memuat langkah persetujuan.</div>
  }

  // Build employee map
  type EmployeeRow = { id: string; full_name: string; division: string | null; position: string | null }
  const employeeMap = new Map<string, EmployeeRow>(
    (employees as unknown as EmployeeRow[] ?? []).map(e => [e.id, e])
  )

  // Build steps map grouped by leave_request_id
  type StepRow = {
    id: string
    leave_request_id: string
    level: number
    role_label: string
    approver_user_id: string | null
    status: string
    acted_at: string | null
    created_at: string
  }
  const stepsMap = new Map<string, StepRow[]>()
  for (const step of (allSteps as unknown as StepRow[] ?? [])) {
    const arr = stepsMap.get(step.leave_request_id) ?? []
    arr.push(step)
    stepsMap.set(step.leave_request_id, arr)
  }

  // Collect unique approver user ids to fetch their names
  const approverIds = new Set<string>()
  for (const step of (allSteps as unknown as StepRow[] ?? [])) {
    if (step.approver_user_id) approverIds.add(step.approver_user_id)
  }

  const { data: approverProfiles } = approverIds.size > 0
    ? await admin
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(approverIds))
    : { data: [] }

  type ApproverProfile = { id: string; full_name: string }
  const approverMap = new Map<string, string>(
    (approverProfiles as unknown as ApproverProfile[] ?? []).map(p => [p.id, p.full_name])
  )

  // Merge everything
  type LeaveRequestRow = {
    id: string
    user_id: string
    type: string
    start_date: string
    end_date: string
    total_days: number
    reason: string | null
    status: string
    reviewed_by: string | null
    reviewed_at: string | null
    review_notes: string | null
    created_at: string
  }

  const requests = (leaveRequests as unknown as LeaveRequestRow[] ?? []).map(req => {
    const emp = employeeMap.get(req.user_id)
    const steps = (stepsMap.get(req.id) ?? []).map(s => ({
      ...s,
      approver_name: s.approver_user_id ? (approverMap.get(s.approver_user_id) ?? null) : null,
    }))
    return {
      ...req,
      employee_name: emp?.full_name ?? 'Unknown',
      employee_division: emp?.division ?? null,
      employee_position: emp?.position ?? null,
      steps,
    }
  })

  return (
    <LeaveApprovalClient
      requests={requests}
      currentUserId={user.id}
      currentUserRole={myProfile.role}
    />
  )
}
