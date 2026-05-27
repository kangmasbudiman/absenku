'use client'

import { stopInspect } from '@/app/actions/inspect'

export default function InspectBanner({ orgName }: { orgName: string }) {
  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm shrink-0 z-30">
      <div className="flex items-center gap-2">
        <span>🔍</span>
        <span className="font-semibold">Mode Inspect (Read-Only):</span>
        <span>{orgName}</span>
      </div>
      <form action={stopInspect}>
        <button
          type="submit"
          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors"
        >
          ✕ Keluar dari Inspect
        </button>
      </form>
    </div>
  )
}
