'use client'

import Link from 'next/link'

interface Stat {
  label: string
  value: number
  sub: string
  icon: string
  bg: string
  shadow: string
}

interface Props {
  stats: Stat[]
  totalDepartments: number
  totalShifts: number
}

function HoverCard({ className, shadow, children, href }: { className: string; shadow: string; children: React.ReactNode; href?: string }) {
  const props = {
    className,
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.boxShadow = `0 8px 30px ${shadow}`),
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.boxShadow = ''),
  }
  if (href) return <Link href={href} {...props}>{children}</Link>
  return <div {...props}>{children}</div>
}

export default function StatCards({ stats, totalDepartments, totalShifts }: Props) {
  return (
    <>
      {/* Departemen & Shift */}
      <div className="grid grid-cols-2 gap-4">
        <HoverCard href="/dashboard/departments" shadow="rgba(20,184,166,0.35)"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:-translate-y-1 transition-all duration-200">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-2xl shadow-md shrink-0">🏗️</div>
          <div>
            <p className="text-3xl font-bold text-gray-800">{totalDepartments}</p>
            <p className="text-sm font-medium text-gray-600">Departemen</p>
            <p className="text-xs text-teal-500 mt-0.5 font-medium">Kelola departemen →</p>
          </div>
        </HoverCard>
        <HoverCard href="/dashboard/shifts" shadow="rgba(99,102,241,0.35)"
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:-translate-y-1 transition-all duration-200">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-2xl shadow-md shrink-0">🕐</div>
          <div>
            <p className="text-3xl font-bold text-gray-800">{totalShifts}</p>
            <p className="text-sm font-medium text-gray-600">Shift Kerja</p>
            <p className="text-xs text-indigo-500 mt-0.5 font-medium">Kelola shift →</p>
          </div>
        </HoverCard>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map(s => (
          <HoverCard key={s.label} shadow={s.shadow}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:-translate-y-1 transition-all duration-200 cursor-default">
            <div className={`bg-gradient-to-br ${s.bg} p-4 flex items-center justify-between`}>
              <span className="text-3xl">{s.icon}</span>
              <p className="text-3xl font-bold text-white">{s.value}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm font-semibold text-gray-700">{s.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          </HoverCard>
        ))}
      </div>
    </>
  )
}
