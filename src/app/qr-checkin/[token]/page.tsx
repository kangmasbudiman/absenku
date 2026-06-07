import { createAdminClient } from '@/lib/supabase/admin'
import QrCheckinClient from './QrCheckinClient'

export const dynamic = 'force-dynamic'

export default async function QrCheckinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Validate token server-side for initial render
  const admin = createAdminClient()

  const { data: qrToken } = await admin
    .from('qr_tokens')
    .select('token, status, expires_at, type, user_id, org_id')
    .eq('token', token)
    .single()

  let isValid = false
  let employeeName: string | null = null
  let employeeId: string | null = null
  let employeePosition: string | null = null
  let orgName: string | null = null
  let tokenType: string = 'checkin'
  let expiresAt: string | null = null

  if (qrToken && qrToken.status === 'active') {
    const now = new Date()
    if (new Date(qrToken.expires_at) > now) {
      isValid = true

      const { data: employee } = await admin
        .from('profiles')
        .select('full_name, employee_id, position, org_id')
        .eq('id', qrToken.user_id)
        .single()

      if (employee) {
        employeeName = employee.full_name
        employeeId = employee.employee_id
        employeePosition = employee.position

        const { data: org } = await admin
          .from('organizations')
          .select('name, app_name')
          .eq('id', employee.org_id)
          .single()

        orgName = org?.app_name || org?.name || 'AbsenKu'
      }

      tokenType = qrToken.type
      expiresAt = qrToken.expires_at
    }
  }

  return (
    <QrCheckinClient
      token={token}
      isValid={isValid}
      employeeName={employeeName}
      employeeId={employeeId}
      employeePosition={employeePosition}
      orgName={orgName}
      tokenType={tokenType}
      expiresAt={expiresAt}
    />
  )
}
