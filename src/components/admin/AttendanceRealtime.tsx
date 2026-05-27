'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js'

type NotifType = 'checkin' | 'leave'

interface ToastItem {
  id: string
  type: NotifType
  fullName: string
  unit: string | null
  detail: string
}

interface Props {
  orgId: string
  employeeIds: string[]
}

const LEAVE_LABEL: Record<string, string> = {
  izin: 'Izin',
  sakit: 'Sakit',
  cuti: 'Cuti Tahunan',
  cuti_tahunan: 'Cuti Tahunan',
  cuti_khusus: 'Cuti Khusus',
  darurat: 'Darurat',
}

export default function AttendanceRealtime({ orgId: _orgId, employeeIds }: Props) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const supabaseRef = useRef(createClient())
  const employeeIdsRef = useRef<string[]>(employeeIds)

  useEffect(() => {
    employeeIdsRef.current = employeeIds
  }, [employeeIds])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const pushToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `${toast.type}-${Date.now()}-${Math.random()}`
    setToasts((prev) => [{ ...toast, id }, ...prev].slice(0, 5))
    setTimeout(() => removeToast(id), 6000)
  }, [removeToast])

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabaseRef.current
      .from('profiles')
      .select('full_name, position')
      .eq('id', userId)
      .single()
    return data
  }, [])

  useEffect(() => {
    const supabase = supabaseRef.current

    const channel = supabase
      .channel('admin-notifications')
      // ── Absensi masuk ──────────────────────────────────
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendances' },
        async (payload: RealtimePostgresInsertPayload<{
          id: string
          user_id: string
          check_in_time: string | null
          [key: string]: unknown
        }>) => {
          const userId = payload.new.user_id
          if (employeeIdsRef.current.length > 0 && !employeeIdsRef.current.includes(userId)) return

          const profile = await fetchProfile(userId)
          if (!profile?.full_name) return

          const rawTime = payload.new.check_in_time ?? new Date().toISOString()
          const checkInTime = new Date(rawTime).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Jakarta',
          })

          pushToast({
            type: 'checkin',
            fullName: profile.full_name,
            unit: profile.position ?? null,
            detail: `${checkInTime} WIB`,
          })
        }
      )
      // ── Pengajuan cuti / izin ──────────────────────────
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leave_requests' },
        async (payload: RealtimePostgresInsertPayload<{
          id: string
          user_id: string
          type: string
          start_date: string
          [key: string]: unknown
        }>) => {
          const userId = payload.new.user_id
          if (employeeIdsRef.current.length > 0 && !employeeIdsRef.current.includes(userId)) return

          const profile = await fetchProfile(userId)
          if (!profile?.full_name) return

          const leaveLabel = LEAVE_LABEL[payload.new.type] ?? payload.new.type

          pushToast({
            type: 'leave',
            fullName: profile.full_name,
            unit: profile.position ?? null,
            detail: leaveLabel,
          })
        }
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] channel error — pastikan Realtime diaktifkan di tabel attendances & leave_requests')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchProfile, pushToast])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((toast) => {
        const isCheckin = toast.type === 'checkin'
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2.5 text-white rounded-lg shadow-lg px-4 py-2.5 max-w-xs animate-slide-in-right ${
              isCheckin ? 'bg-teal-600' : 'bg-indigo-600'
            }`}
          >
            <span className="text-base shrink-0">{isCheckin ? '✅' : '📋'}</span>
            <div className="leading-tight min-w-0">
              <p className="font-semibold text-sm truncate">{toast.fullName}</p>
              <p className={`text-xs truncate ${isCheckin ? 'text-teal-100' : 'text-indigo-100'}`}>
                {toast.unit ? `${toast.unit} · ` : ''}
                {isCheckin ? `Absen masuk ${toast.detail}` : `Mengajukan ${toast.detail}`}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className={`ml-1 text-lg font-bold leading-none shrink-0 transition-colors ${
                isCheckin ? 'text-teal-200 hover:text-white' : 'text-indigo-200 hover:text-white'
              }`}
              aria-label="Tutup"
            >
              ×
            </button>
          </div>
        )
      })}

      <style jsx>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
