import { createClient } from '@/lib/supabase/server'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user!.id).single()

  const params = await searchParams
  const now = new Date()
  const month = parseInt(params.month ?? String(now.getMonth() + 1))
  const year = parseInt(params.year ?? String(now.getFullYear()))

  const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')

  const { data: attendances } = await supabase
    .from('attendances')
    .select('*, profiles!inner(full_name, employee_id, org_id)')
    .eq('profiles.org_id', profile!.org_id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  const MONTHS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const statusLabels: Record<string, { label: string; class: string }> = {
    hadir: { label: 'Hadir', class: 'bg-green-100 text-green-700' },
    terlambat: { label: 'Terlambat', class: 'bg-yellow-100 text-yellow-700' },
    alpha: { label: 'Alpha', class: 'bg-red-100 text-red-700' },
    izin: { label: 'Izin', class: 'bg-blue-100 text-blue-700' },
    sakit: { label: 'Sakit', class: 'bg-purple-100 text-purple-700' },
  }

  const summary = (attendances ?? []).reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Absensi</h1>
          <p className="text-sm text-gray-500">{MONTHS[month]} {year}</p>
        </div>
        {/* Month selector */}
        <form className="flex items-center gap-2">
          <select name="month" defaultValue={month}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select name="year" defaultValue={year}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Filter</button>
        </form>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {Object.entries({ hadir: 'Hadir', terlambat: 'Terlambat', alpha: 'Alpha', izin: 'Izin', sakit: 'Sakit' }).map(([k, label]) => (
          <div key={k} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-gray-900">{summary[k] ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Tanggal', 'Karyawan', 'Check-In', 'Check-Out', 'Terlambat', 'Jam Kerja', 'Status', 'Mock GPS'].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(attendances ?? []).length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Tidak ada data absensi</td></tr>
            ) : (
              (attendances ?? []).map((att) => {
                const p = att.profiles as { full_name: string; employee_id?: string } | null
                const s = statusLabels[att.status] ?? { label: att.status, class: 'bg-gray-100' }
                const workingHours = att.working_minutes > 0 ? `${Math.floor(att.working_minutes / 60)}j ${att.working_minutes % 60}m` : '-'
                return (
                  <tr key={att.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{format(new Date(att.date), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{p?.full_name}</p>
                      <p className="text-xs text-gray-400">{p?.employee_id ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">{att.check_in_time ? format(new Date(att.check_in_time), 'HH:mm') : '-'}</td>
                    <td className="px-4 py-3 text-sm">{att.check_out_time ? format(new Date(att.check_out_time), 'HH:mm') : '-'}</td>
                    <td className="px-4 py-3 text-sm text-yellow-600">{att.late_minutes > 0 ? `${att.late_minutes} mnt` : '-'}</td>
                    <td className="px-4 py-3 text-sm">{workingHours}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.class}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {att.is_check_in_mock_suspected && (
                        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">⚠ Suspect</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
