import { createAdminClient } from '@/lib/supabase/admin'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/qr-attendance/validate?token=xxx — Public token validation
export async function GET(req: NextRequest) {
  // Rate limit: max 30 per IP per minute
  const clientIp = getClientIp(req)
  if (isRateLimited(`qr-validate:${clientIp}`, 30, 60_000)) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan.' },
      { status: 429 }
    )
  }

  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ valid: false, error: 'Token diperlukan' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Look up token
  const { data: qrToken } = await admin
    .from('qr_tokens')
    .select('id, token, status, expires_at, type, user_id')
    .eq('token', token)
    .single()

  if (!qrToken) {
    return NextResponse.json({ valid: false, error: 'Token tidak ditemukan' })
  }

  if (qrToken.status !== 'active') {
    return NextResponse.json({
      valid: false,
      error: qrToken.status === 'used' ? 'Token sudah digunakan' : 'Token sudah kadaluarsa',
    })
  }

  const now = new Date()
  if (new Date(qrToken.expires_at) <= now) {
    // Mark as expired
    await admin.from('qr_tokens').update({ status: 'expired' }).eq('id', qrToken.id)
    return NextResponse.json({ valid: false, error: 'Token sudah kadaluarsa' })
  }

  // Fetch employee info
  const { data: employee } = await admin
    .from('profiles')
    .select('full_name, employee_id, position, org_id')
    .eq('id', qrToken.user_id)
    .single()

  if (!employee) {
    return NextResponse.json({ valid: false, error: 'Karyawan tidak ditemukan' })
  }

  // Fetch org info
  const { data: org } = await admin
    .from('organizations')
    .select('name, app_name')
    .eq('id', employee.org_id)
    .single()

  return NextResponse.json({
    valid: true,
    employee: {
      full_name: employee.full_name,
      employee_id: employee.employee_id,
      position: employee.position,
    },
    org_name: org?.app_name || org?.name || 'AbsenKu',
    type: qrToken.type,
    expires_at: qrToken.expires_at,
  })
}
