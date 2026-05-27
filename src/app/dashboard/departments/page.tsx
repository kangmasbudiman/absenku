import { createClient } from '@/lib/supabase/server'
import DepartmentsClient from './DepartmentsClient'

export default async function DepartmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user!.id).single()

  const { data: departments } = await supabase
    .from('departments')
    .select('id, name, description, created_at')
    .eq('org_id', profile!.org_id)
    .order('name')

  return <DepartmentsClient departments={departments ?? []} orgId={profile!.org_id} />
}
