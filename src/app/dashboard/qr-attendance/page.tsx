import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import QrAttendanceClient from './QrAttendanceClient'

export const dynamic = 'force-dynamic'

export default async function QrAttendancePage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id || profile.role !== 'super_admin') {
    redirect('/dashboard')
  }

  // Fetch active employees
  const { data: employees } = await admin
    .from('profiles')
    .select('id, full_name, employee_id, position, avatar_url')
    .eq('org_id', profile.org_id)
    .eq('role', 'employee')
    .eq('is_active', true)
    .order('full_name')

  // Fetch today's QR tokens for audit
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
  const { data: recentTokens } = await admin
    .from('qr_tokens')
    .select(`
      id, token, status, type, expires_at, used_at, created_at, ip_address,
      user:profiles!qr_tokens_user_id_fkey(full_name, employee_id),
      generator:profiles!qr_tokens_generated_by_fkey(full_name)
    `)
    .eq('org_id', profile.org_id)
    .gte('created_at', today)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <QrAttendanceClient
      employees={employees ?? []}
      recentTokens={recentTokens ?? []}
    />
  )
}
