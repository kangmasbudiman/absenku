import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/face-photo?user_id=xxx — generate temporary signed URL for face photo
// Only accessible by authenticated admins
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Get the storage path (not the signed URL — those are not stored)
  const { data: reg } = await admin
    .from('face_registrations')
    .select('face_photo_path, face_photo_url')
    .eq('user_id', userId)
    .maybeSingle()

  if (!reg) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Prefer storage path, fallback to extracting from signed URL
  let photoPath = reg.face_photo_path

  if (!photoPath && reg.face_photo_url) {
    try {
      const parsed = new URL(reg.face_photo_url)
      const segments = parsed.pathname.split('/')
      const objIdx = segments.indexOf('object')
      if (objIdx >= 0 && segments.length > objIdx + 2) {
        photoPath = segments.slice(objIdx + 2).join('/')
      }
    } catch {}
  }

  if (!photoPath) {
    return NextResponse.json({ error: 'No photo' }, { status: 404 })
  }

  // Generate short-lived signed URL (5 minutes)
  const { data, error } = await admin.storage
    .from('attendance-photos')
    .createSignedUrl(photoPath, 300)

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}
