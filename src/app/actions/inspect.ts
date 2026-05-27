'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function startInspect(orgId: string, orgName: string) {
  const jar = await cookies()
  jar.set('inspect_org_id', orgId, { path: '/', httpOnly: true })
  jar.set('inspect_org_name', orgName, { path: '/', httpOnly: true })
  redirect('/dashboard')
}

export async function stopInspect() {
  const jar = await cookies()
  jar.delete('inspect_org_id')
  jar.delete('inspect_org_name')
  redirect('/dashboard')
}
