'use client'

import { useEffect, useRef } from 'react'

interface Props {
  items: { id: string; content: string }[]
}

export default function RunningText({ items }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)

  if (!items || items.length === 0) return null

  const text = items.map(i => i.content).join('   •   ')

  return (
    <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-xl overflow-hidden flex items-center shadow-sm">
      {/* Label */}
      <div className="shrink-0 flex items-center gap-2 bg-teal-700 px-4 py-2.5 z-10">
        <span className="text-sm">📢</span>
        <span className="text-xs font-bold text-white uppercase tracking-widest whitespace-nowrap">
          Pengumuman
        </span>
      </div>

      {/* Track */}
      <div className="flex-1 overflow-hidden relative">
        {/* Fade kiri */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-teal-600 to-transparent z-10 pointer-events-none" />
        {/* Fade kanan */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-teal-500 to-transparent z-10 pointer-events-none" />

        <div
          ref={trackRef}
          className="flex whitespace-nowrap py-2.5 animate-marquee"
        >
          <span className="text-sm text-white/95 px-6">{text}</span>
          {/* Duplikat untuk loop seamless */}
          <span className="text-sm text-white/95 px-6" aria-hidden>{text}</span>
        </div>
      </div>
    </div>
  )
}
