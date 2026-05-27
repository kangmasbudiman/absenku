import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CompanySettingsClient from './CompanySettingsClient'

export default async function CompanySettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user!.id)
    .single()

  if (!['admin', 'hrd'].includes(profile?.role ?? '')) redirect('/dashboard')

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile!.org_id)
    .single()

  const { data: announcements } = await supabase
    .from('announcements')
    .select('*')
    .eq('org_id', profile!.org_id)
    .order('created_at', { ascending: false })

  return <CompanySettingsClient org={org} announcements={announcements ?? []} orgId={profile!.org_id} />
}
