'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const EMPLOYEE_COUNT_OPTIONS = ['1-10', '11-50', '51-200', '201-500', '500+']
const INDUSTRY_OPTIONS = [
  'Teknologi & IT', 'Manufaktur', 'Perdagangan & Retail', 'Konstruksi',
  'Kesehatan', 'Pendidikan', 'Logistik & Transportasi', 'Keuangan & Perbankan',
  'Properti', 'Perhotelan & Pariwisata', 'Lainnya',
]

export default function RegisterClient({ appName = 'AbsenKu' }: { appName?: string }) {
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    ownerName: '', ownerEmail: '', ownerPhone: '', ownerPosition: '',
    companyName: '', industry: '', address: '', employeeCountRange: '1-10',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      const { data, error } = await supabase.functions.invoke('register-company', {
        body: {
          owner_name: form.ownerName,
          company_name: form.companyName,
          owner_position: form.ownerPosition,
          owner_phone: form.ownerPhone,
          owner_email: form.ownerEmail,
          employee_count_range: form.employeeCountRange,
          industry: form.industry,
          address: form.address,
        },
      })
      if (error) {
        const body = await (error as { context?: Response }).context?.json().catch(() => null)
        throw new Error(body?.error ?? error.message)
      }
      if (data?.error) throw new Error(data.error)
      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Pendaftaran gagal')
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⏳</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pendaftaran Terkirim!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Tim kami akan memverifikasi data perusahaan Anda dalam <strong>1x24 jam</strong>.
          </p>
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 text-left space-y-3 mb-6">
            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Langkah selanjutnya</p>
            {[
              `Tim ${appName} akan meninjau data perusahaan Anda`,
              'Notifikasi persetujuan dikirim ke email Anda',
              'Setelah disetujui, Anda bisa login dan mulai setup',
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 bg-teal-500 text-white rounded-full text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">{i + 1}</span>
                <p className="text-sm text-gray-600">{s}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">Pertanyaan? Hubungi <span className="text-teal-600">support@absenku.app</span></p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-8 py-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">{appName[0]?.toUpperCase()}</span>
            </div>
            <span className="font-bold text-lg text-white">{appName}</span>
          </div>
          <h1 className="text-xl font-bold text-white">Daftar Perusahaan</h1>
          <p className="text-teal-100 text-sm mt-0.5">Gratis 30 hari • Tanpa kartu kredit</p>
          <div className="flex items-center gap-3 mt-4">
            {[{ n: 1, label: 'Data Diri' }, { n: 2, label: 'Data Perusahaan' }].map((s, i) => (
              <div key={s.n} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-0.5 bg-white/30" />}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= s.n ? 'bg-white text-teal-600' : 'bg-white/30 text-white'}`}>{s.n}</div>
                <span className={`text-xs ${step >= s.n ? 'text-white' : 'text-teal-200'}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.ownerName} onChange={e => update('ownerName', e.target.value)} placeholder="Nama lengkap Anda" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                  <input type="email" required value={form.ownerEmail} onChange={e => update('ownerEmail', e.target.value)} placeholder="email@perusahaan.com" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">No. HP / WhatsApp <span className="text-red-500">*</span></label>
                  <input type="tel" required value={form.ownerPhone} onChange={e => update('ownerPhone', e.target.value)} placeholder="+62 812 xxxx xxxx" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Jabatan <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.ownerPosition} onChange={e => update('ownerPosition', e.target.value)} placeholder="Direktur, HR Manager..." className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
              </div>
              <button type="button" onClick={() => { if (!form.ownerName || !form.ownerEmail || !form.ownerPhone || !form.ownerPosition) { setError('Lengkapi semua field yang wajib diisi'); return } setError(''); setStep(2) }} className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                Lanjut →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Perusahaan <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.companyName} onChange={e => update('companyName', e.target.value)} placeholder="PT. Contoh Indonesia" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Industri</label>
                  <select value={form.industry} onChange={e => update('industry', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white">
                    <option value="">Pilih industri</option>
                    {INDUSTRY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Jumlah Karyawan</label>
                  <select value={form.employeeCountRange} onChange={e => update('employeeCountRange', e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white">
                    {EMPLOYEE_COUNT_OPTIONS.map(o => <option key={o} value={o}>{o} orang</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Alamat Perusahaan</label>
                  <input type="text" value={form.address} onChange={e => update('address', e.target.value)} placeholder="Jl. Contoh No. 1, Jakarta" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">← Kembali</button>
                <button type="submit" disabled={isLoading || !form.companyName} className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white py-3 rounded-xl font-semibold text-sm transition-colors">{isLoading ? 'Mengirim...' : 'Kirim Pendaftaran'}</button>
              </div>
            </>
          )}

          <p className="text-center text-xs text-gray-400 pt-2">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-teal-600 hover:underline font-medium">Masuk</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
