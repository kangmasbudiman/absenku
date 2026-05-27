'use client'

import { useEffect } from 'react'

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="text-center">
        <p className="text-4xl mb-4">⚠️</p>
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Terjadi kesalahan</h2>
        <p className="text-sm text-gray-500 mb-4">{error.message}</p>
        <button onClick={reset}
          className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700">
          Coba Lagi
        </button>
      </div>
    </div>
  )
}
