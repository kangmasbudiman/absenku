import { createClient } from '@/lib/supabase/server'
import PositionsClient from './PositionsClient'

export default async function PositionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user!.id).single()

  const { data: positions } = await supabase
    .from('positions')
    .select('id, name, label, level, is_active, created_at')
    .eq('org_id', profile!.org_id)
    .order('level', { ascending: false })

  return <PositionsClient positions={positions ?? []} orgId={profile!.org_id} />
}
