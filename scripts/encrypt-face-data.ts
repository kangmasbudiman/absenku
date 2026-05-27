// One-time script to encrypt existing face_data and extract photo paths
// Run with: npx tsx scripts/encrypt-face-data.ts
//
// Prerequisites:
// 1. Run create_face_registrations.sql
// 2. Run encrypt_face_data.sql
// 3. FACE_ENCRYPTION_KEY must be set in .env.local

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function extractPhotoPath(url: string): string | null {
  try {
    const parsed = new URL(url)
    const segments = parsed.pathname.split('/')
    const objIdx = segments.indexOf('object')
    // signed URL format: /storage/v1/object/sign/{bucket}/{path}
    // public URL format: /storage/v1/object/public/{bucket}/{path}
    if (objIdx >= 0 && segments.length > objIdx + 2) {
      return segments.slice(objIdx + 2).join('/')
    }
  } catch {}
  return null
}

async function main() {
  console.log('Reading face_registrations with unencrypted data...')

  const { data: regs, error } = await supabase
    .from('face_registrations')
    .select('id, user_id, face_data, face_photo_url')
    .or('face_data_encrypted.is.null,face_data.not.is.null')

  if (error) {
    console.error('Failed to read:', error)
    process.exit(1)
  }

  if (!regs || regs.length === 0) {
    console.log('No data to encrypt.')
    process.exit(0)
  }

  console.log(`Found ${regs.length} registrations to encrypt.`)

  const { encryptFaceData } = await import('../src/lib/face-crypto')

  let migrated = 0
  let failed = 0

  for (const reg of regs) {
    try {
      const updates: Record<string, string | null> = {}

      // Encrypt face_data if present and not yet encrypted
      if (reg.face_data) {
        updates.face_data_encrypted = encryptFaceData(reg.face_data)
      }

      // Extract storage path from signed URL
      if (reg.face_photo_url) {
        const path = extractPhotoPath(reg.face_photo_url)
        if (path) {
          updates.face_photo_path = path
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('face_registrations')
          .update(updates)
          .eq('id', reg.id)

        if (updateError) throw updateError
        migrated++
        console.log(`✓ Encrypted ${reg.user_id}`)
      }
    } catch (err) {
      failed++
      console.error(`✗ Failed ${reg.user_id}:`, err)
    }
  }

  console.log(`\nDone! Encrypted: ${migrated}, Failed: ${failed}`)
}

main().catch(console.error)
