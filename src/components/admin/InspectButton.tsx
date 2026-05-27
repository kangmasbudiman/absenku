'use client'

import { startInspect } from '@/app/actions/inspect'

export default function InspectButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  const action = startInspect.bind(null, orgId, orgName)
  return (
    <form action={action}>
      <button
        type="submit"
        className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
      >
        🔍 Inspect
      </button>
    </form>
  )
}
