import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { stepId, action, notes, requestId } = await req.json()

    if (!action || !['approve', 'reject', 'forward'].includes(action)) {
      return NextResponse.json({ error: 'Parameter tidak valid' }, { status: 400 })
    }

    const serverClient = await createClient()
    const { data: { user }, error: authError } = await serverClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 })
    }

    const admin = createAdminClient()

    const { data: myProfile, error: profileErr } = await admin
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (profileErr || !myProfile) {
      return NextResponse.json({ error: 'Profil tidak ditemukan' }, { status: 403 })
    }

    const canActAsAdmin = myProfile.role?.toString() === 'admin' || myProfile.role?.toString() === 'hr'

    // === FORWARD: admin meneruskan manual ke step berikutnya (misal ke Direktur) ===
    if (action === 'forward') {
      if (!requestId) {
        return NextResponse.json({ error: 'requestId diperlukan untuk forward' }, { status: 400 })
      }
      if (!canActAsAdmin) {
        return NextResponse.json({ error: 'Hanya admin yang bisa meneruskan permohonan' }, { status: 403 })
      }

      const { data: waitingStep, error: wsErr } = await admin
        .from('leave_approval_steps')
        .select('*')
        .eq('leave_request_id', requestId)
        .eq('status', 'waiting')
        .order('level', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (wsErr || !waitingStep) {
        return NextResponse.json({ error: 'Tidak ada step yang menunggu untuk diteruskan' }, { status: 400 })
      }

      await admin
        .from('leave_approval_steps')
        .update({ status: 'pending' })
        .eq('id', waitingStep.id)

      return NextResponse.json({ success: true })
    }

    // === APPROVE / REJECT ===
    if (!stepId) {
      return NextResponse.json({ error: 'stepId diperlukan' }, { status: 400 })
    }

    const { data: step, error: stepErr } = await admin
      .from('leave_approval_steps')
      .select('*')
      .eq('id', stepId)
      .single()

    if (stepErr || !step) {
      return NextResponse.json({ error: 'Step tidak ditemukan' }, { status: 404 })
    }

    if (step.status !== 'pending') {
      return NextResponse.json({ error: 'Step ini sudah diproses' }, { status: 400 })
    }

    const isAuthorized = step.approver_user_id === user.id || canActAsAdmin
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Tidak memiliki izin untuk aksi ini' }, { status: 403 })
    }

    if (action === 'reject') {
      await admin
        .from('leave_approval_steps')
        .update({ status: 'rejected', notes: notes ?? null, acted_at: new Date().toISOString() })
        .eq('id', stepId)

      await admin
        .from('leave_requests')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes ?? null,
        })
        .eq('id', step.leave_request_id)

      return NextResponse.json({ success: true })
    }

    // action === 'approve'
    await admin
      .from('leave_approval_steps')
      .update({ status: 'approved', notes: notes ?? null, acted_at: new Date().toISOString() })
      .eq('id', stepId)

    // Cek step waiting yang tersisa
    const { data: waitingSteps } = await admin
      .from('leave_approval_steps')
      .select('id, level, role_label')
      .eq('leave_request_id', step.leave_request_id)
      .eq('status', 'waiting')
      .order('level', { ascending: true })

    if (waitingSteps && waitingSteps.length > 0) {
      // Step berikutnya perlu diteruskan oleh admin/HR manual
      // Frontend akan tampilkan tombol "Teruskan ke [role]"
      return NextResponse.json({ success: true, requiresAdminForward: true, nextRole: waitingSteps[0].role_label })
    }

    // Tidak ada step waiting — finalisasi approved
    await admin
      .from('leave_requests')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: notes ?? null,
      })
      .eq('id', step.leave_request_id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[leave-action]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
