'use client'

import dynamic from 'next/dynamic'

const AttendanceRealtime = dynamic(() => import('./AttendanceRealtime'), { ssr: false })

interface Props {
  orgId: string
  employeeIds: string[]
}

export default function AttendanceRealtimeWrapper({ orgId, employeeIds }: Props) {
  return <AttendanceRealtime orgId={orgId} employeeIds={employeeIds} />
}
