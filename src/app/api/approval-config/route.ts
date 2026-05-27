import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function getAuthorizedUser() {
  const serverClient = await createClient()
  const { data: { user }, error } = await serverClient.auth.getUser()
  if (error || !user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, org_id')
    .eq('id', user.id)
    .single()

  if (!profile) return null
  if (!['admin', 'hr'].includes(profile.role)) return null
  return profile as { id: string; role: string; org_id: string }
}

export async function POST(req: NextRequest) {
  try {
    const profile = await getAuthorizedUser()
    if (!profile) {
      return NextResponse.json({ error: 'Tidak memiliki izin' }, { status: 403 })
    }

    const body = await req.json()
    const { division, level, role_label, approver_user_id, org_id, position } = body

    if (!division || !level || !role_label) {
      return NextResponse.json({ error: 'Field wajib tidak lengkap' }, { status: 400 })
    }

    // Only allow configuring own org
    const targetOrgId = org_id ?? profile.org_id
    if (targetOrgId !== profile.org_id) {
      return NextResponse.json({ error: 'Tidak memiliki izin untuk org ini' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('leave_approval_flows')
      .upsert(
        {
          org_id: targetOrgId,
          division,
          position: position ?? '',
          level,
          role_label,
          approver_user_id: approver_user_id || null,
          is_active: true,
        },
        { onConflict: 'org_id,division,position,level' }
      )
      .select()
      .single()

    if (error) {
      console.error('[approval-config POST]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[approval-config POST]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const profile = await getAuthorizedUser()
    if (!profile) {
      return NextResponse.json({ error: 'Tidak memiliki izin' }, { status: 403 })
    }

    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify the flow belongs to the user's org before deleting
    const { data: flow } = await admin
      .from('leave_approval_flows')
      .select('org_id')
      .eq('id', id)
      .single()

    if (!flow || flow.org_id !== profile.org_id) {
      return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
    }

    const { error } = await admin
      .from('leave_approval_flows')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[approval-config DELETE]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[approval-config DELETE]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
