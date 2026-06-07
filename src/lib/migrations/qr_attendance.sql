-- QR Admin Check-in: token table + attendance method tracking

-- 1. Add method column to attendances
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS method TEXT DEFAULT 'face';
-- Values: 'face' (normal face-scanning attendance), 'qr_admin' (admin-generated QR)

-- 2. Create qr_tokens table
CREATE TABLE IF NOT EXISTS qr_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token UUID NOT NULL DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL REFERENCES profiles(id),
  shift_id UUID REFERENCES shifts(id),
  office_location_id UUID REFERENCES office_locations(id),
  type TEXT NOT NULL DEFAULT 'checkin',
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  attendance_id UUID REFERENCES attendances(id),
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Index for fast token lookup (only active tokens)
CREATE INDEX IF NOT EXISTS idx_qr_tokens_token ON qr_tokens(token) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_qr_tokens_org_created ON qr_tokens(org_id, created_at DESC);

-- 4. Enable RLS
ALTER TABLE qr_tokens ENABLE ROW LEVEL SECURITY;

-- 5. RLS policy: admin can select tokens in their org
CREATE POLICY "qr_tokens_admin_select" ON qr_tokens
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );

-- 6. RLS policy: admin can insert tokens
CREATE POLICY "qr_tokens_admin_insert" ON qr_tokens
  FOR INSERT WITH CHECK (
    generated_by = auth.uid()
  );

-- 7. RLS policy: admin can update tokens in their org
CREATE POLICY "qr_tokens_admin_update" ON qr_tokens
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  );
