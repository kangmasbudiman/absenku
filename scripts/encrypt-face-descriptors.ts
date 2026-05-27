// One-time script to encrypt existing face_descriptor data
// Run with: npx tsx scripts/encrypt-face-descriptors.ts
//
// Prerequisites:
// 1. Run create_face_registrations.sql in Supabase SQL Editor first
// 2. FACE_ENCRYPTION_KEY must be set in .env.local

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  console.log('Reading profiles with face_descriptor...')

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, face_descriptor')
    .not('face_descriptor', 'is', null)

  if (error) {
    console.error('Failed to read profiles:', error)
    process.exit(1)
  }

  if (!profiles || profiles.length === 0) {
    console.log('No face_descriptor data to migrate.')
    process.exit(0)
  }

  console.log(`Found ${profiles.length} profiles with face_descriptor.`)

  // Dynamic import of the encryption utility (works with tsx)
  const { encryptDescriptor } = await import('../src/lib/face-crypto')

  let migrated = 0
  let failed = 0

  for (const profile of profiles) {
    try {
      const descriptor = profile.face_descriptor as number[]
      const encrypted = encryptDescriptor(descriptor)

      const { error: upsertError } = await supabase
        .from('face_registrations')
        .upsert({
          user_id: profile.id,
          face_descriptor_encrypted: encrypted,
        }, { onConflict: 'user_id' })

      if (upsertError) throw upsertError
      migrated++
      console.log(`✓ Migrated ${profile.id}`)
    } catch (err) {
      failed++
      console.error(`✗ Failed ${profile.id}:`, err)
    }
  }

  console.log(`\nDone! Migrated: ${migrated}, Failed: ${failed}`)
}

main().catch(console.error)
