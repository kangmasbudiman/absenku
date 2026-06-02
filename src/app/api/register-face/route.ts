import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encryptDescriptor, encryptFaceData } from '@/lib/face-crypto'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST /api/register-face — Admin registers employee face from dashboard
export async function POST(req: NextRequest) {
  // 1. Validate admin auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
  }

  // Check admin role
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id, org_id, role')
    .eq('id', user.id)
    .single()

  if (!adminProfile || !['admin', 'super_admin'].includes(adminProfile.role)) {
    return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
  }

  // 2. Parse request
  const body = await req.json()
  const { user_id, photo_base64, descriptor, geometry } = body as {
    user_id?: string
    photo_base64?: string
    descriptor?: number[]
    geometry?: unknown
  }

  if (!user_id || !photo_base64 || !descriptor) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  }

  // Validate descriptor is 128 floats
  if (!Array.isArray(descriptor) || descriptor.length !== 128) {
    return NextResponse.json({ error: 'Descriptor tidak valid' }, { status: 400 })
  }

  // 3. Validate employee belongs to admin's org
  const admin = createAdminClient()

  const { data: empProfile } = await admin
    .from('profiles')
    .select('id, org_id, is_active')
    .eq('id', user_id)
    .single()

  if (!empProfile || empProfile.org_id !== adminProfile.org_id || !empProfile.is_active) {
    return NextResponse.json({ error: 'Karyawan tidak valid' }, { status: 404 })
  }

  // 4. Upload face photo to storage
  const photoBytes = Buffer.from(photo_base64, 'base64')
  const photoPath = `${user_id}/registered_${Date.now()}.jpg`

  const { error: uploadError } = await admin.storage
    .from('attendance-photos')
    .upload(photoPath, photoBytes, { contentType: 'image/jpeg', upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: 'Gagal upload foto wajah: ' + uploadError.message }, { status: 500 })
  }

  // Generate signed URL
  const { data: urlData } = await admin.storage
    .from('attendance-photos')
    .createSignedUrl(photoPath, 31536000) // 1 year

  const photoUrl = urlData?.signedUrl ?? ''

  // 5. Encrypt descriptor and geometry
  const encryptedDescriptor = encryptDescriptor(descriptor)
  const encryptedGeometry = geometry ? encryptFaceData(geometry) : null

  // 6. Upsert face registration
  const upsertData: Record<string, unknown> = {
    user_id,
    face_descriptor_encrypted: encryptedDescriptor,
    face_photo_path: photoPath,
    face_photo_url: photoUrl,
    updated_at: new Date().toISOString(),
  }

  if (encryptedGeometry) {
    upsertData.face_data_encrypted = encryptedGeometry
  }

  const { error: upsertError } = await admin
    .from('face_registrations')
    .upsert(upsertData, { onConflict: 'user_id' })

  if (upsertError) {
    return NextResponse.json({ error: 'Gagal menyimpan data wajah: ' + upsertError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    photo_url: photoUrl,
  })
}
