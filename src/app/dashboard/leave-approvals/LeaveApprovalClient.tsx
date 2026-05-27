'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = {
  id: string
  leave_request_id: string
  level: number
  role_label: string
  approver_user_id: string | null
  approver_name: string | null
  status: string
  acted_at: string | null
  created_at: string
}

type LeaveRequest = {
  id: string
  user_id: string
  type: string
  start_date: string
  end_date: string
  total_days: number
  reason: string | null
  status: string
  review_notes: string | null
  created_at: string
  employee_name: string
  employee_division: string | null
  employee_position: string | null
  steps: Step[]
}

interface Props {
  requests: LeaveRequest[]
  currentUserId: string
  currentUserRole: string
}

const TYPE_LABELS: Record<string, string> = {
  izin: 'Izin',
  sakit: 'Sakit',
  cuti: 'Cuti Tahunan',
  cuti_tahunan: 'Cuti Tahunan',
  cuti_khusus: 'Cuti Khusus',
  darurat: 'Darurat',
}

const DIVISION_LABELS: Record<string, string> = {
  umum: 'Umum',
  penunjang: 'Penunjang',
  keperawatan: 'Keperawatan',
  medis: 'Medis',
}

const DIVISION_COLORS: Record<string, string> = {
  umum: 'bg-blue-100 text-blue-700',
  penunjang: 'bg-yellow-100 text-yellow-700',
  keperawatan: 'bg-pink-100 text-pink-700',
  medis: 'bg-teal-100 text-teal-700',
}

function fmtDate(d: string) {
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Menunggu', cls: 'bg-orange-100 text-orange-700' },
    approved: { label: 'Disetujui', cls: 'bg-green-100 text-green-700' },
    rejected: { label: 'Ditolak', cls: 'bg-red-100 text-red-700' },
  }
  const s = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  )
}

function StepTracker({ steps }: { steps: Step[] }) {
  if (!steps || steps.length === 0) return null

  const stepColors: Record<string, string> = {
    waiting: 'bg-gray-100 text-gray-500 border-gray-200',
    pending: 'bg-orange-100 text-orange-700 border-orange-200',
    approved: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  }

  const stepIcons: Record<string, string> = {
    waiting: '⏸',
    pending: '⏳',
    approved: '✓',
    rejected: '✗',
  }

  return (
    <div className="flex items-center gap-1 flex-wrap mt-3">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-1">
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${stepColors[step.status] ?? stepColors.waiting}`}
            title={step.approver_name ? `Approver: ${step.approver_name}` : undefined}
          >
            <span className="font-bold text-xs">{stepIcons[step.status] ?? '?'}</span>
            <span>L{step.level} {step.role_label}</span>
          </div>
          {i < steps.length - 1 && (
            <span className="text-gray-300 text-xs">→</span>
          )}
        </div>
      ))}
    </div>
  )
}

type ModalState = {
  stepId: string
  action: 'approve' | 'reject'
  requestId: string
}

type ForwardState = {
  requestId: string
  nextRole: string
}

export default function LeaveApprovalClient({ requests, currentUserId, currentUserRole }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [forwardState, setForwardState] = useState<ForwardState | null>(null)
  const [forwarding, setForwarding] = useState(false)

  const canActAsAdmin = currentUserRole === 'admin' || currentUserRole === 'hr'

  // Cari pending step untuk user ini, ATAU admin bisa approve step siapa saja (fallback)
  const getPendingStepForUser = (req: LeaveRequest) => {
    // Admin: bisa approve step pending siapa saja (fallback + final approval)
    if (canActAsAdmin) {
      return req.steps.find(s => s.status === 'pending') ?? null
    }
    return req.steps.find(
      s => s.status === 'pending' && s.approver_user_id === currentUserId
    )
  }

  // Cek apakah ada step waiting yang ditujukan untuk user ini
  const getWaitingStepForUser = (req: LeaveRequest) => {
    if (canActAsAdmin) return null
    return req.steps.find(
      s => s.status === 'waiting' && s.approver_user_id === currentUserId
    )
  }

  // Admin/HR bisa forward step waiting → pending
  const getForwardableStep = (req: LeaveRequest) => {
    if (!canActAsAdmin) return null
    const waitingSteps = req.steps.filter(s => s.status === 'waiting')
    const pendingSteps = req.steps.filter(s => s.status === 'pending')
    // Ada step waiting dan tidak ada pending → bisa forward
    if (req.steps.length > 0 && waitingSteps.length >= 1 && pendingSteps.length === 0) {
      return waitingSteps[0]
    }
    return null
  }

  const filtered = requests.filter(r => {
    if (activeTab === 'all') return true
    if (activeTab === 'pending') return r.status === 'pending'
    if (activeTab === 'approved') return r.status === 'approved'
    if (activeTab === 'rejected') return r.status === 'rejected'
    return true
  })

  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  }

  const openModal = (stepId: string, action: 'approve' | 'reject', requestId: string) => {
    setModal({ stepId, action, requestId })
    setNotes('')
    setSubmitError('')
  }

  const closeModal = () => {
    setModal(null)
    setNotes('')
    setSubmitError('')
  }

  const handleForward = async () => {
    if (!forwardState) return
    setForwarding(true)
    try {
      const res = await fetch('/api/leave-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forward', requestId: forwardState.requestId }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        alert(json.error ?? 'Gagal meneruskan permohonan.')
        return
      }
      setForwardState(null)
      router.refresh()
    } catch {
      alert('Terjadi kesalahan jaringan.')
    } finally {
      setForwarding(false)
    }
  }

  const handleSubmit = async () => {
    if (!modal) return
    if (modal.action === 'reject' && !notes.trim()) {
      setSubmitError('Catatan wajib diisi untuk penolakan.')
      return
    }

    setSubmitting(true)
    setSubmitError('')

    try {
      const res = await fetch('/api/leave-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId: modal.stepId, action: modal.action, notes: notes.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setSubmitError(json.error ?? 'Terjadi kesalahan.')
        return
      }
      closeModal()
      router.refresh()
    } catch {
      setSubmitError('Terjadi kesalahan jaringan.')
    } finally {
      setSubmitting(false)
    }
  }

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'pending', label: 'Menunggu' },
    { key: 'approved', label: 'Disetujui' },
    { key: 'rejected', label: 'Ditolak' },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Persetujuan Cuti</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola dan tinjau permohonan cuti karyawan</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              activeTab === tab.key ? 'bg-teal-100 text-teal-700' : 'bg-gray-200 text-gray-500'
            }`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500">Tidak ada permohonan cuti.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(req => {
            const pendingStepForMe = getPendingStepForUser(req)
            const waitingStepForMe = getWaitingStepForUser(req)
            const forwardableStep = getForwardableStep(req)

            const divKey = req.employee_division ?? ''
            const divLabel = DIVISION_LABELS[divKey] ?? req.employee_division ?? '—'
            const divColor = DIVISION_COLORS[divKey] ?? 'bg-gray-100 text-gray-600'

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-teal-700 font-bold text-sm">
                        {req.employee_name[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{req.employee_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${divColor}`}>
                          {divLabel}
                        </span>
                        {req.employee_position && (
                          <span className="text-xs text-gray-400">{req.employee_position}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={req.status} />
                </div>

                {/* Leave info */}
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Jenis</p>
                    <p className="text-sm font-medium text-gray-800">
                      {TYPE_LABELS[req.type] ?? req.type}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Tanggal Mulai</p>
                    <p className="text-sm font-medium text-gray-800">{fmtDate(req.start_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Tanggal Selesai</p>
                    <p className="text-sm font-medium text-gray-800">{fmtDate(req.end_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Durasi</p>
                    <p className="text-sm font-medium text-gray-800">
                      {req.total_days
                        ? `${req.total_days} hari`
                        : `${Math.round((new Date(req.end_date).getTime() - new Date(req.start_date).getTime()) / 86400000) + 1} hari`}
                    </p>
                  </div>
                </div>

                {req.reason && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400 mb-0.5">Alasan</p>
                    <p className="text-sm text-gray-700">{req.reason}</p>
                  </div>
                )}

                {/* Step tracker */}
                {req.steps.length > 0 && <StepTracker steps={req.steps} />}

                {/* Action buttons */}
                {pendingStepForMe && (
                  <div className="mt-4 space-y-2">
                    {canActAsAdmin && pendingStepForMe.approver_user_id !== currentUserId && (
                      <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg inline-block">
                        Approver asli: {pendingStepForMe.approver_name ?? '—'} — Anda menyetujui sebagai pengganti
                      </p>
                    )}
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => openModal(pendingStepForMe.id, 'reject', req.id)}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        Tolak
                      </button>
                      <button
                        onClick={() => openModal(pendingStepForMe.id, 'approve', req.id)}
                        className="px-4 py-2 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors"
                      >
                        Setujui
                      </button>
                    </div>
                  </div>
                )}

                {/* Pesan menunggu diteruskan (untuk approver yang step-nya masih waiting) */}
                {!pendingStepForMe && waitingStepForMe && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-gray-400 text-sm">⏳</span>
                    <p className="text-sm text-gray-500">
                      Menunggu level sebelumnya disetujui, lalu diteruskan oleh Admin/HR ke Anda (Level {waitingStepForMe.level} — {waitingStepForMe.role_label}).
                    </p>
                  </div>
                )}

                {/* Tombol teruskan ke level berikutnya (khusus admin/HR) */}
                {forwardableStep && (
                  <div className="mt-4 flex items-center justify-between gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 text-sm">📤</span>
                      <p className="text-sm text-blue-700 font-medium">
                        Teruskan ke <span className="font-bold">{forwardableStep.role_label}</span> (Level {forwardableStep.level})?
                      </p>
                    </div>
                    <button
                      onClick={() => setForwardState({ requestId: req.id, nextRole: forwardableStep.role_label })}
                      className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shrink-0"
                    >
                      Teruskan →
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Konfirmasi Forward ke Direktur */}
      {forwardState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl shrink-0">📤</div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Teruskan ke {forwardState.nextRole}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Permohonan akan diteruskan untuk persetujuan akhir</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              Yakin ingin meneruskan permohonan ini ke <span className="font-semibold text-gray-800">{forwardState.nextRole}</span>?
              Setelah diteruskan, {forwardState.nextRole} akan mendapat notifikasi untuk memberikan keputusan akhir.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setForwardState(null)}
                disabled={forwarding}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleForward}
                disabled={forwarding}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {forwarding ? 'Meneruskan...' : 'Ya, Teruskan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              {modal.action === 'approve' ? 'Setujui Permohonan' : 'Tolak Permohonan'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {modal.action === 'approve'
                ? 'Tambahkan catatan opsional, lalu konfirmasi persetujuan.'
                : 'Berikan alasan penolakan (wajib).'}
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Catatan {modal.action === 'reject' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={modal.action === 'reject' ? 'Masukkan alasan penolakan...' : 'Opsional...'}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
            />

            {submitError && (
              <p className="mt-2 text-sm text-red-600">{submitError}</p>
            )}

            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={closeModal}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${
                  modal.action === 'approve'
                    ? 'bg-teal-500 hover:bg-teal-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {submitting ? 'Memproses...' : modal.action === 'approve' ? 'Setujui' : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
