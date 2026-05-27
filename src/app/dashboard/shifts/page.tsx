import { createClient } from '@/lib/supabase/server'
import ShiftsClient from './ShiftsClient'

export default async function ShiftsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user!.id).single()
  const { data: shifts } = await supabase.from('shifts').select('*').eq('org_id', profile!.org_id).order('name')
  return <ShiftsClient shifts={shifts ?? []} orgId={profile!.org_id} />
}
