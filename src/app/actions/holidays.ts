'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const NATIONAL_HOLIDAYS: Record<number, { date: string; name: string }[]> = {
  2025: [
    { date: '2025-01-01', name: 'Tahun Baru Masehi 2025' },
    { date: '2025-01-27', name: 'Isra Mikraj Nabi Muhammad SAW' },
    { date: '2025-01-29', name: 'Tahun Baru Imlek 2576' },
    { date: '2025-03-29', name: 'Hari Suci Nyepi (Tahun Baru Saka 1947)' },
    { date: '2025-03-31', name: 'Hari Raya Idul Fitri 1446 H' },
    { date: '2025-04-01', name: 'Hari Raya Idul Fitri 1446 H (Hari Kedua)' },
    { date: '2025-04-18', name: 'Wafat Isa Al Masih' },
    { date: '2025-04-20', name: 'Kebangkitan Isa Al Masih (Paskah)' },
    { date: '2025-05-01', name: 'Hari Buruh Internasional' },
    { date: '2025-05-12', name: 'Hari Raya Waisak 2569' },
    { date: '2025-05-29', name: 'Kenaikan Isa Al Masih' },
    { date: '2025-06-01', name: 'Hari Lahir Pancasila' },
    { date: '2025-06-06', name: 'Hari Raya Idul Adha 1446 H' },
    { date: '2025-06-27', name: 'Tahun Baru Islam 1447 H' },
    { date: '2025-08-17', name: 'Hari Kemerdekaan Republik Indonesia' },
    { date: '2025-09-05', name: 'Maulid Nabi Muhammad SAW' },
    { date: '2025-12-25', name: 'Hari Raya Natal' },
    { date: '2025-12-26', name: 'Cuti Bersama Natal' },
  ],
  2026: [
    { date: '2026-01-01', name: 'Tahun Baru Masehi 2026' },
    { date: '2026-01-17', name: 'Isra Mikraj Nabi Muhammad SAW' },
    { date: '2026-02-17', name: 'Tahun Baru Imlek 2577' },
    { date: '2026-03-19', name: 'Hari Raya Idul Fitri 1447 H' },
    { date: '2026-03-20', name: 'Hari Raya Idul Fitri 1447 H (Hari Kedua)' },
    { date: '2026-03-21', name: 'Hari Suci Nyepi (Tahun Baru Saka 1948)' },
    { date: '2026-04-03', name: 'Wafat Isa Al Masih' },
    { date: '2026-04-05', name: 'Kebangkitan Isa Al Masih (Paskah)' },
    { date: '2026-05-01', name: 'Hari Buruh Internasional' },
    { date: '2026-05-14', name: 'Kenaikan Isa Al Masih' },
    { date: '2026-05-24', name: 'Hari Raya Waisak 2570' },
    { date: '2026-05-26', name: 'Hari Raya Idul Adha 1447 H' },
    { date: '2026-06-01', name: 'Hari Lahir Pancasila' },
    { date: '2026-06-16', name: 'Tahun Baru Islam 1448 H' },
    { date: '2026-08-17', name: 'Hari Kemerdekaan Republik Indonesia' },
    { date: '2026-08-25', name: 'Maulid Nabi Muhammad SAW' },
    { date: '2026-12-25', name: 'Hari Raya Natal' },
    { date: '2026-12-26', name: 'Cuti Bersama Natal' },
  ],
}

export async function syncNationalHolidays(year: number, orgId: string) {
  const hardcoded = NATIONAL_HOLIDAYS[year]

  // Coba API dulu, fallback ke data hardcoded
  const apis = [
    {
      url: `https://dayoffapi.vercel.app/api?year=${year}`,
      parse: (data: any[]) => data
        .filter(h => h.isHoliday)
        .map(h => {
          const [d, m, y] = (h.strDate as string).split('/')
          return { org_id: orgId, date: `${y}-${m}-${d}`, name: h.strName as string, is_national: true }
        }),
    },
    {
      url: `https://api-harilibur.vercel.app/api?year=${year}`,
      parse: (data: any[]) => data
        .filter(h => h.is_national_holiday)
        .map(h => ({ org_id: orgId, date: h.holiday_date as string, name: h.holiday_name as string, is_national: true })),
    },
  ]

  let rows: { org_id: string; date: string; name: string; is_national: boolean }[] = []

  for (const api of apis) {
    try {
      const res = await fetch(api.url, { cache: 'no-store' })
      if (!res.ok) continue
      const data = await res.json()
      if (!Array.isArray(data) || data.length === 0) continue
      const parsed = api.parse(data)
      if (parsed.length > 0) { rows = parsed; break }
    } catch {
      continue
    }
  }

  // Fallback ke data hardcoded jika API gagal semua
  if (rows.length === 0) {
    if (!hardcoded) return { error: `Data libur untuk tahun ${year} belum tersedia. Tambah manual.` }
    rows = hardcoded.map(h => ({ org_id: orgId, ...h, is_national: true }))
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('holidays')
    .upsert(rows, { onConflict: 'org_id,date', ignoreDuplicates: false })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/roster')
  return { success: true, count: rows.length }
}

export async function addHoliday(orgId: string, date: string, name: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('holidays').upsert(
    { org_id: orgId, date, name, is_national: false },
    { onConflict: 'org_id,date' }
  )
  if (error) return { error: error.message }
  revalidatePath('/dashboard/roster')
  return { success: true }
}

export async function deleteHoliday(orgId: string, date: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('holidays')
    .delete()
    .eq('org_id', orgId)
    .eq('date', date)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/roster')
  return { success: true }
}
