'use client'

import { useState, useEffect } from 'react'
import { Check, XCircle, Clock, Shield, QrCode } from 'lucide-react'

type PageState = 'confirm' | 'loading' | 'success' | 'error'

export default function QrCheckinClient({
  token,
  isValid,
  employeeName,
  employeeId,
  employeePosition,
  orgName,
  tokenType,
  expiresAt,
}: {
  token: string
  isValid: boolean
  employeeName: string | null
  employeeId: string | null
  employeePosition: string | null
  orgName: string | null
  tokenType: string
  expiresAt: string | null
}) {
  const [state, setState] = useState<PageState>(isValid ? 'confirm' : 'error')
  const [errorMsg, setErrorMsg] = useState(isValid ? '' : 'QR code tidak valid atau sudah kadaluarsa')
  const [result, setResult] = useState<{ type: string; time: string; employee_name: string } | null>(null)
  const [countdown, setCountdown] = useState('')

  // Countdown for expiry
  useEffect(() => {
    if (!expiresAt || !isValid) return
    const interval = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) {
        setCountdown('Kadaluarsa')
        setState('error')
        setErrorMsg('QR code sudah kadaluarsa')
        clearInterval(interval)
        return
      }
      const mins = Math.floor(diff / 60_000)
      const secs = Math.floor((diff % 60_000) / 1000)
      setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, isValid])

  const handleConfirm = async () => {
    setState('loading')
    try {
      const res = await fetch('/api/qr-attendance/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal memproses')
        setState('error')
        return
      }
      setResult(data)
      setState('success')
    } catch {
      setErrorMsg('Koneksi gagal. Coba lagi.')
      setState('error')
    }
  }

  const now = new Date()
  const currentTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-teal-950 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-500 rounded-lg flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-base">{orgName || 'AbsenKu'}</span>
              <span className="text-white/50 text-xs block leading-tight">QR Admin Check-in</span>
            </div>
          </div>
          <span className="text-teal-400/80 text-xs font-medium bg-teal-400/10 px-2.5 py-1 rounded-full">
            QR Code
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-6">
        <div className="w-full max-w-md space-y-4">

          {/* Error State */}
          {state === 'error' && (
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <div className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Gagal</h2>
              <p className="text-sm text-gray-500">{errorMsg}</p>
              <p className="text-xs text-gray-400 mt-4">
                Hubungi admin jika Anda membutuhkan bantuan
              </p>
            </div>
          )}

          {/* Confirmation State */}
          {state === 'confirm' && (
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
              <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <div className="w-14 h-14 bg-teal-500 rounded-full flex items-center justify-center">
                  <Shield className="w-7 h-7 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Konfirmasi {tokenType === 'checkin' ? 'Check-in' : 'Check-out'}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Data berikut akan dicatat sebagai hadir
              </p>

              {/* Employee Info */}
              <div className="bg-gray-50 rounded-xl px-5 py-4 mb-4 text-left space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-sm font-bold text-teal-600">
                    {employeeName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{employeeName}</p>
                    <p className="text-xs text-gray-400">
                      {employeeId && <span className="mr-2">{employeeId}</span>}
                      {employeePosition}
                    </p>
                  </div>
                </div>
              </div>

              {/* Time & Expiry */}
              <div className="flex gap-3 mb-6">
                <div className="flex-1 bg-teal-50 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-teal-600 mb-1">Waktu</p>
                  <p className="text-lg font-bold text-teal-700">{currentTime} WIB</p>
                </div>
                <div className="flex-1 bg-amber-50 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-amber-600 mb-1">Berlaku</p>
                  <p className="text-lg font-mono font-bold text-amber-700">{countdown}</p>
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 text-left">
                <p className="text-xs text-blue-700">
                  📋 Absensi ini dicatat melalui QR Admin — tanpa verifikasi wajah & lokasi. Data akan tercatat di audit log.
                </p>
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleConfirm}
                className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Konfirmasi {tokenType === 'checkin' ? 'Check-in' : 'Check-out'}
              </button>
            </div>
          )}

          {/* Loading State */}
          {state === 'loading' && (
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
              <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <div className="w-14 h-14 bg-teal-500 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Memproses...</h2>
              <p className="text-sm text-gray-500">Menyimpan data kehadiran</p>
            </div>
          )}

          {/* Success State */}
          {state === 'success' && result && (
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {result.type === 'checkin' ? 'Check-in Berhasil!' : 'Check-out Berhasil!'}
              </h2>
              <p className="text-sm text-gray-500 mb-5">{result.employee_name}</p>
              <div className="bg-teal-50 rounded-xl px-6 py-4 mb-4">
                <p className="text-3xl font-bold text-teal-600">{result.time} WIB</p>
              </div>
              <p className="text-xs text-gray-400">
                Dicatat via QR Admin · {currentTime}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-4 py-3">
        <div className="max-w-md mx-auto text-center">
          <p className="text-white/20 text-xs">
            Powered by <span className="text-teal-400/60 font-semibold">{orgName || 'AbsenKu'}</span>
          </p>
        </div>
      </footer>
    </div>
  )
}
