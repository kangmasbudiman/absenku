import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const orgCode = req.nextUrl.searchParams.get('org_code')
  if (!orgCode) {
    return NextResponse.json({ error: 'org_code diperlukan' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Cari org by company_code
  const { data: org, error: orgError } = await admin
    .from('organizations')
    .select('id, name, address')
    .eq('company_code', orgCode)
    .single()

  if (orgError || !org) {
    return NextResponse.json({ error: 'Kode perusahaan tidak valid' }, { status: 404 })
  }

  // Ambil karyawan aktif (opsional filter by emp_code)
  const empCode = req.nextUrl.searchParams.get('emp_code')

  let query = admin
    .from('profiles')
    .select('id, full_name, employee_id, position')
    .eq('org_id', org.id)
    .eq('role', 'employee')
    .eq('is_active', true)

  if (empCode?.trim()) {
    query = query.eq('employee_id', empCode.trim())
  }

  const { data: employees, error: empError } = await query.order('full_name')

  if (empError) {
    return NextResponse.json({ error: 'Gagal memuat data' }, { status: 500 })
  }

  // Check face registrations separately
  const empIds = (employees ?? []).map(e => e.id)
  const faceRegUserIds = new Set<string>()

  if (empIds.length > 0) {
    const { data: faceRegs } = await admin
      .from('face_registrations')
      .select('user_id')
      .in('user_id', empIds)
    for (const r of (faceRegs ?? [])) {
      faceRegUserIds.add(r.user_id)
    }
  }

  return NextResponse.json({
    org: { id: org.id, name: org.name, address: org.address },
    face_registration_count: faceRegUserIds.size,
    employees: (employees ?? []).map(e => ({
      id: e.id,
      full_name: e.full_name,
      employee_id: e.employee_id,
      position: e.position,
      face_data_exists: faceRegUserIds.has(e.id),
    })),
  })
}
