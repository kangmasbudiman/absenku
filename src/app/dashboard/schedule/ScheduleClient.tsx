'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Employee {
  id: string
  full_name: string
  employee_id?: string
  department_id?: string
  departments?: { name: string } | null
}

interface Shift {
  id: string
  name: string
  start_time: string
  end_time: string
}

interface Department {
  id: string
  name: string
}

interface Props {
  employees: Employee[]
  shifts: Shift[]
  departments: Department[]
  currentShiftMap: Record<string, string[]>
  isDeptHead: boolean
  orgId: string
}

export default function ScheduleClient({ employees, shifts, departments, currentShiftMap, isDeptHead, orgId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [filterDept, setFilterDept] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [localShiftMap, setLocalShiftMap] = useState<Record<string, string[]>>(currentShiftMap)
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10))

  const filtered = employees.filter(e => !filterDept || e.department_id === filterDept)

  const toggleShift = async (employeeId: string, shiftId: string) => {
    const savingKey = `${employeeId}_${shiftId}`
    setSaving(savingKey)
    setErrors(prev => ({ ...prev, [employeeId]: '' }))

    const currentShifts = localShiftMap[employeeId] ?? []
    const isActive = currentShifts.includes(shiftId)

    if (isActive) {
      // Nonaktifkan shift ini saja
      const { error } = await supabase
        .from('employee_shifts')
        .update({ is_active: false })
        .eq('user_id', employeeId)
        .eq('shift_id', shiftId)
        .eq('is_active', true)

      if (error) {
        setErrors(prev => ({ ...prev, [employeeId]: error.message }))
      } else {
        setLocalShiftMap(prev => ({
          ...prev,
          [employeeId]: currentShifts.filter(id => id !== shiftId),
        }))
      }
    } else {
      // Tambah shift baru tanpa menonaktifkan yang lain
      const { error } = await supabase.from('employee_shifts').insert({
        user_id: employeeId,
        shift_id: shiftId,
        effective_date: effectiveDate,
        is_active: true,
      })

      if (error) {
        setErrors(prev => ({ ...prev, [employeeId]: error.message }))
      } else {
        setLocalShiftMap(prev => ({
          ...prev,
          [employeeId]: [...currentShifts, shiftId],
        }))
      }
    }

    setSaving(null)
    router.refresh()
  }

  const assignedCount = (empId: string) => (localShiftMap[empId] ?? []).length

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Jadwal Shift</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isDeptHead ? 'Kelola shift karyawan di departemen Anda' : 'Kelola shift seluruh karyawan'}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 font-medium">Berlaku mulai:</span>
          <input
            type="date"
            value={effectiveDate}
            onChange={e => setEffectiveDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
        {!isDeptHead && departments.length > 0 && (
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
            <option value="">Semua Departemen</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
        <p className="text-xs text-gray-400 ml-auto">Klik shift untuk assign/unassign — bisa lebih dari satu shift per karyawan</p>
      </div>

      {shifts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <p className="text-3xl mb-3">🕐</p>
          <p className="text-gray-500 font-medium">Belum ada shift</p>
          <p className="text-gray-400 text-sm mt-1">Buat shift terlebih dahulu di menu Shift</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <p className="text-3xl mb-3">👥</p>
          <p className="text-gray-500 font-medium">Belum ada karyawan</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="sticky left-0 bg-gray-50 z-10 text-left text-xs font-semibold text-gray-500 px-5 py-4 uppercase tracking-wider min-w-52">
                    Karyawan
                  </th>
                  {!isDeptHead && (
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-4 uppercase tracking-wider min-w-36">
                      Departemen
                    </th>
                  )}
                  {shifts.map(shift => (
                    <th key={shift.id} className="text-center text-xs font-semibold text-gray-500 px-4 py-4 uppercase tracking-wider min-w-32">
                      <div>{shift.name}</div>
                      <div className="text-gray-400 font-normal normal-case mt-0.5">
                        {shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)}
                      </div>
                    </th>
                  ))}
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-4 uppercase tracking-wider min-w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(emp => {
                  const activeShiftIds = localShiftMap[emp.id] ?? []
                  const errMsg = errors[emp.id]

                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="sticky left-0 bg-white px-5 py-3.5 border-r border-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 font-bold text-sm shrink-0">
                            {emp.full_name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-800">{emp.full_name}</p>
                            {errMsg ? (
                              <p className="text-xs text-red-500">{errMsg}</p>
                            ) : (
                              <p className="text-xs text-gray-400">{emp.employee_id ?? 'No ID'}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {!isDeptHead && (
                        <td className="px-4 py-3.5 text-sm text-gray-500">
                          {(emp.departments as { name: string } | null)?.name ?? '-'}
                        </td>
                      )}

                      {shifts.map(shift => {
                        const isActive = activeShiftIds.includes(shift.id)
                        const isSaving = saving === `${emp.id}_${shift.id}`
                        return (
                          <td key={shift.id} className="px-4 py-3.5 text-center">
                            <button
                              onClick={() => toggleShift(emp.id, shift.id)}
                              disabled={!!saving}
                              title={isActive ? 'Klik untuk hapus shift ini' : `Assign ${shift.name}`}
                              className={`w-10 h-10 rounded-xl mx-auto flex items-center justify-center transition-all duration-150 font-bold text-sm
                                ${isActive
                                  ? 'bg-teal-500 text-white shadow-md shadow-teal-200 scale-105'
                                  : 'bg-gray-50 border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50 hover:scale-105 text-transparent hover:text-teal-300'
                                }
                                ${isSaving ? 'opacity-40 cursor-wait' : 'cursor-pointer'}
                              `}
                            >
                              {isSaving ? '⟳' : '✓'}
                            </button>
                          </td>
                        )
                      })}

                      <td className="px-3 py-3.5 text-center">
                        {activeShiftIds.length > 0 && !saving && (
                          <span className="text-xs text-teal-600 font-semibold bg-teal-50 px-2 py-0.5 rounded-full">
                            {activeShiftIds.length} shift
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer legend */}
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50 flex items-center gap-5">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-4 h-4 rounded-lg bg-teal-500" />
              Shift aktif
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-4 h-4 rounded-lg border-2 border-gray-200 bg-gray-50" />
              Klik untuk assign
            </div>
            <span className="text-xs text-gray-400 ml-auto">
              {employees.filter(e => (localShiftMap[e.id]?.length ?? 0) > 0).length} dari {employees.length} karyawan sudah diassign
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
