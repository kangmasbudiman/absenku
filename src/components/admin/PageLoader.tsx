'use client'

export default function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-6">
        {/* Orbital spinner */}
        <div className="relative w-20 h-20">
          {/* Orbit ring 1 — outer, clockwise */}
          <div className="absolute inset-0 rounded-full border-[3px] border-teal-200/30" />
          <div
            className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-teal-500 animate-[spin_1.2s_linear_infinite]"
          />

          {/* Orbit ring 2 — middle, counter-clockwise */}
          <div className="absolute inset-[6px] rounded-full border-[3px] border-teal-200/20" />
          <div
            className="absolute inset-[6px] rounded-full border-[3px] border-transparent border-b-teal-400 animate-[spin_1.8s_linear_infinite_reverse]"
          />

          {/* Orbit ring 3 — inner, clockwise fast */}
          <div
            className="absolute inset-[12px] rounded-full border-[2px] border-transparent border-t-teal-300 animate-[spin_0.8s_linear_infinite]"
          />

          {/* Center logo — pulsing */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center animate-[pulse_2s_ease-in-out_infinite] shadow-lg shadow-teal-500/30">
              <span className="text-white text-sm font-bold">A</span>
            </div>
          </div>
        </div>

        {/* Dots loading text */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-400">Memuat</span>
          <span className="text-teal-500 animate-[bounce_1.4s_ease-in-out_infinite]">.</span>
          <span className="text-teal-500 animate-[bounce_1.4s_ease-in-out_0.2s_infinite]">.</span>
          <span className="text-teal-500 animate-[bounce_1.4s_ease-in-out_0.4s_infinite]">.</span>
        </div>
      </div>
    </div>
  )
}
