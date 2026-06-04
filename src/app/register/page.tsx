import { createClient } from '@/lib/supabase/server'
import RegisterClient from './RegisterClient'

export default async function RegisterPage() {
  const supabase = await createClient()
  const { data: org } = await supabase
    .from('organizations')
    .select('app_name')
    .eq('is_active', true)
    .limit(1)
    .single()

  const appName = org?.app_name ?? 'AbsenKu'

  return <RegisterClient appName={appName} />
}
