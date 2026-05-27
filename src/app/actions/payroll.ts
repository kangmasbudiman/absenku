'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface PayrollSettings {
  transport_enabled: boolean
  transport_amount: number
  meal_enabled: boolean
  meal_amount: number
  absence_deduction_enabled: boolean
  bpjs_kesehatan_enabled: boolean
  bpjs_jht_enabled: boolean
}

export async function savePayrollSettings(orgId: string, settings: PayrollSettings) {
  const supabase = await createClient()
  const { error } = await supabase.from('payroll_settings').upsert(
    { org_id: orgId, ...settings, updated_at: new Date().toISOString() },
    { onConflict: 'org_id' }
  )
  if (error) return { error: error.message }
  revalidatePath('/dashboard/payroll')
  return { success: true }
}

export async function generatePayroll(
  orgId: string,
  month: number,
  year: number,
  settings: PayrollSettings
) {
  const supabase = await createClient()

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10)

  // Hitung hari kerja target (Senin-Jumat) dalam bulan ini
  const daysInMonth = new Date(year, month, 0).getDate()
  const allDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month - 1, i + 1)
    return { num: i + 1, dow: d.getDay(), dateStr: `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}` }
  })

  // Ambil libur nasional bulan ini
  const { data: holidays } = await supabase
    .from('holidays')
    .select('date')
    .eq('org_id', orgId)
    .gte('date', startDate)
    .lte('date', endDate)

  const holidayDates = new Set((holidays ?? []).map(h => h.date))

  // Hari kerja target = weekdays (Sen-Jum) yang bukan libur nasional
  const workingDaysTarget = allDays.filter(
    d => d.dow >= 1 && d.dow <= 5 && !holidayDates.has(d.dateStr)
  ).length

  // Ambil semua karyawan aktif
  const { data: employees } = await supabase
    .from('profiles')
    .select('id, full_name, department_id')
    .eq('org_id', orgId)
    .eq('role', 'employee')
    .eq('is_active', true)

  if (!employees?.length) return { error: 'Tidak ada karyawan aktif' }

  const empIds = employees.map(e => e.id)

  // Ambil gaji pokok terbaru per karyawan
  const { data: salaries } = await supabase
    .from('employee_salaries')
    .select('user_id, base_salary, effective_date')
    .in('user_id', empIds)
    .order('effective_date', { ascending: false })

  const salaryMap: Record<string, number> = {}
  for (const s of salaries ?? []) {
    if (!salaryMap[s.user_id]) salaryMap[s.user_id] = s.base_salary
  }

  // Ambil roster bulan ini
  const { data: schedules } = await supabase
    .from('shift_schedules')
    .select('user_id, is_off')
    .eq('org_id', orgId)
    .gte('date', startDate)
    .lte('date', endDate)

  const presenceMap: Record<string, number> = {}
  const offMap: Record<string, number> = {}
  for (const s of schedules ?? []) {
    if (s.is_off) {
      offMap[s.user_id] = (offMap[s.user_id] ?? 0) + 1
    } else {
      presenceMap[s.user_id] = (presenceMap[s.user_id] ?? 0) + 1
    }
  }

  const rows = employees.map(emp => {
    const baseSalary = salaryMap[emp.id] ?? 0
    const daysPresent = presenceMap[emp.id] ?? 0
    const daysOff = offMap[emp.id] ?? 0
    const daysAbsent = Math.max(0, workingDaysTarget - daysPresent)
    const dailyRate = workingDaysTarget > 0 ? baseSalary / workingDaysTarget : 0

    const transport = settings.transport_enabled ? settings.transport_amount * daysPresent : 0
    const meal = settings.meal_enabled ? settings.meal_amount * daysPresent : 0
    const absenceDeduction = settings.absence_deduction_enabled ? Math.round(dailyRate * daysAbsent) : 0

    const gross = baseSalary + transport + meal - absenceDeduction
    const bpjsKesehatan = settings.bpjs_kesehatan_enabled ? Math.round(gross * 0.01) : 0
    const bpjsJht = settings.bpjs_jht_enabled ? Math.round(gross * 0.02) : 0
    const net = gross - bpjsKesehatan - bpjsJht

    return {
      org_id: orgId,
      user_id: emp.id,
      month,
      year,
      base_salary: baseSalary,
      working_days_target: workingDaysTarget,
      days_present: daysPresent,
      days_off: daysOff,
      transport_allowance: transport,
      meal_allowance: meal,
      absence_deduction: absenceDeduction,
      bpjs_kesehatan: bpjsKesehatan,
      bpjs_jht: bpjsJht,
      gross_salary: Math.round(gross),
      net_salary: Math.round(net),
      status: 'draft',
      generated_at: new Date().toISOString(),
    }
  })

  const { error } = await supabase
    .from('payrolls')
    .upsert(rows, { onConflict: 'org_id,user_id,month,year' })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/payroll')
  return { success: true, count: rows.length }
}

export async function updatePayrollStatus(id: string, status: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('payrolls').update({ status }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/payroll')
  return { success: true }
}
