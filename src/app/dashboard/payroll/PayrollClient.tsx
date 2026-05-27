'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { generatePayroll, savePayrollSettings, updatePayrollStatus } from '@/app/actions/payroll'
import type { PayrollSettings } from '@/app/actions/payroll'

interface Employee {
  id: string
  full_name: string
  employee_id?: string
  department_id?: string
  departments?: { name: string } | null
}

interface Department { id: string; name: string }

interface Payroll {
  id: string
  user_id: string
  base_salary: number
  working_days_target: number
  days_present: number
  days_off: number
  transport_allowance: number
  meal_allowance: number
  absence_deduction: number
  bpjs_kesehatan: number
  bpjs_jht: number
  gross_salary: number
  net_salary: number
  status: string
}

interface Props {
  employees: Employee[]
  departments: Department[]
  payrolls: Payroll[]
  settings: PayrollSettings | null
  month: number
  year: number
  orgId: string
}

const MONTHS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const DEFAULT_SETTINGS: PayrollSettings = {
  transport_enabled: false,
  transport_amount: 0,
  meal_enabled: false,
  meal_amount: 0,
  absence_deduction_enabled: false,
  bpjs_kesehatan_enabled: false,
  bpjs_jht_enabled: false,
}

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  approved: 'Disetujui',
  paid: 'Dibayar',
}

export default function PayrollClient({ employees, departments, payrolls: initialPayrolls, settings: initialSettings, month, year, orgId }: Props) {
  const router = useRouter()

  const [payrolls, setPayrolls] = useState<Payroll[]>(initialPayrolls)
  useEffect(() => setPayrolls(initialPayrolls), [initialPayrolls])

  const [settings, setSettings] = useState<PayrollSettings>(initialSettings ?? DEFAULT_SETTINGS)
  useEffect(() => { if (initialSettings) setSettings(initialSettings) }, [initialSettings])

  const [showSettings, setShowSettings] = useState(false)
  const [filterDept, setFilterDept] = useState('')
  const [generating, setGenerating] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Map employee data by id for quick lookup
  const empMap = Object.fromEntries(employees.map(e => [e.id, e]))

  const handleStatusChange = async (id: string, status: string) => {
    setUpdatingStatus(id)
    await updatePayrollStatus(id, status)
    setPayrolls(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    setUpdatingStatus(null)
  }

  const navigateMonth = (dir: number) => {
    let m = month + dir, y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    router.push(`/dashboard/payroll?month=${m}&year=${y}`)
  }

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    const res = await savePayrollSettings(orgId, settings)
    setSavingSettings(false)
    setMsg({ text: res.error ? res.error : 'Pengaturan disimpan', ok: !res.error })
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setMsg(null)
    const res = await generatePayroll(orgId, month, year, settings)
    setGenerating(false)
    if (res.error) {
      setMsg({ text: res.error, ok: false })
    } else {
      setMsg({ text: `Payroll ${MONTHS[month]} ${year} berhasil dihitung untuk ${res.count} karyawan`, ok: true })
      router.refresh()
    }
  }

  const filtered = payrolls.filter(p => {
    if (!filterDept) return true
    return empMap[p.user_id]?.department_id === filterDept
  })

  const totalNet = filtered.reduce((s, p) => s + p.net_salary, 0)
  const totalGross = filtered.reduce((s, p) => s + p.gross_salary, 0)
  const monthName = `${MONTHS[month]} ${year}`

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) => (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${enabled ? 'bg-teal-500' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Penggajian</h1>
          <p className="text-sm text-gray-400 mt-0.5">Rekap & kalkulasi gaji karyawan per bulan</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigateMonth(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold">‹</button>
          <span className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 min-w-40 text-center capitalize">{monthName}</span>
          <button onClick={() => navigateMonth(1)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold">›</button>
        </div>
      </div>

      {/* Msg banner */}
      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${msg.ok ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {msg.ok ? '✅' : '❌'} {msg.text}
        </div>
      )}

      {/* Settings panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-3 overflow-hidden">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-lg">⚙️</span>
            <div className="text-left">
              <p className="font-semibold text-gray-800 text-sm">Komponen Gaji</p>
              <p className="text-xs text-gray-400">
                {[
                  settings.transport_enabled && 'Transport',
                  settings.meal_enabled && 'Makan',
                  settings.absence_deduction_enabled && 'Pot. Absen',
                  settings.bpjs_kesehatan_enabled && 'BPJS Kes.',
                  settings.bpjs_jht_enabled && 'BPJS JHT',
                ].filter(Boolean).join(' · ') || 'Semua komponen nonaktif — klik untuk aktifkan'}
              </p>
            </div>
          </div>
          <span className={`text-gray-400 transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {showSettings && (
          <div className="border-t border-gray-100 p-5 space-y-5">
            {/* Tunjangan */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Tunjangan</p>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Toggle enabled={settings.transport_enabled} onChange={v => setSettings(s => ({ ...s, transport_enabled: v }))} />
                  <span className="text-sm text-gray-700 w-44">Tunjangan Transport</span>
                  {settings.transport_enabled && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Rp</span>
                      <input type="number" value={settings.transport_amount || ''}
                        onChange={e => setSettings(s => ({ ...s, transport_amount: parseInt(e.target.value) || 0 }))}
                        className="w-36 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        placeholder="0" />
                      <span className="text-xs text-gray-400">/ hari masuk</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <Toggle enabled={settings.meal_enabled} onChange={v => setSettings(s => ({ ...s, meal_enabled: v }))} />
                  <span className="text-sm text-gray-700 w-44">Tunjangan Makan</span>
                  {settings.meal_enabled && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Rp</span>
                      <input type="number" value={settings.meal_amount || ''}
                        onChange={e => setSettings(s => ({ ...s, meal_amount: parseInt(e.target.value) || 0 }))}
                        className="w-36 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        placeholder="0" />
                      <span className="text-xs text-gray-400">/ hari masuk</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Potongan */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Potongan</p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <Toggle enabled={settings.absence_deduction_enabled} onChange={v => setSettings(s => ({ ...s, absence_deduction_enabled: v }))} />
                  <div>
                    <p className="text-sm text-gray-700">Potongan Hari Tidak Masuk</p>
                    <p className="text-xs text-gray-400 mt-0.5">Gaji pokok ÷ hari kerja × hari absen</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Toggle enabled={settings.bpjs_kesehatan_enabled} onChange={v => setSettings(s => ({ ...s, bpjs_kesehatan_enabled: v }))} />
                  <div>
                    <p className="text-sm text-gray-700">BPJS Kesehatan</p>
                    <p className="text-xs text-gray-400 mt-0.5">1% dari gaji kotor (iuran karyawan)</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Toggle enabled={settings.bpjs_jht_enabled} onChange={v => setSettings(s => ({ ...s, bpjs_jht_enabled: v }))} />
                  <div>
                    <p className="text-sm text-gray-700">BPJS JHT (Jaminan Hari Tua)</p>
                    <p className="text-xs text-gray-400 mt-0.5">2% dari gaji kotor (iuran karyawan)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Generate + filter bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          {generating
            ? <><span className="animate-spin">⟳</span> Menghitung...</>
            : `💰 Hitung Gaji ${MONTHS[month]}`}
        </button>
        <p className="text-xs text-gray-400">Data diambil dari roster bulan {monthName}</p>
        {departments.length > 0 && payrolls.length > 0 && (
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="ml-auto px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
            <option value="">Semua Departemen</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
      </div>

      {/* Summary cards */}
      {payrolls.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Total Karyawan</p>
            <p className="text-2xl font-bold text-gray-800">{filtered.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Total Gaji Kotor</p>
            <p className="text-lg font-bold text-gray-800">{formatRp(totalGross)}</p>
          </div>
          <div className="bg-teal-500 rounded-2xl shadow-sm p-4">
            <p className="text-xs text-teal-100 mb-1">Total Gaji Bersih</p>
            <p className="text-lg font-bold text-white">{formatRp(totalNet)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      {payrolls.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <p className="text-4xl mb-3">💰</p>
          <p className="text-gray-500 font-medium">Belum ada data penggajian</p>
          <p className="text-gray-400 text-sm mt-1">Klik "Hitung Gaji" untuk kalkulasi otomatis dari data roster</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="sticky left-0 bg-gray-50 z-10 text-left text-xs font-semibold text-gray-500 px-5 py-4 uppercase tracking-wider min-w-48">Karyawan</th>
                  <th className="text-center text-xs font-semibold text-gray-500 px-3 py-4 uppercase tracking-wider">Hadir</th>
                  <th className="text-right text-xs font-semibold text-gray-500 px-4 py-4 uppercase tracking-wider">Gaji Pokok</th>
                  {settings.transport_enabled && <th className="text-right text-xs font-semibold text-green-500 px-3 py-4 uppercase tracking-wider">Transport</th>}
                  {settings.meal_enabled && <th className="text-right text-xs font-semibold text-green-500 px-3 py-4 uppercase tracking-wider">Makan</th>}
                  {settings.absence_deduction_enabled && <th className="text-right text-xs font-semibold text-red-400 px-3 py-4 uppercase tracking-wider">Pot. Absen</th>}
                  {settings.bpjs_kesehatan_enabled && <th className="text-right text-xs font-semibold text-red-400 px-3 py-4 uppercase tracking-wider">BPJS Kes.</th>}
                  {settings.bpjs_jht_enabled && <th className="text-right text-xs font-semibold text-red-400 px-3 py-4 uppercase tracking-wider">BPJS JHT</th>}
                  <th className="text-right text-xs font-semibold text-gray-700 px-4 py-4 uppercase tracking-wider min-w-36">Gaji Bersih</th>
                  <th className="text-center text-xs font-semibold text-gray-500 px-4 py-4 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => {
                  const emp = empMap[p.user_id]
                  const name = emp?.full_name ?? '-'
                  const deptName = (emp?.departments as { name: string } | null)?.name
                  const daysAbsent = Math.max(0, p.working_days_target - p.days_present)
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="sticky left-0 bg-white px-5 py-3.5 border-r border-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold text-sm shrink-0">
                            {name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-800">{name}</p>
                            <p className="text-xs text-gray-400">{deptName ?? emp?.employee_id ?? '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${daysAbsent > 0 ? 'bg-rose-50 text-rose-600' : 'bg-teal-50 text-teal-600'}`}>
                          {p.days_present}/{p.working_days_target}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-sm text-gray-700">{formatRp(p.base_salary)}</td>
                      {settings.transport_enabled && <td className="px-3 py-3.5 text-right text-sm text-green-600">+{formatRp(p.transport_allowance)}</td>}
                      {settings.meal_enabled && <td className="px-3 py-3.5 text-right text-sm text-green-600">+{formatRp(p.meal_allowance)}</td>}
                      {settings.absence_deduction_enabled && (
                        <td className="px-3 py-3.5 text-right text-sm text-red-500">
                          {p.absence_deduction > 0 ? `-${formatRp(p.absence_deduction)}` : '—'}
                        </td>
                      )}
                      {settings.bpjs_kesehatan_enabled && (
                        <td className="px-3 py-3.5 text-right text-sm text-red-500">
                          {p.bpjs_kesehatan > 0 ? `-${formatRp(p.bpjs_kesehatan)}` : '—'}
                        </td>
                      )}
                      {settings.bpjs_jht_enabled && (
                        <td className="px-3 py-3.5 text-right text-sm text-red-500">
                          {p.bpjs_jht > 0 ? `-${formatRp(p.bpjs_jht)}` : '—'}
                        </td>
                      )}
                      <td className="px-4 py-3.5 text-right font-bold text-gray-900">{formatRp(p.net_salary)}</td>
                      <td className="px-4 py-3.5 text-center">
                        <select
                          value={p.status}
                          disabled={updatingStatus === p.id}
                          onChange={e => handleStatusChange(p.id, e.target.value)}
                          className={`text-xs px-2 py-1.5 rounded-lg font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-400 ${STATUS_STYLE[p.status] ?? 'bg-gray-100 text-gray-500'}`}
                        >
                          <option value="draft">Draft</option>
                          <option value="approved">Disetujui</option>
                          <option value="paid">Dibayar</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-100">
                  <td colSpan={2} className="px-5 py-3 text-xs text-gray-400">
                    * Berdasarkan data roster. Setelah absensi mobile tersedia, data akan diperbarui otomatis.
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-gray-700" colSpan={100}>
                    Total Bersih: {formatRp(totalNet)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
