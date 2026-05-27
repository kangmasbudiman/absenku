import { createAdminClient } from '@/lib/supabase/admin'
import { compareDescriptors, compareFaceData, type FaceData } from '@/lib/face-compare'
import { encryptDescriptor, decryptDescriptor, encryptFaceData, decryptFaceData } from '@/lib/face-crypto'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { user_id, captured_face_data } = body as {
    user_id?: string
    captured_face_data?: {
      descriptor?: number[]
      geometry?: FaceData
    }
  }

  if (!user_id || !captured_face_data) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: registration } = await admin
    .from('face_registrations')
    .select('face_data, face_data_encrypted, face_descriptor_encrypted')
    .eq('user_id', user_id)
    .maybeSingle()

  if (!registration) {
    return NextResponse.json({
      verified: false,
      similarity: 0,
      face_data_exists: false,
    })
  }

  // Decrypt face data (prefer encrypted, fallback to plain)
  let storedFaceData: FaceData | null = null
  if (registration.face_data_encrypted) {
    storedFaceData = decryptFaceData(registration.face_data_encrypted) as FaceData
  } else if (registration.face_data) {
    storedFaceData = registration.face_data as FaceData
  }

  let result: { isMatch: boolean; similarity: number }

  if (captured_face_data.descriptor && registration.face_descriptor_encrypted) {
    const storedDescriptor = decryptDescriptor(registration.face_descriptor_encrypted)
    result = compareDescriptors(captured_face_data.descriptor, storedDescriptor)
  } else if (captured_face_data.geometry && storedFaceData) {
    result = compareFaceData(captured_face_data.geometry, storedFaceData)
  } else {
    return NextResponse.json({
      verified: false,
      similarity: 0,
      face_data_exists: false,
    })
  }

  // Store encrypted descriptor for future use (upgrade from legacy face_data)
  if (captured_face_data.descriptor && !registration.face_descriptor_encrypted && result.isMatch) {
    const encryptedDescriptor = encryptDescriptor(captured_face_data.descriptor)
    const updates: Record<string, unknown> = {
      face_descriptor_encrypted: encryptedDescriptor,
    }

    // Also encrypt face_data if not yet encrypted
    if (registration.face_data && !registration.face_data_encrypted) {
      updates.face_data_encrypted = encryptFaceData(registration.face_data)
    }

    await admin
      .from('face_registrations')
      .update(updates)
      .eq('user_id', user_id)
  }

  return NextResponse.json({
    verified: result.isMatch,
    similarity: result.similarity,
    face_data_exists: true,
  })
}
