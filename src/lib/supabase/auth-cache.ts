import { cache } from 'react'
import { createClient } from './server'

// Deduplicates auth.getUser() across layout + page within the same request
export const getServerUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
})

// Deduplicates profile fetch across layout + page within the same request
export const getServerProfile = cache(async () => {
  const { supabase, user } = await getServerUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, org_id, full_name, avatar_url')
    .eq('id', user.id)
    .single()
  return profile
})
