'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type FlowRow = {
  id: string
  org_id: string
  division: string
  position: string
  level: number
  role_label: string
  approver_user_id: string | null
  is_active: boolean
  created_at: string
}

type EmployeeRow = {
  id: string
  full_name: string
  position: string | null
  division: string | null
}

interface Props {
  orgId: string
  flows: FlowRow[]
  employees: EmployeeRow[]
  positions: { name: string; label: string }[]
}

type LocalLevel = {
  id?: string
  level: number
  role_label: string
  approver_user_id: string
}

const DIVISIONS = [
  { key: 'umum', label: 'Bagian Umum' },
  { key: 'penunjang', label: 'Bagian Penunjang' },
  { key: 'keperawatan', label: 'Bagian Keperawatan' },
  { key: 'medis', label: 'Bagian Medis' },
]

const POSITIONS_FALLBACK = [
  { key: '', label: 'Semua Jabatan' },
  { key: 'direktur', label: 'Direktur' },
  { key: 'sekertaris', label: 'Sekertaris' },
  { key: 'kabid', label: 'Kabid' },
  { key: 'kabag', label: 'Kabag' },
  { key: 'kepala_ruangan', label: 'Kepala Ruangan' },
  { key: 'kasie_keperawatan', label: 'Kasie Keperawatan' },
  { key: 'kasie_penunjang', label: 'Kasie Penunjang' },
]

function buildLevels(division: string, position: string, flows: FlowRow[]): LocalLevel[] {
  return flows
    .filter(f => f.division === division && f.position === position)
    .sort((a, b) => a.level - b.level)
    .map(f => ({
      id: f.id,
      level: f.level,
      role_label: f.role_label,
      approver_user_id: f.approver_user_id ?? '',
    }))
}

function DivisionSection({
  divKey,
  divLabel,
  orgId,
  flows,
  employees,
  positionsList,
  onRefresh,
}: {
  divKey: string
  divLabel: string
  orgId: string
  flows: FlowRow[]
  employees: EmployeeRow[]
  positionsList: { key: string; label: string }[]
  onRefresh: () => void
}) {
  const [selectedPosition, setSelectedPosition] = useState('')
  const [levels, setLevels] = useState<LocalLevel[]>(() => buildLevels(divKey, '', flows))
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const switchPosition = (pos: string) => {
    setSelectedPosition(pos)
    setLevels(buildLevels(divKey, pos, flows))
    setFeedback(null)
  }

  const addLevel = () => {
    const nextLevel = levels.length > 0 ? Math.max(...levels.map(l => l.level)) + 1 : 1
    if (nextLevel > 5) {
      setFeedback({ type: 'error', msg: 'Maksimum 5 level.' })
      return
    }
    setLevels(prev => [...prev, { level: nextLevel, role_label: '', approver_user_id: '' }])
  }

  const removeLevel = async (idx: number) => {
    const lvl = levels[idx]
    if (lvl.id) {
      setSaving(true)
      try {
        const res = await fetch('/api/approval-config', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: lvl.id }),
        })
        const json = await res.json()
        if (!res.ok || json.error) {
          setFeedback({ type: 'error', msg: json.error ?? 'Gagal menghapus.' })
          setSaving(false)
          return
        }
      } catch {
        setFeedback({ type: 'error', msg: 'Terjadi kesalahan jaringan.' })
        setSaving(false)
        return
      }
      setSaving(false)
    }

    const newLevels = levels.filter((_, i) => i !== idx)
    const reNumbered = newLevels.map((l, i) => ({ ...l, level: i + 1 }))
    setLevels(reNumbered)
  }

  const updateLevel = (idx: number, field: keyof LocalLevel, value: string | number) => {
    setLevels(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  const save = async () => {
    setFeedback(null)
    for (const lvl of levels) {
      if (!lvl.role_label.trim()) {
        setFeedback({ type: 'error', msg: 'Label jabatan tidak boleh kosong.' })
        return
      }
    }

    setSaving(true)
    try {
      for (const lvl of levels) {
        const res = await fetch('/api/approval-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            org_id: orgId,
            division: divKey,
            position: selectedPosition,
            level: lvl.level,
            role_label: lvl.role_label.trim(),
            approver_user_id: lvl.approver_user_id || null,
          }),
        })
        const json = await res.json()
        if (!res.ok || json.error) {
          setFeedback({ type: 'error', msg: json.error ?? 'Gagal menyimpan.' })
          setSaving(false)
          return
        }
      }
      setFeedback({ type: 'success', msg: 'Konfigurasi berhasil disimpan.' })
      onRefresh()
    } catch {
      setFeedback({ type: 'error', msg: 'Terjadi kesalahan jaringan.' })
    } finally {
      setSaving(false)
    }
  }

  const posLabel = positionsList.find(p => p.key === selectedPosition)?.label ?? 'Default'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-gray-900">{divLabel}</h2>
        <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
          {levels.length} level
        </span>
      </div>

      {/* Position pills selector */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {positionsList.map(pos => (
          <button
            key={pos.key}
            onClick={() => switchPosition(pos.key)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              selectedPosition === pos.key
                ? 'bg-teal-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {pos.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 mb-3">
        {selectedPosition === ''
          ? 'Flow default untuk karyawan tanpa jabatan khusus'
          : `Flow khusus untuk jabatan "${posLabel}"`}
      </p>

      {levels.length === 0 && (
        <p className="text-sm text-gray-400 mb-4">Belum ada level persetujuan. Tambah level di bawah.</p>
      )}

      <div className="space-y-3">
        {levels.map((lvl, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-7 h-7 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1">
              {lvl.level}
            </div>

            <div className="flex-1 min-w-0">
              <label className="block text-xs text-gray-500 mb-1">Label Jabatan</label>
              <input
                type="text"
                value={lvl.role_label}
                onChange={e => updateLevel(idx, 'role_label', e.target.value)}
                placeholder="cth: Kepala Bagian Umum"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>

            <div className="flex-1 min-w-0">
              <label className="block text-xs text-gray-500 mb-1">Approver</label>
              <select
                value={lvl.approver_user_id}
                onChange={e => updateLevel(idx, 'approver_user_id', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              >
                <option value="">-- Pilih Approver --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name}{emp.position ? ` (${emp.position})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => removeLevel(idx)}
              disabled={saving}
              className="mt-6 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 shrink-0"
              title="Hapus level ini"
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addLevel}
        disabled={saving || levels.length >= 5}
        className="mt-3 flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="w-5 h-5 bg-teal-100 rounded-full flex items-center justify-center text-xs">+</span>
        Tambah Level
      </button>

      {feedback && (
        <div className={`mt-3 text-sm px-3 py-2 rounded-lg ${
          feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {feedback.msg}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
        >
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  )
}

export default function ApprovalConfigClient({ orgId, flows, employees, positions }: Props) {
  const router = useRouter()

  const positionsList = positions.length > 0
    ? [{ key: '', label: 'Semua Jabatan' }, ...positions.map(p => ({ key: p.name, label: p.label }))]
    : POSITIONS_FALLBACK

  const refresh = () => router.refresh()

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Alur Persetujuan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Konfigurasi level persetujuan cuti per divisi dan jabatan. Pilih jabatan di setiap divisi untuk mengatur alur yang berbeda.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {DIVISIONS.map(div => (
          <DivisionSection
            key={div.key}
            divKey={div.key}
            divLabel={div.label}
            orgId={orgId}
            flows={flows}
            employees={employees}
            positionsList={positionsList}
            onRefresh={refresh}
          />
        ))}
      </div>
    </div>
  )
}
