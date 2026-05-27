'use client'

import { useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface Props {
  profile: Record<string, unknown>
  userId: string
}

const tabs = [
  { id: 'profile', label: 'Personal' },
  { id: 'password', label: 'Keamanan' },
  { id: 'avatar', label: 'Foto Profil' },
  { id: 'notifications', label: 'Notifikasi' },
]

export default function SettingsClient({ profile: initialProfile, userId }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') ?? 'profile'
  const [profile, setProfile] = useState<Record<string, unknown>>(initialProfile)
  const [avatarPreview, setAvatarPreview] = useState<string | null>((initialProfile.avatar_url as string) ?? null)

  const handleProfileUpdate = (updated: Partial<Record<string, unknown>>) => {
    setProfile(prev => ({ ...prev, ...updated }))
    router.refresh()
  }

  const joinDate = profile.created_at
    ? format(new Date(profile.created_at as string), 'MMMM yyyy', { locale: id })
    : '-'

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-gray-400">
                  {(profile.full_name as string)?.[0]?.toUpperCase() ?? '?'}
                </span>
              )}
            </div>
            <button
              onClick={() => router.push('/dashboard/settings?tab=avatar')}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors text-sm"
            >
              📷
            </button>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{(profile.full_name as string) ?? 'Pengguna'}</h1>
              <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium capitalize">
                {(profile.role as string)?.replace('_', ' ') ?? 'Admin'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{(profile.position as string) ?? 'Belum diisi'}</p>
            <div className="flex flex-wrap gap-4 mt-2">
              {(profile.phone as string) && (
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  📱 {profile.phone as string}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                📅 Bergabung {joinDate}
              </span>
              {(profile.employee_id as string) && (
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  🪪 {profile.employee_id as string}
                </span>
              )}
            </div>
          </div>

          {/* Edit button */}
          <button
            onClick={() => router.push('/dashboard/settings?tab=profile')}
            className="shrink-0 px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Edit Profil
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => router.push(`/dashboard/settings?tab=${tab.id}`)}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-teal-700 bg-teal-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'profile' && <ProfileTab profile={profile} userId={userId} onUpdate={handleProfileUpdate} />}
          {activeTab === 'password' && <PasswordTab />}
          {activeTab === 'avatar' && <AvatarTab profile={profile} userId={userId} onPreviewChange={(url) => { setAvatarPreview(url); handleProfileUpdate({ avatar_url: url }) }} />}
          {activeTab === 'notifications' && <NotificationsTab />}
        </div>
      </div>
    </div>
  )
}

function ProfileTab({ profile, userId, onUpdate }: { profile: Record<string, unknown>; userId: string; onUpdate: (data: Partial<Record<string, unknown>>) => void }) {
  const [form, setForm] = useState({
    full_name: (profile.full_name as string) ?? '',
    phone: (profile.phone as string) ?? '',
    position: (profile.position as string) ?? '',
    employee_id: (profile.employee_id as string) ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    setLoading(true)
    setMsg(null)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update(form).eq('id', userId)
    if (error) {
      setMsg({ type: 'error', text: error.message })
    } else {
      setMsg({ type: 'success', text: 'Data berhasil disimpan!' })
      onUpdate(form)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold text-gray-800">Informasi Personal</h2>
        <p className="text-sm text-gray-400 mt-0.5">Perbarui data diri dan informasi profil Anda</p>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { key: 'full_name', label: 'Nama Lengkap', placeholder: 'Masukkan nama lengkap' },
          { key: 'phone', label: 'Nomor Telepon', placeholder: '+62 812 xxxx xxxx' },
          { key: 'position', label: 'Jabatan', placeholder: 'Contoh: HR Manager' },
          { key: 'employee_id', label: 'ID Karyawan', placeholder: 'Contoh: EMP-001' },
        ].map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
            <input
              type="text"
              value={form[field.key as keyof typeof form]}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-gray-50/50"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  )
}

function PasswordTab() {
  const [form, setForm] = useState({ newPass: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSave = async () => {
    if (form.newPass !== form.confirm) return setMsg({ type: 'error', text: 'Password baru tidak cocok!' })
    if (form.newPass.length < 6) return setMsg({ type: 'error', text: 'Password minimal 6 karakter' })
    setLoading(true)
    setMsg(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: form.newPass })
    setMsg(error ? { type: 'error', text: error.message } : { type: 'success', text: 'Password berhasil diubah!' })
    if (!error) setForm({ newPass: '', confirm: '' })
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold text-gray-800">Ubah Password</h2>
        <p className="text-sm text-gray-400 mt-0.5">Pastikan password baru minimal 6 karakter</p>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      <div className="space-y-4 max-w-sm">
        {[
          { key: 'newPass', label: 'Password Baru', placeholder: '••••••••' },
          { key: 'confirm', label: 'Konfirmasi Password', placeholder: '••••••••' },
        ].map(field => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
            <input
              type="password"
              value={form[field.key as keyof typeof form]}
              onChange={e => setForm({ ...form, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-gray-50/50"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          {loading ? 'Menyimpan...' : 'Ubah Password'}
        </button>
      </div>
    </div>
  )
}

function AvatarTab({ profile, userId, onPreviewChange }: { profile: Record<string, unknown>; userId: string; onPreviewChange: (url: string) => void }) {
  const [preview, setPreview] = useState<string | null>((profile.avatar_url as string) ?? null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setLoading(true)
    setMsg(null)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) { setMsg({ type: 'error', text: error.message }); setLoading(false); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId)
    onPreviewChange(data.publicUrl)
    setMsg({ type: 'success', text: 'Foto profil berhasil diperbarui!' })
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold text-gray-800">Foto Profil</h2>
        <p className="text-sm text-gray-400 mt-0.5">Format JPG atau PNG, ukuran maksimal 2MB</p>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm ${msg.type === 'success' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      <div className="flex items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-4 border-gray-200 shrink-0">
          {preview ? (
            <img src={preview} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-bold text-gray-400">
              {(profile.full_name as string)?.[0]?.toUpperCase() ?? '?'}
            </span>
          )}
        </div>
        <div className="space-y-3">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="block px-4 py-2 border border-teal-500 text-teal-600 rounded-xl text-sm font-medium hover:bg-teal-50 transition-colors"
          >
            Pilih Foto Baru
          </button>
          {preview && preview !== profile.avatar_url && (
            <button
              onClick={handleUpload}
              disabled={loading}
              className="block px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {loading ? 'Mengupload...' : 'Simpan Foto'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function NotificationsTab() {
  const [settings, setSettings] = useState({
    absensi_masuk: true,
    absensi_telat: true,
    izin_pending: true,
    payroll: false,
    laporan_harian: false,
  })

  const items = [
    { key: 'absensi_masuk', label: 'Notifikasi Check-in', desc: 'Terima notif saat karyawan check-in' },
    { key: 'absensi_telat', label: 'Karyawan Terlambat', desc: 'Notif saat ada karyawan yang terlambat' },
    { key: 'izin_pending', label: 'Pengajuan Izin Baru', desc: 'Notif saat ada izin yang perlu disetujui' },
    { key: 'payroll', label: 'Payroll Siap', desc: 'Notif saat slip gaji sudah digenerate' },
    { key: 'laporan_harian', label: 'Laporan Harian', desc: 'Ringkasan kehadiran setiap hari' },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold text-gray-800">Preferensi Notifikasi</h2>
        <p className="text-sm text-gray-400 mt-0.5">Atur notifikasi yang ingin Anda terima</p>
      </div>
      <div className="space-y-1 divide-y divide-gray-50">
        {items.map(item => (
          <div key={item.key} className="flex items-center justify-between py-3.5">
            <div>
              <p className="text-sm font-medium text-gray-800">{item.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, [item.key]: !s[item.key as keyof typeof s] }))}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${settings[item.key as keyof typeof settings] ? 'bg-teal-500' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${settings[item.key as keyof typeof settings] ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-2">
        <button className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors">
          Simpan Preferensi
        </button>
      </div>
    </div>
  )
}
