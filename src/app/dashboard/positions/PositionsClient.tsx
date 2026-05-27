'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Position {
  id: string
  name: string
  label: string
  level: number
  is_active: boolean
  created_at: string
}

const COLORS = [
  'bg-red-100 text-red-700',
  'bg-indigo-100 text-indigo-700',
  'bg-yellow-100 text-yellow-700',
  'bg-green-100 text-green-700',
  'bg-blue-100 text-blue-700',
  'bg-pink-100 text-pink-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
]

const LEVEL_COLORS: Record<string, string> = {
  high: 'bg-amber-100 text-amber-700',
  mid: 'bg-sky-100 text-sky-700',
  low: 'bg-slate-100 text-slate-600',
}

function levelTier(lvl: number) {
  if (lvl >= 80) return 'high'
  if (lvl >= 50) return 'mid'
  return 'low'
}

export default function PositionsClient({ positions, orgId }: { positions: Position[]; orgId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [showModal, setShowModal] = useState(false)
  const [editPos, setEditPos] = useState<Position | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ label: '', level: 0 })

  const openAdd = () => {
    setEditPos(null)
    setForm({ label: '', level: 0 })
    setError('')
    setShowModal(true)
  }

  const openEdit = (p: Position) => {
    setEditPos(p)
    setForm({ label: p.label, level: p.level })
    setError('')
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (editPos) {
      const { error: err } = await supabase
        .from('positions')
        .update({ label: form.label.trim(), level: form.level })
        .eq('id', editPos.id)
      if (err) {
        setError(err.message)
        setIsLoading(false)
        return
      }
    } else {
      const name = form.label.trim().toLowerCase().replace(/\s+/g, '_')
      const { error: err } = await supabase
        .from('positions')
        .insert({ name, label: form.label.trim(), level: form.level, org_id: orgId })
      if (err) {
        setError(err.message)
        setIsLoading(false)
        return
      }
    }

    setIsLoading(false)
    setShowModal(false)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus posisi jabatan ini?')) return
    await supabase.from('positions').delete().eq('id', id)
    router.refresh()
  }

  const handleToggle = async (p: Position) => {
    await supabase.from('positions').update({ is_active: !p.is_active }).eq('id', p.id)
    router.refresh()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Posisi Jabatan</h1>
          <p className="text-sm text-gray-400 mt-0.5">{positions.length} posisi terdaftar</p>
        </div>
        <button onClick={openAdd}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2">
          + Tambah Posisi
        </button>
      </div>

      {positions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
          <p className="text-4xl mb-3">🏅</p>
          <p className="text-gray-500 font-medium">Belum ada posisi jabatan</p>
          <p className="text-gray-400 text-sm mt-1">Tambahkan posisi untuk mengatur hierarki organisasi</p>
          <button onClick={openAdd}
            className="mt-4 px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700">
            + Tambah Posisi
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {positions.map((pos, i) => (
            <div key={pos.id}
              className={`bg-white rounded-2xl shadow-sm border p-5 hover:-translate-y-1 transition-all duration-200 cursor-default ${pos.is_active ? 'border-gray-100 hover:border-teal-300' : 'border-gray-200 opacity-60'}`}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 30px rgba(20,184,166,0.35)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${COLORS[i % COLORS.length]}`}>
                    {pos.label[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{pos.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_COLORS[levelTier(pos.level)]}`}>
                        Level {pos.level}
                      </span>
                      <span className="text-xs text-gray-300 font-mono">{pos.name}</span>
                    </div>
                    {!pos.is_active && (
                      <span className="text-xs text-gray-400 mt-1 inline-block">Nonaktif</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleToggle(pos)} title={pos.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors text-sm">
                    {pos.is_active ? '✅' : '⬜'}
                  </button>
                  <button onClick={() => openEdit(pos)}
                    className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors text-sm">
                    ✏️
                  </button>
                  <button onClick={() => handleDelete(pos.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">{editPos ? 'Edit Posisi' : 'Tambah Posisi'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Jabatan *</label>
                <input required value={form.label} onChange={e => setForm({ ...form, label: e.target.value })}
                  placeholder="Contoh: Kepala Ruangan, Kabag, Direktur..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                <p className="text-xs text-gray-400 mt-1">
                  Kunci akan otomatis: <span className="font-mono font-medium">{form.label.trim().toLowerCase().replace(/\s+/g, '_') || '—'}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Level Hierarki</label>
                <input type="number" min={0} max={999} value={form.level}
                  onChange={e => setForm({ ...form, level: parseInt(e.target.value) || 0 })}
                  placeholder="Semakin tinggi = semakin senior"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                <p className="text-xs text-gray-400 mt-1">100 = Direktur, 80 = Kabid, 60 = Kepala Ruangan, dst.</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50">
                  Batal
                </button>
                <button type="submit" disabled={isLoading}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold">
                  {isLoading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
