import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json()
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Look up profile by username using admin client (bypasses RLS)
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.trim())
      .maybeSingle()

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Username tidak ditemukan' }, { status: 404 })
    }

    // Get the auth email for this profile
    const { data: rpcData, error: rpcErr } = await supabase
      .rpc('get_email_by_profile_id', { p_profile_id: profile.id })

    if (rpcErr || !rpcData) {
      return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ email: rpcData })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
