'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  title: string
  message?: string
  body?: string
  type: string
  is_read: boolean
  link?: string
  entity_id?: string
  created_at: string
}

interface OrgDetail {
  id: string
  name: string
  company_code: string
  owner_name: string
  owner_email: string
  owner_phone?: string
  owner_position?: string
  industry?: string
  address?: string
  employee_count_range?: string
  status: string
  registered_at: string
}

const TYPE_ICON: Record<string, string> = {
  info: '📋', success: '✅', warning: '⚠️', error: '❌',
  company: '🏭', leave: '📝', attendance: '🕐',
}
const TYPE_COLOR: Record<string, string> = {
  info: 'bg-blue-50 text-blue-600', success: 'bg-green-50 text-green-600',
  warning: 'bg-yellow-50 text-yellow-600', error: 'bg-red-50 text-red-600',
  company: 'bg-teal-50 text-teal-600', leave: 'bg-purple-50 text-purple-600',
  attendance: 'bg-orange-50 text-orange-600',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  return `${Math.floor(hours / 24)} hari lalu`
}

export default function NotificationBell({ role }: { role: string }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [orgDetail, setOrgDetail] = useState<OrgDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const router = useRouter()

  const unread = notifications.filter(n => !n.is_read).length

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) console.error('[NotifBell] error:', error.message, error.code)
    if (!data?.length) console.warn('[NotifBell] empty — uid:', user?.id)
    setNotifications(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Realtime: refresh otomatis saat ada notifikasi baru
  useEffect(() => {
    const channel = supabase
      .channel('notifications-bell')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, fetchNotifications])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const handleDetail = async (n: Notification) => {
    markRead(n.id)
    if (n.entity_id && n.type === 'company') {
      setLoadingDetail(true)
      const { data } = await supabase.from('organizations').select('*').eq('id', n.entity_id).single()
      setOrgDetail(data)
      setLoadingDetail(false)
    } else if (n.link) {
      setOpen(false)
      router.push(n.link)
    }
  }

  const STATUS_STYLE: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }
  const STATUS_LABEL: Record<string, string> = {
    pending: 'Menunggu Verifikasi',
    approved: 'Disetujui',
    rejected: 'Ditolak',
  }

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors relative shrink-0"
        >
          <span className="text-xl">🔔</span>
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800">Notifikasi</h3>
                {unread > 0 && <p className="text-xs text-gray-400 mt-0.5">{unread} belum dibaca</p>}
              </div>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-teal-600 hover:text-teal-700 font-semibold">
                  Tandai semua dibaca
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="py-10 text-center text-sm text-gray-400">Memuat...</div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-3xl mb-2">🔔</p>
                  <p className="text-sm text-gray-500 font-medium">Tidak ada notifikasi</p>
                  <p className="text-xs text-gray-400 mt-1">Semua aktivitas akan muncul di sini</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map(n => (
                    <div key={n.id} className={`flex gap-3 px-5 py-4 transition-colors hover:bg-gray-50 ${!n.is_read ? 'bg-teal-50/30' : ''}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${TYPE_COLOR[n.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {TYPE_ICON[n.type] ?? '🔔'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-semibold ${!n.is_read ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                          {!n.is_read && <span className="w-2 h-2 bg-teal-500 rounded-full shrink-0 mt-1.5" />}
                        </div>
                        {(n.message || n.body) && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message ?? n.body}</p>}
                        <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                        <button
                          onClick={() => handleDetail(n)}
                          className="text-xs text-teal-600 hover:underline font-medium mt-1 inline-block"
                        >
                          Lihat detail →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="border-t border-gray-100 px-5 py-3 text-center">
                <p className="text-xs text-gray-400">Menampilkan {notifications.length} notifikasi terakhir</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Detail Perusahaan */}
      {(loadingDetail || orgDetail) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {loadingDetail ? (
              <div className="p-10 text-center text-gray-400">Memuat detail...</div>
            ) : orgDetail && (
              <>
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600 font-bold text-lg">
                      {orgDetail.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{orgDetail.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[orgDetail.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[orgDetail.status] ?? orgDetail.status}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setOrgDetail(null)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none">×</button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Nama Pemilik / PIC', value: orgDetail.owner_name },
                      { label: 'Jabatan', value: orgDetail.owner_position ?? '-' },
                      { label: 'Email', value: orgDetail.owner_email },
                      { label: 'Telepon', value: orgDetail.owner_phone ?? '-' },
                      { label: 'Industri', value: orgDetail.industry ?? '-' },
                      { label: 'Jumlah Karyawan', value: orgDetail.employee_count_range ?? '-' },
                    ].map(f => (
                      <div key={f.label}>
                        <p className="text-xs text-gray-400 mb-0.5">{f.label}</p>
                        <p className="text-sm font-medium text-gray-800">{f.value}</p>
                      </div>
                    ))}
                  </div>

                  {orgDetail.address && (
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Alamat</p>
                      <p className="text-sm font-medium text-gray-800">{orgDetail.address}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-0.5">Tanggal Daftar</p>
                    <p className="text-sm font-medium text-gray-800">
                      {new Date(orgDetail.registered_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {orgDetail.status === 'pending' && (
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => { setOrgDetail(null); setOpen(false); router.push('/dashboard/super-settings') }}
                        className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors"
                      >
                        Tinjau Pendaftaran →
                      </button>
                      <button onClick={() => setOrgDetail(null)} className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">
                        Tutup
                      </button>
                    </div>
                  )}
                  {orgDetail.status !== 'pending' && (
                    <button onClick={() => setOrgDetail(null)} className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50">
                      Tutup
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
