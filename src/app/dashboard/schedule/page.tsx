import { createClient } from '@/lib/supabase/server'
import ScheduleClient from './ScheduleClient'

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role, department_id')
    .eq('id', user!.id)
    .single()

  const orgId = profile!.org_id
  const isDeptHead = profile!.role === 'dept_head'

  // Dept head hanya lihat departemennya sendiri
  let employeesQuery = supabase
    .from('profiles')
    .select('id, full_name, employee_id, department_id, departments(name)')
    .eq('org_id', orgId)
    .eq('role', 'employee')
    .eq('is_active', true)
    .order('full_name')

  if (isDeptHead && profile!.department_id) {
    employeesQuery = employeesQuery.eq('department_id', profile!.department_id)
  }

  const [
    { data: employees },
    { data: shifts },
    { data: departments },
    { data: activeShifts },
  ] = await Promise.all([
    employeesQuery,
    supabase.from('shifts').select('*').eq('org_id', orgId).order('name'),
    supabase.from('departments').select('id, name').eq('org_id', orgId).order('name'),
    supabase.from('employee_shifts')
      .select('user_id, shift_id, effective_date')
      .eq('is_active', true)
      .order('effective_date', { ascending: false }),
  ])

  // Map user_id → array of active shift IDs (bisa lebih dari 1)
  const currentShiftMap: Record<string, string[]> = {}
  for (const es of activeShifts ?? []) {
    if (!currentShiftMap[es.user_id]) currentShiftMap[es.user_id] = []
    if (!currentShiftMap[es.user_id].includes(es.shift_id)) {
      currentShiftMap[es.user_id].push(es.shift_id)
    }
  }

  return (
    <ScheduleClient
      employees={(employees ?? []).map(e => ({
        ...e,
        departments: Array.isArray(e.departments) ? e.departments[0] ?? null : e.departments,
      }))}
      shifts={shifts ?? []}
      departments={departments ?? []}
      currentShiftMap={currentShiftMap}
      isDeptHead={isDeptHead}
      orgId={orgId}
    />
  )
}
