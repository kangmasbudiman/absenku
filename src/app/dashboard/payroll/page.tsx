import { createClient } from '@/lib/supabase/server'
import PayrollClient from './PayrollClient'

export const dynamic = 'force-dynamic'

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const params = await searchParams
  const now = new Date()
  const month = parseInt(params.month ?? String(now.getMonth() + 1))
  const year = parseInt(params.year ?? String(now.getFullYear()))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user!.id)
    .single()

  const orgId = profile!.org_id

  const [
    { data: employees },
    { data: departments },
    { data: settings },
    { data: payrolls },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, employee_id, department_id, departments(name)')
      .eq('org_id', orgId)
      .eq('role', 'employee')
      .eq('is_active', true)
      .order('full_name'),
    supabase.from('departments').select('id, name').eq('org_id', orgId).order('name'),
    supabase.from('payroll_settings').select('*').eq('org_id', orgId).maybeSingle(),
    supabase
      .from('payrolls')
      .select('*')
      .eq('org_id', orgId)
      .eq('month', month)
      .eq('year', year),
  ])

  return (
    <PayrollClient
      employees={(employees ?? []).map(e => ({
        ...e,
        departments: Array.isArray(e.departments) ? e.departments[0] ?? null : e.departments,
      }))}
      departments={departments ?? []}
      payrolls={payrolls ?? []}
      settings={settings}
      month={month}
      year={year}
      orgId={orgId}
    />
  )
}
