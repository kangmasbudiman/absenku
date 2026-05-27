'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LogoutDialog from './LogoutDialog'
import NotificationBell from './NotificationBell'
import ErrorBoundary from '@/components/ErrorBoundary'

interface NavbarProps {
  onToggle: () => void
  collapsed: boolean
  profile: {
    full_name: string
    role: string
    avatar_url?: string | null
  }
}

const quickLinks = [
  { label: 'Karyawan', href: '/dashboard/employees', icon: '👥' },
  { label: 'Absensi Hari Ini', href: '/dashboard/reports', icon: '📋' },
  { label: 'Penggajian', href: '/dashboard/payroll', icon: '💰' },
  { label: 'Shift', href: '/dashboard/shifts', icon: '🕐' },
  { label: 'Lokasi Kantor', href: '/dashboard/locations', icon: '📍' },
  { label: 'Laporan', href: '/dashboard/reports', icon: '📈' },
  { label: 'Pengaturan Akun', href: '/dashboard/settings', icon: '⚙️' },
  { label: 'Departemen', href: '/dashboard/departments', icon: '🏗️' },
]

export default function Navbar({ onToggle, collapsed, profile }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showLogout, setShowLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const filtered = quickLinks.filter(l =>
    l.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50)
  }, [searchOpen])

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery('') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const menuItems = [
    { icon: '👤', label: 'Data Diri', href: '/dashboard/settings?tab=profile' },
    { icon: '🔒', label: 'Ubah Password', href: '/dashboard/settings?tab=password' },
    { icon: '🖼️', label: 'Foto Profil', href: '/dashboard/settings?tab=avatar' },
    { icon: '🔔', label: 'Notifikasi', href: '/dashboard/settings?tab=notifications' },
  ]

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center px-4 gap-3 shrink-0 shadow-sm z-20">
      {/* Hamburger */}
      <button
        onClick={onToggle}
        className="w-8 h-8 flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
      >
        <span className="block h-0.5 w-5 bg-gray-600" />
        <span className={`block h-0.5 bg-gray-600 transition-all duration-300 ${collapsed ? 'w-5' : 'w-3'}`} />
        <span className="block h-0.5 w-5 bg-gray-600" />
      </button>

      {/* Search bar */}
      <div className="relative flex-1 max-w-md" ref={searchRef}>
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-400 transition-colors"
        >
          <span>🔍</span>
          <span className="flex-1 text-left">Cari menu, karyawan...</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-400 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Search dropdown */}
        {searchOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <span className="text-gray-400">🔍</span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari menu, fitur..."
                className="flex-1 text-sm outline-none text-gray-800 placeholder-gray-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
              )}
            </div>
            <div className="py-2 max-h-64 overflow-y-auto">
              {filtered.length > 0 ? (
                <>
                  <p className="px-4 py-1.5 text-xs text-gray-400 font-semibold uppercase tracking-wider">Menu</p>
                  {filtered.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-teal-50 hover:text-teal-700 transition-colors text-sm text-gray-700"
                    >
                      <span className="w-6 text-center">{link.icon}</span>
                      {link.label}
                    </Link>
                  ))}
                </>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  Tidak ditemukan untuk &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifikasi */}
        <ErrorBoundary>
          <NotificationBell role={profile.role} />
        </ErrorBoundary>

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : profile.full_name[0]?.toUpperCase()
              }
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-800 leading-none">{profile.full_name}</p>
              <p className="text-xs text-gray-400 capitalize mt-0.5">{profile.role.replace('_', ' ')}</p>
            </div>
            <span className={`text-gray-400 text-xs transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{profile.full_name}</p>
                <p className="text-xs text-gray-400 capitalize mt-0.5">{profile.role.replace('_', ' ')}</p>
              </div>
              <div className="py-1.5">
                {menuItems.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                  >
                    <span className="w-5 text-center">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-1.5 px-2">
                <button
                  onClick={() => { setDropdownOpen(false); setShowLogout(true) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <span className="w-5 text-center">🚪</span>
                  Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <LogoutDialog
        open={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={handleLogout}
        isLoading={loggingOut}
      />
    </header>
  )
}
