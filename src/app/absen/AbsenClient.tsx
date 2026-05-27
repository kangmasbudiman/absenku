'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Check, Camera, RotateCcw, ArrowLeft, Building2, User, ScanFace } from 'lucide-react'

type Employee = {
  id: string
  full_name: string
  employee_id: string | null
  position: string | null
  face_data_exists: boolean
}

type Org = { id: string; name: string; address?: string | null }

type Step = 'org' | 'employee' | 'camera' | 'result'

export default function AbsenClient() {
  const [orgCode, setOrgCode] = useState('')
  const [org, setOrg] = useState<Org | null>(null)
  const [empCode, setEmpCode] = useState('')
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [step, setStep] = useState<Step>('org')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [todayStatus, setTodayStatus] = useState<{ has_checked_in: boolean; has_checked_out: boolean } | null>(null)

  // Camera
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [photoTaken, setPhotoTaken] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [faceError, setFaceError] = useState('')

  // Face verification
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsReady, setModelsReady] = useState(false)
  const [lastSimilarity, setLastSimilarity] = useState<number | null>(null)

  // Result
  const [result, setResult] = useState<{ type: 'checkin' | 'checkout'; time: string } | null>(null)

  // Load saved org code
  useEffect(() => {
    try {
      const saved = localStorage.getItem('absenku_org_code')
      if (saved) setOrgCode(saved)
    } catch {}
  }, [])

  // Auto-start camera when entering camera step
  useEffect(() => {
    if (step === 'camera' && !photoTaken) {
      startCamera()
    }
    if (step !== 'camera') {
      stopCamera()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // Load face detection models when entering camera step
  useEffect(() => {
    if (step === 'camera' && employee?.face_data_exists && !modelsReady && !modelsLoading) {
      setModelsLoading(true)
      import('@/lib/face-detect').then(({ loadModels }) =>
        loadModels()
          .then(() => setModelsReady(true))
          .catch(() => setFaceError('Gagal memuat model verifikasi wajah'))
          .finally(() => setModelsLoading(false))
      )
    }
  }, [step, employee, modelsReady, modelsLoading])

  const searchOrg = async () => {
    if (!orgCode.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/public-employees?org_code=${encodeURIComponent(orgCode.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal')
      setOrg({ id: data.org.id, name: data.org.name, address: data.org.address })
      try { localStorage.setItem('absenku_org_code', orgCode.trim()) } catch {}
      setStep('employee')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal')
    } finally {
      setLoading(false)
    }
  }

  const lookupEmployee = async () => {
    if (!empCode.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/public-employees?org_code=${encodeURIComponent(orgCode.trim())}&emp_code=${encodeURIComponent(empCode.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal')
      if (!data.employees?.length) throw new Error('Karyawan tidak ditemukan')
      const emp = data.employees[0]
      setEmployee(emp)
      try {
        const sRes = await fetch(`/api/public-attendance?user_id=${emp.id}`)
        const sData = await sRes.json()
        setTodayStatus(sData)
      } catch { setTodayStatus(null) }
      setStep('camera')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal')
    } finally {
      setLoading(false)
    }
  }

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraReady(true)
      }
    } catch {
      setError('Gagal mengakses kamera. Pastikan izin kamera diaktifkan.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraReady(false)
  }, [])

  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setPhotoTaken(dataUrl)
    stopCamera()

    // No face data registered — skip verification
    if (!employee?.face_data_exists) {
      setVerified(true)
      return
    }

    // Real face verification
    setVerifying(true)
    setFaceError('')
    setLastSimilarity(null)
    try {
      const { loadModels, detectAndExtract } = await import('@/lib/face-detect')
      await loadModels()

      const faceResult = await detectAndExtract(canvas)
      if (!faceResult) {
        setFaceError('Wajah tidak terdeteksi. Pastikan wajah terlihat jelas dan pencahayaan cukup.')
        return
      }

      // Send descriptor + geometry to server
      const verifyRes = await fetch('/api/verify-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: employee.id,
          captured_face_data: {
            descriptor: faceResult.descriptor,
            geometry: faceResult.geometry,
          },
        }),
      })
      const verifyData = await verifyRes.json()

      if (verifyData.verified) {
        setVerified(true)
        setLastSimilarity(verifyData.similarity)
      } else {
        setFaceError(`Verifikasi gagal${verifyData.face_data_exists ? ` (kesamaan: ${Math.round(verifyData.similarity * 100)}%)` : ''}. Coba lagi.`)
      }
    } catch {
      setFaceError('Gagal memverifikasi wajah. Silakan coba lagi.')
    } finally {
      setVerifying(false)
    }
  }

  const retake = () => {
    setPhotoTaken(null)
    setVerified(false)
    setVerifying(false)
    setFaceError('')
    setLastSimilarity(null)
    startCamera()
  }

  const submitAttendance = async () => {
    if (!employee || !photoTaken || !orgCode) return
    setLoading(true)
    setError('')
    try {
      const base64 = photoTaken.split(',')[1]
      const res = await fetch('/api/public-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: employee.id,
          org_code: orgCode.trim(),
          photo_base64: base64,
          face_verified: verified,
          face_confidence: lastSimilarity,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal')
      setResult({ type: data.type, time: data.time })
      setStep('result')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gagal')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    stopCamera()
    setEmployee(null)
    setEmpCode('')
    setPhotoTaken(null)
    setResult(null)
    setTodayStatus(null)
    setError('')
    setFaceError('')
    setVerified(false)
    setVerifying(false)
    setCameraReady(false)
    setLastSimilarity(null)
    setStep(org ? 'employee' : 'org')
  }

  // Step indicator data
  const steps = [
    { key: 'org', label: 'Perusahaan', num: 1, icon: Building2 },
    { key: 'employee', label: 'Karyawan', num: 2, icon: User },
    { key: 'camera', label: 'Absensi', num: 3, icon: ScanFace },
  ] as const

  const currentIndex = steps.findIndex(s => s.key === step)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-teal-950 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <div>
              <span className="text-white font-bold text-base">AbsenKu</span>
              {org && (
                <span className="text-white/50 text-xs block leading-tight">{org.name}</span>
              )}
            </div>
          </div>
          {org && (
            <span className="text-teal-400/80 text-xs font-medium bg-teal-400/10 px-2.5 py-1 rounded-full">
              Absensi Web
            </span>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-md space-y-4">

          {/* Step Indicator */}
          {org && step !== 'result' && (
            <div className="flex items-center justify-center gap-1 py-3">
              {steps.map((s, i) => {
                const StepIcon = s.icon
                const completed = i < currentIndex
                const active = i === currentIndex
                return (
                  <div key={s.key} className="flex items-center">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all ${
                      completed ? 'text-teal-400' :
                      active ? 'text-teal-300 bg-teal-400/10' :
                      'text-white/25'
                    }`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        completed ? 'bg-teal-500 text-white' :
                        active ? 'bg-teal-400/20 text-teal-300 ring-2 ring-teal-400/50' :
                        'bg-white/10 text-white/25'
                      }`}>
                        {completed ? <Check className="w-4 h-4" /> : <StepIcon className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-xs font-medium hidden sm:inline">{s.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`w-6 h-0.5 rounded-full transition-colors ${i < currentIndex ? 'bg-teal-500' : 'bg-white/10'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Step: Org */}
          {step === 'org' && (
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Building2 className="w-8 h-8 text-teal-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Absensi Web</h1>
              <p className="text-sm text-gray-500 mb-8">Masukkan kode perusahaan untuk memulai absensi</p>
              <div className="space-y-4">
                <input
                  value={orgCode}
                  onChange={e => setOrgCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && searchOrg()}
                  placeholder="Masukkan kode perusahaan"
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-xl text-sm font-mono tracking-widest text-center text-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                />
                <button
                  onClick={searchOrg}
                  disabled={loading || !orgCode.trim()}
                  className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
                >
                  {loading ? 'Mencari...' : 'Masuk'}
                </button>
              </div>
            </div>
          )}

          {/* Step: Employee */}
          {step === 'employee' && org && (
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="w-7 h-7 text-teal-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Identitas Karyawan</h2>
                <p className="text-sm text-gray-500 mt-1">Masukkan kode karyawan Anda</p>
              </div>
              <div className="space-y-4">
                <input
                  value={empCode}
                  onChange={e => setEmpCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && lookupEmployee()}
                  placeholder="Kode karyawan"
                  autoFocus
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-xl text-sm font-mono tracking-widest text-center text-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                />
                <button
                  onClick={lookupEmployee}
                  disabled={loading || !empCode.trim()}
                  className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
                >
                  {loading ? 'Mencari...' : 'Lanjutkan'}
                </button>
                <button
                  onClick={() => { setOrg(null); setStep('org') }}
                  className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Ganti perusahaan
                </button>
              </div>
            </div>
          )}

          {/* Step: Camera */}
          {step === 'camera' && employee && (
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Employee info bar */}
              <div className="bg-teal-50 px-5 py-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {employee.full_name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-teal-900 truncate">{employee.full_name}</p>
                  <p className="text-xs text-teal-700/60">
                    {todayStatus?.has_checked_out
                      ? 'Sudah check-in & check-out hari ini'
                      : todayStatus?.has_checked_in
                        ? 'Sudah check-in — akan check-out'
                        : 'Belum check-in hari ini'
                    }
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Camera area */}
                <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-[4/3]">
                  <video
                    ref={videoRef}
                    className={`w-full h-full object-cover ${photoTaken || !cameraReady ? 'hidden' : ''}`}
                    playsInline
                    muted
                  />
                  {photoTaken && (
                    <img src={photoTaken} alt="Foto" className="w-full h-full object-cover" />
                  )}
                  {!photoTaken && !cameraReady && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center text-white/40">
                        <Camera className="w-10 h-10 mx-auto mb-2" />
                        <p className="text-xs">Membuka kamera...</p>
                      </div>
                    </div>
                  )}

                  {/* Face guide oval */}
                  {!photoTaken && cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-44 h-56 border-2 border-white/40 rounded-full" />
                    </div>
                  )}

                  {/* Verifying overlay */}
                  {photoTaken && verifying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-full border-4 border-teal-400 border-t-transparent animate-spin" />
                        <p className="text-white text-sm font-medium">Memverifikasi wajah...</p>
                      </div>
                    </div>
                  )}

                  {/* Verified overlay */}
                  {photoTaken && verified && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                        <Check className="w-9 h-9 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                <canvas ref={canvasRef} className="hidden" />

                {/* Model loading indicator */}
                {!photoTaken && cameraReady && modelsLoading && (
                  <div className="text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
                    Memuat model verifikasi...
                  </div>
                )}

                {/* Face error */}
                {faceError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm text-center">
                    {faceError}
                  </div>
                )}

                {/* Actions */}
                {!photoTaken && cameraReady && (
                  <button
                    onClick={takePhoto}
                    disabled={employee.face_data_exists && !modelsReady}
                    className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" /> Ambil Foto
                  </button>
                )}

                {photoTaken && !verifying && !verified && !faceError && null}

                {faceError && photoTaken && !verifying && (
                  <button onClick={retake} className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
                    <RotateCcw className="w-4 h-4" /> Coba Lagi
                  </button>
                )}

                {verified && (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl text-sm font-medium text-center">
                      Wajah terverifikasi
                      {lastSimilarity !== null && (
                        <span className="text-green-500 ml-1">({Math.round(lastSimilarity * 100)}%)</span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={retake} className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
                        <RotateCcw className="w-4 h-4" /> Ulang
                      </button>
                      <button
                        onClick={submitAttendance}
                        disabled={loading}
                        className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors"
                      >
                        {loading ? 'Menyimpan...' : todayStatus?.has_checked_in ? 'Check-out' : 'Check-in'}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={reset}
                  className="w-full py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                </button>
              </div>
            </div>
          )}

          {/* Step: Result */}
          {step === 'result' && result && (
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {result.type === 'checkin' ? 'Check-in Berhasil!' : 'Check-out Berhasil!'}
              </h2>
              <p className="text-sm text-gray-500 mb-5">{employee?.full_name}</p>
              <div className="bg-teal-50 rounded-xl px-6 py-4 mb-6">
                <p className="text-3xl font-bold text-teal-600">{result.time} WIB</p>
              </div>
              {result.type === 'checkin' && (
                <p className="text-xs text-gray-400 mb-4">Jangan lupa check-out sebelum pulang</p>
              )}
              <button onClick={reset} className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold transition-colors">
                Selesai
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-4 py-3">
        <div className="max-w-md mx-auto text-center">
          {org?.address && (
            <p className="text-white/30 text-xs mb-1">{org.address}</p>
          )}
          <p className="text-white/20 text-xs">
            Powered by <span className="text-teal-400/60 font-semibold">AbsenKu</span>
          </p>
        </div>
      </footer>
    </div>
  )
}
