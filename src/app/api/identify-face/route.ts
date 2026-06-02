import { createAdminClient } from '@/lib/supabase/admin'
import { decryptDescriptor } from '@/lib/face-crypto'
import { findBestMatch } from '@/lib/face-compare'
import { isRateLimited, getClientIp } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Rate limit: max 20 identification requests per IP per minute
  const clientIp = getClientIp(req)
  if (isRateLimited(`identify:${clientIp}`, 20, 60_000)) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan. Tunggu beberapa saat.', identified: false },
      { status: 429 }
    )
  }

  const body = await req.json()
  const { org_code, captured_descriptor } = body as {
    org_code?: string
    captured_descriptor?: number[]
  }

  if (!org_code || !captured_descriptor) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  }

  // Validate descriptor is 128 floats
  if (!Array.isArray(captured_descriptor) || captured_descriptor.length !== 128) {
    return NextResponse.json({ error: 'Descriptor tidak valid' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Lookup organization
  const { data: org } = await admin
    .from('organizations')
    .select('id')
    .eq('company_code', org_code)
    .single()

  if (!org) {
    return NextResponse.json({ identified: false, similarity: 0 })
  }

  // Get all active employees in this org
  const { data: employees } = await admin
    .from('profiles')
    .select('id, full_name, employee_id, position')
    .eq('org_id', org.id)
    .eq('role', 'employee')
    .eq('is_active', true)

  if (!employees?.length) {
    return NextResponse.json({ identified: false, similarity: 0 })
  }

  const empIds = employees.map(e => e.id)

  // Get all face registrations with encrypted descriptors
  const { data: faceRegs } = await admin
    .from('face_registrations')
    .select('user_id, face_descriptor_encrypted')
    .in('user_id', empIds)

  if (!faceRegs?.length) {
    return NextResponse.json({ identified: false, similarity: 0 })
  }

  // Decrypt all descriptors and build comparison set
  const storedDescriptors: Array<{ user_id: string; descriptor: number[] }> = []
  const empMap = new Map(employees.map(e => [e.id, e]))

  for (const reg of faceRegs) {
    if (!reg.face_descriptor_encrypted) continue
    try {
      const descriptor = decryptDescriptor(reg.face_descriptor_encrypted)
      storedDescriptors.push({ user_id: reg.user_id, descriptor })
    } catch {
      // Skip corrupted entries
    }
  }

  if (storedDescriptors.length === 0) {
    return NextResponse.json({ identified: false, similarity: 0 })
  }

  // Find best match
  const match = findBestMatch(captured_descriptor, storedDescriptors)

  if (!match || !match.isMatch) {
    return NextResponse.json({
      identified: false,
      similarity: match?.similarity ?? 0,
    })
  }

  const emp = empMap.get(match.user_id)
  if (!emp) {
    return NextResponse.json({ identified: false, similarity: 0 })
  }

  return NextResponse.json({
    identified: true,
    user_id: emp.id,
    full_name: emp.full_name,
    employee_id: emp.employee_id,
    position: emp.position,
    similarity: match.similarity,
  })
}
