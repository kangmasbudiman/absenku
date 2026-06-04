import { createClient } from '@/lib/supabase/server'
import AbsenClient from './AbsenClient'

export const metadata = {
  title: 'Absensi Web - AbsenKu',
}

export default async function AbsenPage() {
  const supabase = await createClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('app_name')
    .eq('is_active', true)
    .limit(1)
    .single()

  const appName = org?.app_name ?? 'AbsenKu'

  return <AbsenClient appName={appName} />
}
