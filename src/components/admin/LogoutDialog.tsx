'use client'

interface Props {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export default function LogoutDialog({ open, onConfirm, onCancel, isLoading }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🚪</span>
        </div>

        <h2 className="text-lg font-bold text-gray-900 text-center">Konfirmasi Keluar</h2>
        <p className="text-sm text-gray-500 text-center mt-1.5">
          Apakah Anda yakin ingin keluar dari akun ini?
        </p>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {isLoading ? 'Keluar...' : 'Ya, Keluar'}
          </button>
        </div>
      </div>
    </div>
  )
}
